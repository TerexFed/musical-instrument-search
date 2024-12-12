import NodeCache from 'node-cache';
import express from 'express';
import bodyParser from 'body-parser';
import { runCrawler } from '../dist/main.js';

const app = express();
const PORT = 3000;


const cache = new NodeCache({ stdTTL: 3600 });

app.use(bodyParser.json());

app.post('/search', async (req, res) => {
    const { userInput } = req.body;

    const TuserInput = userInput.toLowerCase()

    if (!userInput) {
        return res.status(400).json({ error: 'User input is required' });
    }

    const cachedResult = cache.get(TuserInput);
    if (cachedResult) {
        console.log('Cache hit');
        return res.json({ cachedResult });
    }

    try {
        const results = await runCrawler(TuserInput);
        cache.set(TuserInput, results);

        res.json({ results });
    } catch (error) {
        console.error('Error running crawler:', error);
        res.status(500).json({ error: 'Failed to run crawler' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
