import express from 'express';
import Replicate from 'replicate';
const axios = require('axios');
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.post('/', auth, async (req: AuthRequest, res) => {
    try {
        const { userImageBase64, clothingImageUrl, clothingName } = req.body;
        const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

        console.log('Virtual Try-On Request Received');
        console.log('Clothing:', clothingName);
        console.log('API Key configured:', !!REPLICATE_API_KEY);

        if (!userImageBase64 || !clothingImageUrl) {
            console.error('Missing required fields');
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!REPLICATE_API_KEY) {
            console.log('Replicate API key not configured, using mock');
            return res.json({
                success: true,
                imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2Y1ZjVmNSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNDUlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM2NjYiPgogICAgVmlydHVhbCBUcnktT24gUmVzdWx0CiAgPC90ZXh0PgogIDx0ZXh0IHg9IjUwJSIgeT0iNTUlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTkiPgogICAgKERlbW8gTW9kZSkKICA8L3RleHQ+Cjwvc3ZnPg=='
            });
        }

        const replicate = new Replicate({
            auth: REPLICATE_API_KEY,
        });

        // Convert user image base64 to data URL if it isn't already
        let userImageDataUrl = userImageBase64;
        if (!userImageDataUrl.startsWith('data:')) {
            userImageDataUrl = `data:image/jpeg;base64,${userImageBase64}`;
        }

        console.log('Calling Replicate API...');

        // Using IDM-VTON model
        const output = await replicate.run(
            "cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
            {
                input: {
                    human_img: userImageDataUrl,
                    garm_img: clothingImageUrl,
                    garment_des: clothingName || "clothing item",
                    seed: 42,
                    steps: 30,
                    guidance_scale: 2.0,
                    category: "upper_body"
                }
            }
        );

        console.log('Replicate output received:', output);

        let imageUrl: string | null = null;

        if (typeof output === 'string') {
            imageUrl = output;
        } else if (Array.isArray(output) && output.length > 0) {
            imageUrl = output[0];
        }

        if (!imageUrl) {
            throw new Error('Invalid output format from Replicate API');
        }

        console.log('Fetching generated image from:', imageUrl);

        // Fetch the image using axios
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer'
        });

        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64}`;

        console.log('Image processed successfully');

        return res.json({
            success: true,
            imageUrl: dataUrl
        });

    } catch (error: any) {
        console.error('Error in virtual try-on route:', error);
        if (error.response) {
            console.error('Axios error data:', error.response.data);
            console.error('Axios error status:', error.response.status);
        } else if (error.request) {
            console.error('Axios request error (no response):', error.request);
        } else {
            console.error('Error message:', error.message);
        }

        res.status(500).json({
            error: 'Failed to generate virtual try-on',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

export default router;
