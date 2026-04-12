import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { categories } from './data.js';
import { authenticateUser, registerUser, updateUserProfile, getOrganizations, getSubOrganizations, submitInterest, cancelInterest, getProducts, mapOrigamiProduct, getCategories, mapOrigamiCategory, getSubCategories, createProduct, getProductsBySeller, getInterestedProductsByUserId, toggleProductLike, getLikedProductsByUserId, uploadFileToOrigami, getLocations, getQuestionsForProduct, createQuestion, answerQuestion, deleteQuestion, updateProductStatus, getProductInterests } from './origami.js';
import multer from 'multer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.post('/api/user/update', async (req, res) => {
    try {
        const { userId, data } = req.body;
        if (!userId || !data) {
            return res.status(400).json({ error: 'User ID and data are required' });
        }
        const result = await updateUserProfile(userId, data);
        res.json(result);
    } catch (error: any) {
        console.error('Update user profile error:', error);
        res.status(500).json({ error: error.message || 'Internal server error updating user profile' });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const rawProducts = await getProducts();
        const mappedProducts = rawProducts.map(mapOrigamiProduct);

        const { category, q } = req.query;
        let filtered = [...mappedProducts];

        if (category && category !== 'all') {
            filtered = filtered.filter(p => p.category === category);
        }

        if (q && typeof q === 'string') {
            const query = q.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.description.toLowerCase().includes(query)
            );
        }

        res.json(filtered);
    } catch (error: any) {
        console.error('Fetch products error:', error);
        res.status(500).json({ error: error.message || 'Internal server error fetching products' });
    }
});

app.post('/api/products/posted', async (req, res) => {
    try {
        const userId = req.body.userId || req.body.id;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        const rawProducts = await getProductsBySeller(userId);
        const mappedProducts = rawProducts.map(mapOrigamiProduct);
        res.json(mappedProducts);
    } catch (error: any) {
        console.error('Fetch posted products error:', error);
        res.status(500).json({ error: error.message || 'Internal server error fetching posted products' });
    }
});

app.post('/api/products/interested', async (req, res) => {
    try {
        const userId = req.body.userId || req.body.id;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        const rawProducts = await getInterestedProductsByUserId(userId);
        const mappedProducts = rawProducts.map(mapOrigamiProduct);
        res.json(mappedProducts);
    } catch (error: any) {
        console.error('Fetch interested products error:', error);
        res.status(500).json({ error: error.message || 'Internal server error fetching interested products' });
    }
});

app.post('/api/products/like', async (req, res) => {
    try {
        const { userId, productId, isLiked, fld_3138, fld_3139, fld_3140 } = req.body;
        const targetUserId = fld_3140 || userId;
        const targetProductId = fld_3139 || productId;

        if (!targetUserId || !targetProductId) {
            return res.status(400).json({ error: 'User ID and Product ID are required' });
        }
        // Also support isLiked if client still sends it momentarily
        const targetState = fld_3138 !== undefined ? fld_3138 : isLiked;
        const result = await toggleProductLike(targetUserId, targetProductId, targetState);
        res.json(result);
    } catch (error: any) {
        console.error('Toggle like error:', error);
        res.status(500).json({ error: error.message || 'Internal server error toggling product like' });
    }
});

app.post('/api/products/loved', async (req, res) => {
    try {
        const targetUserId = req.body.fld_3140 || req.body.userId || req.body.id;
        if (!targetUserId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        const rawProducts = await getLikedProductsByUserId(targetUserId);
        const mappedProducts = rawProducts.map(mapOrigamiProduct);
        res.json(mappedProducts);
    } catch (error: any) {
        console.error('Fetch loved products error:', error);
        res.status(500).json({ error: error.message || 'Internal server error fetching loved products' });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const rawCategories = await getCategories();
        const mappedCategories = rawCategories.map(mapOrigamiCategory);

        // Add "All" category if it's missing and expected by the UI
        if (!mappedCategories.find((c: any) => c.id === 'all')) {
            mappedCategories.unshift({ id: 'all', name: 'הכל', icon: 'LayoutGrid' });
        }

        res.json(mappedCategories);
    } catch (error: any) {
        console.error('Fetch categories error:', error);
        // Fallback to mock data if Origami fails, so the UI doesn't break
        res.json(categories);
    }
});

app.get('/api/categories/:categoryId/subcategories', async (req, res) => {
    try {
        const { categoryId } = req.params;
        const subCategories = await getSubCategories(categoryId);
        res.json(subCategories);
    } catch (error: any) {
        console.error('Fetch sub-categories error:', error);
        res.json([]);
    }
});

app.get('/api/locations', async (req, res) => {
    try {
        const locations = await getLocations();
        res.json(locations);
    } catch (error: any) {
        console.error('Fetch locations error:', error);
        res.json([]);
    }
});

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from the Be2Win Server!' });
});

