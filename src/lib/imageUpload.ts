import { api } from './api';

export type ImageUploadResult = {
  success: boolean;
  url?: string;
  error?: string;
};

/**
 * Upload an image to the server
 * @param file - The image file to upload
 * @param folder - The folder name (unused in this implementation but kept for compatibility)
 * @param userId - The user ID (unused in this implementation but kept for compatibility)
 * @returns Promise with upload result
 */
export async function uploadImage(
  file: File,
  _folder: string = 'wardrobe',
  _userId?: string
): Promise<ImageUploadResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'Please select a valid image file'
      };
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'Image size must be less than 10MB'
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return {
      success: true,
      url: data.url
    };

  } catch (error: any) {
    console.error('Image upload error:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Delete an image from the server (Not implemented in this basic version)
 * @param imageUrl - The full URL of the image to delete
 * @returns Promise with deletion result
 */
export async function deleteImage(_imageUrl: string): Promise<{ success: boolean; error?: string }> {
  // For now, we won't implement file deletion on the server to keep it simple
  // In a real app, you'd send a DELETE request to the server
  return { success: true };
}

/**
 * Compress an image file before upload
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels
 * @param maxHeight - Maximum height in pixels
 * @param quality - Compression quality (0-1)
 * @returns Promise with compressed file
 */
export function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      // Set canvas size and draw image
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob and create new file
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
}