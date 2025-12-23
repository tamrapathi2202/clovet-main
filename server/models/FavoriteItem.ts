import mongoose from 'mongoose';

const favoriteItemSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    item_name: { type: String, required: true },
    platform: { type: String, required: true },
    external_id: { type: String },
    image_url: { type: String, required: true },
    price: { type: Number },
    currency: { type: String },
    seller: { type: String },
    url: { type: String },
    metadata: { type: Map, of: String },
    created_at: { type: Date, default: Date.now }
});

export const FavoriteItem = mongoose.model('FavoriteItem', favoriteItemSchema);
