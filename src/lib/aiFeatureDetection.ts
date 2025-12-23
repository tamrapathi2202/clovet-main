// AI Model API service for clothing feature detection
import { api } from './api';

export type ClothingFeatures = {
  color: string;
  style: string;
  type: string;
  name?: string;
  brand?: string;
  material?: string;
  pattern?: string;
  category?: string;
};

export type FeatureDetectionResult = {
  success: boolean;
  features?: ClothingFeatures;
  error?: string;
};

/**
 * Analyze uploaded clothing image using AI model to detect features
 * @param file - The image file to analyze
 * @returns Promise with detected features or error
 */
export async function detectClothingFeatures(file: File): Promise<FeatureDetectionResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'Please provide a valid image file'
      };
    }

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('image', file);

    try {
      // Call our backend Gemini-powered detection endpoint
      const response = await api.post('/detect-clothing', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = response.data;

      // Map backend response to ClothingFeatures
      const features: ClothingFeatures = {
        color: result.color || 'Unknown',
        style: result.style || 'Casual',
        type: result.category || 'Other',
        name: result.name,
        brand: result.brand,
        material: result.material,
        pattern: result.pattern,
        category: result.category
      };

      return {
        success: true,
        features
      };

    } catch (error: any) {
      console.error('Error detecting clothing features:', error);

      // Handle specific error cases
      if (error.response?.status === 500 && error.response?.data?.error === 'Gemini API key not configured') {
        return {
          success: false,
          error: 'AI detection not configured. Please add GEMINI_API_KEY to server .env file'
        };
      }

      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }

      return {
        success: false,
        error: 'Failed to analyze image. Please try again or fill details manually.'
      };
    }

  } catch (error) {
    console.error('Error in detectClothingFeatures:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze image features'
    };
  }
}

/**
 * Map AI model clothing types to wardrobe categories
 * @param aiType - Type detected by AI model
 * @returns Wardrobe category
 */
export function mapAITypeToCategory(aiType: string): string {
  const typeMapping: Record<string, string> = {
    'Shirts': 'Tops',
    'T-Shirts': 'Tops',
    'Blouses': 'Tops',
    'Tank Tops': 'Tops',
    'Sweaters': 'Tops',
    'Hoodies': 'Tops',
    'Top': 'Tops',
    'Jeans': 'Bottoms',
    'Pants': 'Bottoms',
    'Trousers': 'Bottoms',
    'Shorts': 'Bottoms',
    'Skirts': 'Bottoms',
    'Leggings': 'Bottoms',
    'Dresses': 'Dresses',
    'Gowns': 'Dresses',
    'Sundresses': 'Dresses',
    'Jackets': 'Outerwear',
    'Coats': 'Outerwear',
    'Blazers': 'Outerwear',
    'Cardigans': 'Outerwear',
    'Vests': 'Outerwear',
    'Sneakers': 'Shoes',
    'Boots': 'Shoes',
    'Heels': 'Shoes',
    'Flats': 'Shoes',
    'Sandals': 'Shoes',
    'Loafers': 'Shoes',
  };

  return typeMapping[aiType] || 'Accessories';
}

/**
 * Normalize color names for consistency
 * @param aiColor - Color detected by AI model
 * @returns Standardized color name
 */
export function normalizeColor(aiColor: string): string {
  const colorMapping: Record<string, string> = {
    'white': 'White',
    'black': 'Black',
    'gray': 'Gray',
    'grey': 'Gray',
    'navy': 'Navy',
    'blue': 'Blue',
    'red': 'Red',
    'pink': 'Pink',
    'green': 'Green',
    'yellow': 'Yellow',
    'brown': 'Brown',
    'beige': 'Beige',
    'cream': 'Beige',
    'tan': 'Brown',
    'orange': 'Red', // Map orange to red as fallback
    'purple': 'Pink', // Map purple to pink as fallback
    'violet': 'Pink'
  };

  const lowerColor = aiColor.toLowerCase().trim();
  return colorMapping[lowerColor] || aiColor;
}