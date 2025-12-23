import { useState, useEffect } from 'react';
import { Plus, Upload, X, Loader2, Camera, Trash2, Heart, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { WardrobeItem } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { uploadImage, compressImage } from '../lib/imageUpload';
import { detectClothingFeatures, mapAITypeToCategory, normalizeColor, ClothingFeatures } from '../lib/aiFeatureDetection';
import { getDisableDbWritesRuntime } from '../lib/devMode';

export default function WardrobeView() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [favoriteItems, setFavoriteItems] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  // Form state for adding new item
  const [formData, setFormData] = useState({
    name: '',
    category: 'Tops',
    color: '',
    brand: '',
    purchase_price: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectingFeatures, setDetectingFeatures] = useState(false);
  const [detectedFeatures, setDetectedFeatures] = useState<ClothingFeatures | null>(null);
  const [aiDetectionError, setAiDetectionError] = useState<string | null>(null);
  // runtime check: toggled via Developer Mode or env var
  const DISABLE_DB_WRITES = getDisableDbWritesRuntime();

  useEffect(() => {
    if (user) {
      loadWardrobeItems();
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      const { data } = await api.get('/favorites');
      const favoriteIds = new Set<string>(data.map((item: any) => item.external_id));
      setFavoriteItems(favoriteIds);
    } catch (err) {
      console.error('Error loading favorites:', err);
    }
  };

  const loadWardrobeItems = async () => {
    try {
      const { data } = await api.get('/wardrobe');
      // Map _id to id for frontend compatibility
      const mappedItems = data.map((item: any) => ({ ...item, id: item._id }));
      setItems(mappedItems || []);
    } catch (err) {
      console.error('Error loading wardrobe items:', err);
      setError('Failed to load wardrobe items');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    try {
      setDetectingFeatures(true);
      setError(null);
      setAiDetectionError(null);

      // Compress image before preview and AI analysis
      const compressedFile = await compressImage(file, 800, 800, 0.8);
      setSelectedFile(compressedFile);

      // Create preview URL
      const url = URL.createObjectURL(compressedFile);
      setPreviewUrl(url);

      // Detect clothing features using AI model
      const detectionResult = await detectClothingFeatures(compressedFile);

      if (detectionResult.success && detectionResult.features) {
        const features = detectionResult.features;
        setDetectedFeatures(features);

        // Auto-fill form with detected features
        setFormData(prev => ({
          ...prev,
          category: mapAITypeToCategory(features.type),
          color: normalizeColor(features.color),
          name: prev.name || `${features.color} ${features.type}` // Suggest name if empty
        }));
      } else {
        // AI detection failed, but still allow manual input
        console.warn('AI feature detection failed:', detectionResult.error);
        setDetectedFeatures(null);
        setAiDetectionError(detectionResult.error || 'AI detection failed. Please fill the form manually.');
      }

    } catch (err) {
      console.error('Error processing image:', err);
      setError('Failed to process image');
      setDetectedFeatures(null);
    } finally {
      setDetectingFeatures(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setError('Please select an image');
      return;
    }

    if (!formData.name.trim()) {
      setError('Please enter an item name');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload image to Server
      const uploadResult = await uploadImage(selectedFile, 'wardrobe', user?.id);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      console.log('Image uploaded successfully:', uploadResult.url);

      // If developer requested DB writes disabled, skip the insert and simulate success
      if (DISABLE_DB_WRITES) {
        console.info('VITE_DISABLE_DB_WRITES is enabled — skipping DB insert for development');
      } else {
        await api.post('/wardrobe', {
          name: formData.name.trim(),
          category: formData.category,
          color: formData.color.trim() || null,
          brand: formData.brand.trim() || null,
          purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
          image_url: uploadResult.url!,
          wear_count: 0,
          ai_tags: {}
        });

        // Reset form and close modal
        resetForm();
        setShowAddModal(false);

        // Reload items
        await loadWardrobeItems();
      }

    } catch (err: any) {
      console.error('Error adding item:', err);
      setError(err.response?.data?.error || err.message || 'Failed to add item');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Tops',
      color: '',
      brand: '',
      purchase_price: ''
    });
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setError(null);
    setDetectedFeatures(null);
    setDetectingFeatures(false);
    setAiDetectionError(null);
  };

  const handleDeleteItem = async (item: WardrobeItem) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      // Delete from database
      await api.delete(`/wardrobe/${item.id}`);

      // Remove from local state
      setItems(prev => prev.filter(i => i.id !== item.id));
      setFavoriteItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });

    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
    }
  };

  const toggleFavorite = async (item: WardrobeItem) => {
    if (!user) return;

    try {
      const isFavorited = favoriteItems.has(item.id);

      if (isFavorited) {
        // Remove from favorites
        await api.delete(`/favorites/${item.id}`);

        setFavoriteItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
      } else {
        // Add to favorites
        await api.post('/favorites', {
          item_name: item.name,
          platform: 'wardrobe', // Platform identifier for wardrobe items
          external_id: item.id,
          image_url: item.image_url,
          price: item.purchase_price || 0,
          currency: 'USD',
          seller: item.brand || 'Personal',
          url: '', // No URL for personal wardrobe items
          metadata: {
            category: item.category,
            color: item.color,
            brand: item.brand,
            wear_count: item.wear_count,
            source: 'wardrobe'
          },
        });

        setFavoriteItems(prev => new Set(prev).add(item.id));
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setError('Failed to update favorite');
    }
  };

  const categories = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories'];
  const colors = ['Black', 'White', 'Gray', 'Navy', 'Blue', 'Red', 'Pink', 'Green', 'Yellow', 'Brown', 'Beige'];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">My Wardrobe</h2>
          <p className="text-slate-600">
            {items.length} {items.length === 1 ? 'item' : 'items'} in your collection
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-xs mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Items Grid */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No items in your wardrobe yet</h3>
          <p className="text-slate-600 mb-6">Start building your digital wardrobe by adding photos of your clothes</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-violet-600 text-white px-6 py-3 rounded-lg hover:bg-violet-700 transition"
          >
            Add Your First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden group">
              <div className="aspect-[3/4] relative">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Failed to load image:', item.image_url);
                    // Fallback to placeholder image
                    (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800';
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFavorite(item)}
                      className={`p-2 rounded-full transition ${favoriteItems.has(item.id)
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-white text-red-500 hover:bg-red-50'
                        }`}
                      title={favoriteItems.has(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart className={`w-4 h-4 ${favoriteItems.has(item.id) ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  {item.category}
                </div>
                {favoriteItems.has(item.id) && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-current" />
                    Favorited
                  </div>
                )}
                {item.wear_count > 0 && !favoriteItems.has(item.id) && (
                  <div className="absolute top-2 right-2 bg-violet-500 text-white text-xs px-2 py-1 rounded">
                    Worn {item.wear_count}x
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-medium text-slate-900 text-sm mb-1 line-clamp-2">
                  {item.name}
                </h3>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>{item.brand || 'No brand'}</span>
                  {item.color && (
                    <span className="bg-slate-100 px-2 py-1 rounded">
                      {item.color}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    {item.purchase_price ? `$${item.purchase_price.toFixed(2)}` : 'No price'}
                  </div>
                  <button
                    onClick={() => toggleFavorite(item)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition ${favoriteItems.has(item.id)
                      ? 'text-red-600 bg-red-50 hover:bg-red-100'
                      : 'text-slate-500 hover:text-red-500 hover:bg-red-50'
                      }`}
                    title={favoriteItems.has(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`w-3 h-3 ${favoriteItems.has(item.id) ? 'fill-current' : ''}`} />
                    {favoriteItems.has(item.id) ? 'Favorited' : 'Favorite'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Add New Item</h3>
                <button
                  onClick={() => {
                    resetForm();
                    setShowAddModal(false);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Photo *
                  </label>
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border border-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          if (previewUrl) URL.revokeObjectURL(previewUrl);
                          setPreviewUrl(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="block">
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-violet-400 transition cursor-pointer">
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-slate-600 text-sm mb-1">Click to upload photo</p>
                          <p className="text-slate-500 text-xs">PNG, JPG up to 10MB</p>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* AI Detection Status */}
                {detectingFeatures && (
                  <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-violet-700">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      <span className="text-sm font-medium">Detecting clothing features...</span>
                    </div>
                  </div>
                )}

                {detectedFeatures && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-medium">AI Detection Results</span>
                    </div>
                    <div className="text-sm text-green-600 space-y-1">
                      {detectedFeatures.type && (
                        <div>Type: <span className="font-medium">{detectedFeatures.type}</span></div>
                      )}
                      {detectedFeatures.color && (
                        <div>Color: <span className="font-medium">{detectedFeatures.color}</span></div>
                      )}
                      {detectedFeatures.style && (
                        <div>Style: <span className="font-medium">{detectedFeatures.style}</span></div>
                      )}

                      {/* Show AI-specific errors if detection failed */}
                      {aiDetectionError && (
                        <div className="mt-3 text-sm text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-100">
                          <strong>AI detection:</strong> {aiDetectionError}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      Form fields have been auto-filled. You can modify them below if needed.
                    </p>
                  </div>
                )}


                {/* Item Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Blue Denim Jacket"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Category *
                    {detectedFeatures?.type && (
                      <span className="ml-2 text-xs text-violet-600 bg-violet-100 px-2 py-0.5 rounded">
                        AI detected
                      </span>
                    )}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 ${detectedFeatures?.type ? 'border-violet-300 bg-violet-50' : 'border-slate-300'
                      }`}
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Color
                    {detectedFeatures?.color && (
                      <span className="ml-2 text-xs text-violet-600 bg-violet-100 px-2 py-0.5 rounded">
                        AI detected
                      </span>
                    )}
                  </label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 ${detectedFeatures?.color ? 'border-violet-300 bg-violet-50' : 'border-slate-300'
                      }`}
                  >
                    <option value="">Select color</option>
                    {colors.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="e.g., Zara, H&M, Vintage"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>

                {/* Purchase Price */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Purchase Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowAddModal(false);
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Item'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}