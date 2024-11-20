
import express from 'express';
import bodyParser from 'body-parser';
import { runCrawler } from '../dist/main.js';

const app = express();
const PORT = 3000;


app.use(bodyParser.json());

app.post('/search', async (req, res) => {
    const { userInput } = req.body;

    if (!userInput) {
        return res.status(400).json({ error: 'User input is required' });
    }

    try {
        const results = await runCrawler(userInput);

        res.json({ message: 'Crawling succeeded', searchResult: results });
    } catch (error) {
        console.error('Error running crawler:', error);
        res.status(500).json({ error: 'Failed to run crawler' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
