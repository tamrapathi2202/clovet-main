import mongoose from 'mongoose';

const wardrobeItemSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    color: { type: String },
    season: [{ type: String }],
    occasion: [{ type: String }],
    brand: { type: String },
    image_url: { type: String, required: true },
    source_url: { type: String },
    purchase_price: { type: Number },
    purchase_date: { type: Date },
    wear_count: { type: Number, default: 0 },
    ai_tags: { type: Map, of: String },
    created_at: { type: Date, default: Date.now }
});

export const WardrobeItem = mongoose.model('WardrobeItem', wardrobeItemSchema);
