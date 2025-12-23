import express from 'express';
import { FavoriteItem } from '../models/FavoriteItem';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all favorites
router.get('/', auth, async (req: AuthRequest, res) => {
    try {
        const items = await FavoriteItem.find({ user_id: req.user?.userId }).sort({ created_at: -1 });
        res.json(items);
    } catch (err) {
        console.error('Fetch favorites error:', err);
        if (process.env.NODE_ENV !== 'production') {
            return res.json([]);
        }
        res.status(500).json({ error: 'Error fetching favorites' });
    }
});

// Add favorite
router.post('/', auth, async (req: AuthRequest, res) => {
    try {
        const { external_id, url, item_name, image_url } = req.body;

        // Check for duplicates
        const query: any = { user_id: req.user?.userId };
        if (external_id) {
            query.external_id = external_id;
        } else if (url) {
            query.url = url;
        } else {
            // Fallback to name + image check
            query.item_name = item_name;
            query.image_url = image_url;
        }

        const existing = await FavoriteItem.findOne(query);
        if (existing) {
            return res.status(200).json(existing);
        }

        const item = new FavoriteItem({
            ...req.body,
            user_id: req.user?.userId
        });
        await item.save();
        res.status(201).json(item);
    } catch (err) {
        console.error('Add favorite error:', err);
        if (process.env.NODE_ENV !== 'production') {
            const stub = {
                _id: `stub-${Date.now()}`,
                ...req.body,
                user_id: req.user?.userId || `stub-${req.body?.user_id || 'auto'}`,
                created_at: new Date()
            };
            return res.status(201).json(stub);
        }
        res.status(500).json({ error: 'Error adding favorite' });
    }
});

// Remove favorite
router.delete('/:externalId', auth, async (req: AuthRequest, res) => {
    try {
        const item = await FavoriteItem.findOneAndDelete({
            external_id: req.params.externalId,
            user_id: req.user?.userId
        });
        if (!item) {
            // Try finding by _id if external_id fails
            const itemById = await FavoriteItem.findOneAndDelete({
                _id: req.params.externalId,
                user_id: req.user?.userId
            });
            if (!itemById) {
                return res.status(404).json({ error: 'Favorite not found' });
            }
        }
        res.json({ message: 'Favorite removed' });
    } catch (err) {
        console.error('Remove favorite error:', err);
        if (process.env.NODE_ENV !== 'production') {
            return res.json({ message: 'Favorite removed (stub)' });
        }
        res.status(500).json({ error: 'Error removing favorite' });
    }
});

export default router;
