import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import session from "express-session";
import { runCrawler } from "../dist/main.js";
import NodeCache from "node-cache";
import { EventEmitter } from "events";

const PORT = 3000;
const app = express();
app.use(cors());

const cache = new NodeCache({ stdTTL: 3600 });

// Session middleware
app.use(
  session({
    secret: "123", // Use a strong secret in production
    resave: false,
    saveUninitialized: true,
  })
);

app.use(bodyParser.json());

// Endpoint for starting the search
app.get("/search", async (req, res) => {
  const { userInput } = req.query;
  const TuserInput = userInput.toLocaleLowerCase();

  if (!userInput) {
    return res.status(400).json({ error: "User input is required" });
  }

  if (!req.session.results) {
    req.session.results = [];
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const cachedResults = cache.get(TuserInput);
  if (cachedResults) {
    // Return cached results via SSE
    res.write(`data: {"message": "Returning cached results"}\n\n`);
    cachedResults.forEach((result) => {
      const eventData = JSON.stringify(result);
      req.session.results.push(result);
      res.write(`data: ${eventData}\n\n`);
    });

    res.write(`data: {"done": true}\n\n`); // Indicate completion
    return res.end(); // End response
  }

  // Send an initial message
  res.write(
    `data: {"message": "Search started, results will be sent in real time."}\n\n`
  );

  try {
    const eventEmitter = new EventEmitter();

    // Listen for results from the crawler
    eventEmitter.on("newResult", (result) => {
      const eventData = JSON.stringify(result);
      req.session.results.push(result);
      const currentCached = cache.get(TuserInput) || [];
      cache.set(TuserInput, [...currentCached, result]);
      res.write(`data: ${eventData}\n\n`);
    });

    eventEmitter.on("done", () => {
      res.write(`data: {"done": true}\n\n`); // Send "done" message to indicate completion
      res.end(); // End the response when done
    });

    // Run the crawler, passing the session ID for real-time updates
    await runCrawler(TuserInput, req.session, eventEmitter);
  } catch (error) {
    console.error("Error running crawler:", error);
    res.write(`data: {"error": "Failed to run crawler"}\n\n`);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
