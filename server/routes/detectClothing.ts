import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth, AuthRequest } from '../middleware/auth';
import fs from 'fs';

const router = express.Router();

// Configure multer for memory storage (we'll process the image in memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

router.post('/', auth, (req: AuthRequest, res) => {
    upload.single('image')(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        try {
            // Check if API key is configured
            if (!process.env.GEMINI_API_KEY) {
                return res.status(500).json({
                    error: 'Gemini API key not configured',
                    details: 'Please add GEMINI_API_KEY to your .env file'
                });
            }

            // Convert buffer to base64
            const imageBase64 = req.file.buffer.toString('base64');
            const mimeType = req.file.mimetype;

            // Use Gemini Vision model
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' });

            const prompt = `Analyze this clothing item image and extract the following details in JSON format:
{
  "name": "A descriptive name for the item (e.g., 'Blue Denim Jacket', 'Black Cotton T-Shirt')",
  "category": "One of: Tops, Bottoms, Dresses, Outerwear, Shoes, Accessories",
  "color": "Primary color (e.g., Black, White, Blue, Red, etc.)",
  "brand": "Brand name if visible, otherwise 'Unknown'",
  "style": "Style description (e.g., Casual, Formal, Sporty, Vintage)",
  "material": "Material if identifiable (e.g., Cotton, Denim, Leather, Polyester)",
  "pattern": "Pattern if any (e.g., Solid, Striped, Floral, Plaid)"
}

Provide ONLY the JSON object, no additional text.`;

            const result = await model.generateContent([
                {
                    inlineData: {
                        data: imageBase64,
                        mimeType: mimeType
                    }
                },
                prompt
            ]);

            const response = await result.response;
            const text = response.text();

            // Parse JSON from response
            let detectedData;
            try {
                // Remove markdown code blocks if present
                const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                detectedData = JSON.parse(jsonText);
            } catch (parseError) {
                console.error('Failed to parse Gemini response:', text);
                return res.status(500).json({
                    error: 'Failed to parse AI response',
                    rawResponse: text
                });
            }

            console.log('Clothing detected:', detectedData);
            res.json(detectedData);

        } catch (error: any) {
            const errorLog = {
                timestamp: new Date().toISOString(),
                message: error.message,
                stack: error.stack,
                response: error.response?.data,
                name: error.name
            };

            console.error('Error detecting clothing:', error);

            // Write to error log file
            try {
                fs.appendFileSync('error.log', JSON.stringify(errorLog, null, 2) + '\n---\n');
            } catch (fsError) {
                console.error('Failed to write to error log:', fsError);
            }

            res.status(500).json({
                error: 'Failed to analyze clothing',
                details: error instanceof Error ? error.message : 'Unknown error',
                hint: 'Check server/error.log for more details'
            });
        }
    });
});

export default router;
