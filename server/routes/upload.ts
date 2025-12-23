import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Ensure uploads directory exists
// Use __dirname to ensure consistency with server static file serving
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

router.post('/', auth, (req: AuthRequest, res) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size exceeds 10MB limit' });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        try {
            console.log('File uploaded to disk:', req.file.path);
            console.log('File details:', {
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype
            });

            // Return the URL relative to the server
            const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
            console.log('Generated file URL:', fileUrl);
            res.json({ url: fileUrl });
        } catch (error) {
            console.error('Error generating file URL:', error);
            res.status(500).json({ error: 'Failed to process uploaded file' });
        }
    });
});

export default router;
