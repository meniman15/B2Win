import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { categories, products } from './data.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from the Be2Win Server!' });
});

app.get('/api/categories', (req, res) => {
    res.json(categories);
});

app.get('/api/products', (req, res) => {
    const { category, q } = req.query;
    let filtered = [...products];

    if (category) {
        filtered = filtered.filter(p => p.category === category);
    }

    if (q && typeof q === 'string') {
        const query = q.toLowerCase();
        filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
    }

    res.json(filtered);
});

app.get('/api/search', (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        return res.json([]);
    }
    const query = q.toLowerCase();
    const suggestions = products
        .filter(p => p.name.toLowerCase().includes(query))
        .map(p => ({ id: p.id, name: p.name, category: p.category }))
        .slice(0, 5);
    res.json(suggestions);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