app.get('/api/organizations', async (req, res) => {
    try {
        const orgs = await getOrganizations();
        res.json(orgs);
    } catch (error: any) {
        console.error('Fetch organizations error:', error);
        res.status(500).json({ error: error.message || 'Internal server error fetching organizations' });
    }
});

app.get('/api/organizations/:orgId/suborganizations', async (req, res) => {
    try {
        const { orgId } = req.params;
        const subOrgs = await getSubOrganizations(orgId);
        res.json(subOrgs);
    } catch (error: any) {
        console.error('Fetch sub-organizations error:', error);
        res.status(500).json({ error: error.message || 'Internal server error fetching sub-organizations' });
    }
});

app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        return res.json([]);
    }
    const query = q.toLowerCase();

    try {
        const rawProducts = await getProducts();
        const mappedProducts = rawProducts.map(mapOrigamiProduct);
        const suggestions = mappedProducts
            .filter((p: any) => p.name.toLowerCase().includes(query))
            .map((p: any) => ({ id: p.id, name: p.name, category: p.category }))
            .slice(0, 5);
        res.json(suggestions);
    } catch (error: any) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message || 'Internal server error during search' });
    }
});

app.patch('/api/interest', async (req, res) => {
    const { transactionId, userId } = req.body;

    if (!transactionId || !userId) {
        return res.status(400).json({ error: 'Transaction ID and User ID are required' });
    }

    try {
        const result = await cancelInterest(transactionId, userId);
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

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await uploadFileToOrigami(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
        );

        res.json(result);
    } catch (error: any) {
        console.error('File upload error:', error);
        res.status(500).json({ error: error.message || 'Internal server error during file upload' });
    }
});

app.post('/api/products', async (req, res) => {
    const { productData, userData } = req.body;

    if (!productData || !userData) {
        return res.status(400).json({ error: 'Product data and user data are required' });
    }

    try {
        const result = await createProduct(productData, userData);
        res.json(result);
    } catch (error: any) {
        console.error('Create product error:', error);
        res.status(500).json({ error: error.message || 'Internal server error during product creation' });
    }
});

// ==================== Q&A Routes ====================

app.get('/api/products/:id/questions', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Product ID is required' });
        }
        const questions = await getQuestionsForProduct(id);
        res.json(questions);
    } catch (error: any) {
        console.error('Fetch questions error:', error);
        res.status(500).json({ error: error.message || 'Internal server error fetching questions' });
    }
});

app.post('/api/products/:id/questions', async (req, res) => {
    try {
        const { id } = req.params;
        const { question, askerId, askerName } = req.body;

        if (!id || !question || !askerId) {
            return res.status(400).json({ error: 'Product ID, question, and askerId are required' });
        }

        const result = await createQuestion(id, question, askerId, askerName || '');
        res.json(result);
    } catch (error: any) {
        console.error('Create question error:', error);
        res.status(500).json({ error: error.message || 'Internal server error creating question' });
    }
});

app.patch('/api/questions/:qaId/answer', async (req, res) => {
    try {
        const { qaId } = req.params;
        const { answer, answererId, answererName } = req.body;

        if (!qaId || !answer || !answererId) {
            return res.status(400).json({ error: 'Q&A ID, answer, and answererId are required' });
        }

        const result = await answerQuestion(qaId, answer, answererId, answererName || '');
        res.json(result);
    } catch (error: any) {
        console.error('Answer question error:', error);
        res.status(500).json({ error: error.message || 'Internal server error answering question' });
    }
});

app.delete('/api/questions/:qaId', async (req, res) => {
    try {
        const { qaId } = req.params;
        if (!qaId) {
            return res.status(400).json({ error: 'Q&A ID is required' });
        }
        const result = await deleteQuestion(qaId);
        res.json(result);
    } catch (error: any) {
        console.error('Delete question error:', error);
        res.status(500).json({ error: error.message || 'Internal server error deleting question' });
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

app.patch('/api/products/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!id || !status) {
            return res.status(400).json({ error: 'Product ID and status are required' });
        }
        const result = await updateProductStatus(id, status);
        res.json(result);
    } catch (error: any) {
        console.error('Update product status error:', error);
        res.status(500).json({ error: error.message || 'Internal server error updating product status' });
    }
});

app.get('/api/products/:id/interests', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Product ID is required' });
        }
        const interests = await getProductInterests(id);
        res.json(interests);
    } catch (error: any) {
        console.error('Fetch product interests error:', error);
        res.status(500).json({ error: error.message || 'Internal server error fetching product interests' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
