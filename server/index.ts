import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());

// Serve uploaded files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
}
console.log('Serving uploads from:', uploadsDir);

// Log upload requests for debugging
app.use('/uploads', (req, res, next) => {
    console.log('Upload request:', req.path);
    next();
});

app.use('/uploads', express.static(uploadsDir));

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clovet';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Routes (Placeholders for now)
app.get('/', (req, res) => {
    res.send('Clovet API is running');
});

import authRoutes from './routes/auth';
import wardrobeRoutes from './routes/wardrobe';
import uploadRoutes from './routes/upload';
import favoriteRoutes from './routes/favorites';
import detectClothingRoutes from './routes/detectClothing';
import virtualTryOnRoutes from './routes/virtualTryOn';

app.use('/api/auth', authRoutes);
app.use('/api/wardrobe', wardrobeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/detect-clothing', detectClothingRoutes);
app.use('/api/virtual-tryon', virtualTryOnRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
