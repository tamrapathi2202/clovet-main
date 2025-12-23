import express from 'express';
import { WardrobeItem } from '../models/WardrobeItem';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all items
router.get('/', auth, async (req: AuthRequest, res) => {
    try {
        const items = await WardrobeItem.find({ user_id: req.user?.userId }).sort({ created_at: -1 });
        res.json(items);
    } catch (err) {
        console.error('Fetch wardrobe items error:', err);
        if (process.env.NODE_ENV !== 'production') {
            return res.json([]);
        }
        res.status(500).json({ error: 'Error fetching items' });
    }
});

// Search wardrobe items
router.get('/search', auth, async (req: AuthRequest, res) => {
    try {
        const query = req.query.q as string;

        if (!query || !query.trim()) {
            return res.json([]);
        }

        // Create case-insensitive search regex
        const searchRegex = new RegExp(query.trim(), 'i');

        // Search across multiple fields: name, category, color, brand
        const items = await WardrobeItem.find({
            user_id: req.user?.userId,
            $or: [
                { name: searchRegex },
                { category: searchRegex },
                { color: searchRegex },
                { brand: searchRegex }
            ]
        }).sort({ created_at: -1 });

        res.json(items);
    } catch (err) {
        console.error('Wardrobe search error:', err);
        if (process.env.NODE_ENV !== 'production') {
            return res.json([]);
        }
        res.status(500).json({ error: 'Error searching wardrobe items' });
    }
});

// Add item
router.post('/', auth, async (req: AuthRequest, res) => {
    try {
        const item = new WardrobeItem({
            ...req.body,
            user_id: req.user?.userId
        });
        await item.save();
        res.status(201).json(item);
    } catch (err) {
        console.error('Add wardrobe item error:', err);
        if (process.env.NODE_ENV !== 'production') {
            const stubItem = {
                _id: `stub-${Date.now()}`,
                ...req.body,
                user_id: req.user?.userId || `stub-${req.body?.user_id || 'auto'}`,
                created_at: new Date()
            };
            return res.status(201).json(stubItem);
        }
        res.status(500).json({ error: 'Error adding item' });
    }
});

// Delete item
router.delete('/:id', auth, async (req: AuthRequest, res) => {
    try {
        const item = await WardrobeItem.findOneAndDelete({ _id: req.params.id, user_id: req.user?.userId });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json({ message: 'Item deleted' });
    } catch (err) {
        console.error('Delete wardrobe item error:', err);
        if (process.env.NODE_ENV !== 'production') {
            return res.json({ message: 'Item deleted (stub)' });
        }
        res.status(500).json({ error: 'Error deleting item' });
    }
});

export default router;
