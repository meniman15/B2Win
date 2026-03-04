import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { categories, products } from './data.js';
import { authenticateUser, registerUser, submitInterest, cancelInterest } from './origami.js';

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

app.patch('/api/interest', async (req, res) => {
    const { transactionId } = req.body;

    if (!transactionId) {
        return res.status(400).json({ error: 'Transaction ID is required' });
    }

    try {
        const result = await cancelInterest(transactionId);
        res.json(result);
    } catch (error: any) {
        console.error('Interest cancellation error:', error);
        res.status(500).json({ error: error.message || 'Internal server error during interest cancellation' });
    }
});

app.post('/api/interest', async (req, res) => {
    const { userData, transactionId, quantity } = req.body;

    if (!userData || !transactionId || !quantity) {
        return res.status(400).json({ error: 'User data, transaction ID, and quantity are required' });
    }
    console.log('userData', userData);
    console.log('transactionId', transactionId);
    console.log('quantity', quantity);
    try {
        const result = await submitInterest(userData, transactionId, quantity);
        res.json(result);
    } catch (error: any) {
        console.error('Interest submission error:', error);
        res.status(500).json({ error: error.message || 'Internal server error during interest submission' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { userData } = req.body;

    if (!userData) {
        return res.status(400).json({ error: 'User data is required' });
    }

    try {
        const result = await registerUser(userData);
        res.json(result);
    } catch (error: any) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message || 'Internal server error during registration' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { fullName, phone } = req.body;

    if (!fullName || !phone) {
        return res.status(400).json({ error: 'Full name and phone are required' });
    }

    try {
        const user = await authenticateUser(fullName, phone);
        if (user) {
            res.json(user);
        } else {
            res.status(401).json({ error: 'משתמש לא נמצא נסה שנית' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
