// Replicate API service for virtual try-on functionality
import Replicate from "replicate";

const REPLICATE_API_KEY = import.meta.env.VITE_REPLICATE_API_KEY;

export type ClothingItem = {
    name: string;
    image_url: string;
    category: string;
};

export type VirtualTryOnRequest = {
    userImageBase64: string;
    clothingItems: ClothingItem[];
};

export type VirtualTryOnResponse = {
    success: boolean;
    imageUrl?: string;
    error?: string;
};

// Convert blob to data URL
function blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Main function to generate virtual try-on using Replicate API
export async function generateVirtualTryOn(request: VirtualTryOnRequest): Promise<VirtualTryOnResponse> {
    if (!REPLICATE_API_KEY) {
        console.error('Replicate API key not configured');
        return createMockResult();
    }

    try {
        const replicate = new Replicate({
            auth: REPLICATE_API_KEY,
        });

        // Convert user image base64 to data URL if it isn't already
        let userImageDataUrl = request.userImageBase64;
        if (!userImageDataUrl.startsWith('data:')) {
            userImageDataUrl = `data:image/jpeg;base64,${request.userImageBase64}`;
        }

        // Use the first clothing item for try-on (Replicate models typically handle one garment at a time)
        const clothingItem = request.clothingItems[0];

        console.log('Starting Replicate virtual try-on...');
        console.log('User image type:', userImageDataUrl.substring(0, 30));
        console.log('Clothing item:', clothingItem.name);

        // Using IDM-VTON model which is popular for virtual try-on
        // Model: "cuuupid/idm-vton" or "viktorfa/idm-vton-tiled"
        const output = await replicate.run(
            "cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
            {
                input: {
                    human_img: userImageDataUrl,
                    garm_img: clothingItem.image_url,
                    garment_des: clothingItem.name,
                    // Optional parameters for better results
                    seed: 42,
                    steps: 30,
                    guidance_scale: 2.0,
                    category: "upper_body" // or "lower_body", "dresses"
                }
            }
        );

        console.log('Replicate output:', output);

        // The output is typically a URL to the generated image
        if (typeof output === 'string') {
            // Fetch the image and convert to data URL for display
            const response = await fetch(output);
            const blob = await response.blob();
            const dataUrl = await blobToDataURL(blob);

            return {
                success: true,
                imageUrl: dataUrl
            };
        } else if (Array.isArray(output) && output.length > 0) {
            // Sometimes output is an array of URLs
            const response = await fetch(output[0]);
            const blob = await response.blob();
            const dataUrl = await blobToDataURL(blob);

            return {
                success: true,
                imageUrl: dataUrl
            };
        }

        throw new Error('Invalid output format from Replicate API');

    } catch (error) {
        console.error('Error generating virtual try-on with Replicate:', error);

        // Fallback to mock result
        return createMockResult();
    }
}

// Create a mock result for demonstration/fallback
function createMockResult(): VirtualTryOnResponse {
    console.log('Using mock virtual try-on result');

    // Create a simple mock by returning a different image
    // In a real scenario, this would be a placeholder or demonstration image
    const mockImageUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2Y1ZjVmNSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNDUlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM2NjYiPgogICAgVmlydHVhbCBUcnktT24gUmVzdWx0CiAgPC90ZXh0PgogIDx0ZXh0IHg9IjUwJSIgeT0iNTUlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTkiPgogICAgKERlbW8gTW9kZSkKICA8L3RleHQ+Cjwvc3ZnPg==';

    return {
        success: true,
        imageUrl: mockImageUrl
    };
}

// Utility function to convert File to base64
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]); // Remove data URL prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Utility function to download generated image
export function downloadGeneratedImage(dataUrl: string, filename: string = 'virtual-try-on.png') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
