import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, ExternalLink, Package, Store, Calendar, Ruler, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { WardrobeItem } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { getCarousellProduct } from '../lib/carousellApi';
import { useSearch } from '../contexts/SearchContext';

type Product = {
  id: string;
  name: string;
  price: number;
  currency: string;
  platform: string;
  image_url: string;
  url: string;
  description?: string;
  condition?: string;
  size?: string;
  brand?: string;
  seller?: string;
  posted_date?: string;
  category?: string;
  color?: string;
  material?: string;
  measurements?: {
    bust?: string;
    waist?: string;
    hips?: string;
    length?: string;
  };
};

type ProductViewProps = {
  productId: string;
  onBack: () => void;
  onVirtualTryOnClick?: (favorites: any[]) => void;
};

export default function ProductView({ productId, onBack, onVirtualTryOnClick }: ProductViewProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [similarInCloset, setSimilarInCloset] = useState<WardrobeItem[]>([]);
  const { user } = useAuth();
  const { searchResults } = useSearch();

  useEffect(() => {
    loadProduct();
    if (user) {
      checkIfFavorite();
      loadSimilarItems();
    }
  }, [productId, user]);

  const loadProduct = async () => {
    setLoading(true);

    // First try to get product from search results cache
    const cachedProduct = searchResults.find(item => item.id === productId);

    if (cachedProduct) {
      // Convert CarousellSearchResult to Product format
      setProduct({
        id: cachedProduct.id,
        name: cachedProduct.name,
        price: cachedProduct.price,
        currency: cachedProduct.currency,
        platform: cachedProduct.platform,
        image_url: cachedProduct.image_url,
        url: cachedProduct.url,
        description: cachedProduct.description || 'No description available',
        condition: cachedProduct.condition || 'Good',
        size: cachedProduct.size || 'One Size',
        brand: cachedProduct.brand || 'Unknown Brand',
        seller: cachedProduct.seller || 'Unknown Seller',
        posted_date: cachedProduct.posted_date || new Date().toISOString().split('T')[0],
        category: cachedProduct.category || 'Clothing',
        color: cachedProduct.color || 'Unknown',
        material: cachedProduct.material || 'Mixed Materials',
        measurements: cachedProduct.measurements
      });
      setLoading(false);
      return;
    }

    // Fallback to API cache
    const apiCachedProduct = getCarousellProduct(productId);
    if (apiCachedProduct) {
      setProduct({
        id: apiCachedProduct.id,
        name: apiCachedProduct.name,
        price: apiCachedProduct.price,
        currency: apiCachedProduct.currency,
        platform: apiCachedProduct.platform,
        image_url: apiCachedProduct.image_url,
        url: apiCachedProduct.url,
        description: apiCachedProduct.description || 'No description available',
        condition: apiCachedProduct.condition || 'Good',
        size: apiCachedProduct.size || 'One Size',
        brand: apiCachedProduct.brand || 'Unknown Brand',
        seller: apiCachedProduct.seller || 'Unknown Seller',
        posted_date: apiCachedProduct.posted_date || new Date().toISOString().split('T')[0],
        category: apiCachedProduct.category || 'Clothing',
        color: apiCachedProduct.color || 'Unknown',
        material: apiCachedProduct.material || 'Mixed Materials',
        measurements: apiCachedProduct.measurements
      });
      setLoading(false);
      return;
    }

    // Fallback to mock data if not found in cache
    await new Promise(resolve => setTimeout(resolve, 300));
    setProduct({
      id: productId,
      name: 'Vintage Ralph Lauren Cable Knit Sweater',
      price: 36,
      currency: 'USD',
      platform: 'Depop',
      image_url: 'https://images.pexels.com/photos/794062/pexels-photo-794062.jpeg?auto=compress&cs=tinysrgb&w=1200',
      url: 'https://www.depop.com/example',
      description: 'Beautiful vintage Ralph Lauren cable knit sweater in excellent condition. This classic piece features a timeless cable knit pattern and the iconic polo logo. Perfect for layering or wearing on its own. Made from high-quality cotton blend that gets softer with each wear.',
      condition: 'Excellent - Like New',
      size: 'Medium',
      brand: 'Ralph Lauren',
      seller: 'VintageThreads_NYC',
      posted_date: '2025-10-01',
      category: 'Sweaters',
      color: 'Cream',
      material: '80% Cotton, 20% Wool',
      measurements: {
        bust: '40"',
        length: '24"',
        waist: '38"',
      },
    });

    setLoading(false);
  };

  const checkIfFavorite = async () => {
    try {
      const { data } = await api.get('/favorites');
      const isFav = data.some((item: any) => item.external_id === productId);
      setIsFavorite(isFav);
    } catch (err) {
      console.error('Error checking favorite:', err);
    }
  };

  const loadSimilarItems = async () => {
    try {
      const { data } = await api.get('/wardrobe');
      setSimilarInCloset(data.slice(0, 3) || []);
    } catch (err) {
      console.error('Error loading similar items:', err);
    }
  };

  const toggleFavorite = async () => {
    if (!user || !product) return;

    try {
      if (isFavorite) {
        await api.delete(`/favorites/${productId}`);
        setIsFavorite(false);
      } else {
        await api.post('/favorites', {
          item_name: product.name,
          platform: product.platform,
          external_id: productId,
          image_url: product.image_url,
          price: product.price,
          currency: product.currency,
          seller: product.seller || null,
          url: product.url,
          metadata: {
            condition: product.condition,
            size: product.size,
            brand: product.brand,
            category: product.category,
          },
        });
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleTryOn = async () => {
    if (!user || !product || !onVirtualTryOnClick) return;

    try {
      // First, ensure the item is in favorites
      if (!isFavorite) {
        await api.post('/favorites', {
          item_name: product.name,
          platform: product.platform,
          external_id: productId,
          image_url: product.image_url,
          price: product.price,
          currency: product.currency,
          seller: product.seller || null,
          url: product.url,
          metadata: {
            condition: product.condition,
            size: product.size,
            brand: product.brand,
            category: product.category,
          },
        });
        setIsFavorite(true);
      }

      // Get updated favorites list
      const { data } = await api.get('/favorites');

      // Navigate to virtual try-on with this item selected
      onVirtualTryOnClick(data || []);
    } catch (err) {
      console.error('Error preparing for try-on:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Product not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Product Details</h1>
          <button
            onClick={toggleFavorite}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <Heart
              className={`w-6 h-6 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-700'}`}
            />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full aspect-[3/4] object-cover"
            />
          </div>

          <div>
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{product.name}</h2>
                  {product.brand && (
                    <p className="text-slate-600 mb-1">{product.brand}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-slate-900">
                    {product.currency === 'SGD' ? 'S$' : '$'}{product.price}
                  </p>
                  <p className="text-sm text-slate-500">{product.currency}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <div className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  {product.platform}
                </div>
                {product.condition && (
                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    {product.condition}
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-6">
                {product.size && (
                  <div className="flex items-center gap-3">
                    <Ruler className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Size</p>
                      <p className="font-medium text-slate-900">{product.size}</p>
                    </div>
                  </div>
                )}

                {product.seller && (
                  <div className="flex items-center gap-3">
                    <Store className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Seller</p>
                      <p className="font-medium text-slate-900">{product.seller}</p>
                    </div>
                  </div>
                )}

                {product.posted_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">Listed</p>
                      <p className="font-medium text-slate-900">
                        {new Date(product.posted_date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-2"
              >
                View on {product.platform}
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>

            {similarInCloset.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Check Your Closet</h3>
                    <p className="text-sm text-slate-700 mb-3">
                      You have <strong>{similarInCloset.length} similar items</strong> in your wardrobe
                    </p>
                    <div className="flex gap-2">
                      {similarInCloset.map((item) => (
                        <div key={item.id} className="w-16 h-16 rounded-lg overflow-hidden border-2 border-amber-300">
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Description</h3>
            <p className="text-slate-700 leading-relaxed">{product.description}</p>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Details</h3>
              <div className="space-y-3">
                {product.category && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Category</span>
                    <span className="font-medium text-slate-900">{product.category}</span>
                  </div>
                )}
                {product.color && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Color</span>
                    <span className="font-medium text-slate-900">{product.color}</span>
                  </div>
                )}
                {product.material && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Material</span>
                    <span className="font-medium text-slate-900">{product.material}</span>
                  </div>
                )}
              </div>
            </div>

            {product.measurements && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Measurements</h3>
                <div className="space-y-3">
                  {product.measurements.bust && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Bust</span>
                      <span className="font-medium text-slate-900">{product.measurements.bust}</span>
                    </div>
                  )}
                  {product.measurements.waist && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Waist</span>
                      <span className="font-medium text-slate-900">{product.measurements.waist}</span>
                    </div>
                  )}
                  {product.measurements.length && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Length</span>
                      <span className="font-medium text-slate-900">{product.measurements.length}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {onVirtualTryOnClick && product.category && !['Accessories', 'Shoes'].includes(product.category) && (
          <div className="mt-8 bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <Sparkles className="w-6 h-6 text-violet-600 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">AI Try-On Available</h3>
                <p className="text-slate-700 mb-4">
                  See how this item would look on you before buying. Upload your photo or use an AI-generated model.
                </p>
                <button
                  onClick={handleTryOn}
                  className="bg-white text-violet-700 px-6 py-3 rounded-lg font-semibold hover:bg-violet-50 transition flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Try It On
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
