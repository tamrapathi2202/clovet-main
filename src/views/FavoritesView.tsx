import { useState, useEffect } from 'react';
import { Heart, Loader2, ShoppingCart, Wand2 } from 'lucide-react';
import { api } from '../lib/api';
import { FavoriteItem } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';

type FavoritesViewProps = {
  onProductClick: (productId: string) => void;
  onVirtualTryOnClick: (favorites: FavoriteItem[]) => void;
};

export default function FavoritesView({ onProductClick, onVirtualTryOnClick }: FavoritesViewProps) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      const { data } = await api.get('/favorites');

      // Ensure we handle MongoDB _id correctly and remove duplicates
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        // Handle cases where id/_id might be missing or duplicated
        id: item.id || item._id || `fav-${Math.random().toString(36).substr(2, 9)}`
      }));

      // Deduplicate based on ID first, then content if needed
      const uniqueItems = mappedData.filter((item: any, index: number, self: any[]) =>
        index === self.findIndex((t) => (
          t.id === item.id ||
          (t.external_id && t.external_id === item.external_id) ||
          (t.image_url === item.image_url && t.item_name === item.item_name)
        ))
      );

      setFavorites(uniqueItems);
    } catch (err) {
      console.error('Error loading favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (id: string) => {
    try {
      await api.delete(`/favorites/${id}`);
      setFavorites(favorites.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  const platforms = ['All', 'My Wardrobe', 'Depop', 'Poshmark', 'ThredUp', 'Vestiaire', 'eBay'];
  const [selectedPlatform, setSelectedPlatform] = useState('All');

  const filteredFavorites = selectedPlatform === 'All'
    ? favorites
    : selectedPlatform === 'My Wardrobe'
      ? favorites.filter(item => item.platform === 'wardrobe')
      : favorites.filter(item => item.platform === selectedPlatform);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Favorites</h2>
        <p className="text-slate-600">
          {favorites.length} saved {favorites.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        {platforms.map((platform) => (
          <button
            key={platform}
            onClick={() => setSelectedPlatform(platform)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedPlatform === platform
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            {platform}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {selectedPlatform === 'All'
              ? 'No favorites yet'
              : selectedPlatform === 'My Wardrobe'
                ? 'No wardrobe items favorited yet'
                : `No favorites from ${selectedPlatform}`
            }
          </h3>
          <p className="text-slate-600 mb-6">
            {selectedPlatform === 'My Wardrobe'
              ? 'Add items to your favorites from your wardrobe to see them here'
              : 'Start saving items you love while browsing'
            }
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Wand2 className="w-5 h-5 text-violet-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">AI Mix & Match</h3>
                <p className="text-sm text-slate-700 mb-3">
                  Create outfits with your favorites and see how they look on you
                </p>
                <button
                  onClick={() => onVirtualTryOnClick(favorites)}
                  className="text-sm font-medium bg-white text-violet-700 px-4 py-2 rounded-lg hover:bg-violet-50 transition"
                >
                  Try Virtual Try-On
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredFavorites.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  // Don't navigate for wardrobe items since they don't have external URLs
                  if (item.platform !== 'wardrobe') {
                    onProductClick(item.external_id);
                  }
                }}
                className={`bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition group ${item.platform !== 'wardrobe' ? 'cursor-pointer' : 'cursor-default'
                  }`}
              >
                <div className="aspect-[3/4] relative">
                  <img
                    src={item.image_url}
                    alt={item.item_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(item.id);
                      }}
                      className="bg-red-500 bg-opacity-90 backdrop-blur-sm p-2 rounded-full hover:bg-opacity-100 transition"
                    >
                      <Heart className="w-4 h-4 text-white fill-white" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                    <span className="text-xs text-white font-medium bg-slate-900 bg-opacity-50 px-2 py-1 rounded">
                      {item.platform === 'wardrobe' ? 'My Wardrobe' : item.platform}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-slate-900 text-sm mb-1 line-clamp-2">
                    {item.item_name}
                  </h3>
                  <p className="text-lg font-bold text-slate-900">
                    ${item.price}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{item.currency}</p>
                  {item.seller && (
                    <p className="text-xs text-slate-400 mt-1">
                      {item.platform === 'wardrobe' ? `Brand: ${item.seller}` : `by ${item.seller}`}
                    </p>
                  )}
                  {item.platform !== 'wardrobe' && item.url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(item.url, '_blank');
                      }}
                      className="w-full mt-2 bg-slate-900 text-white text-xs py-2 rounded-lg hover:bg-slate-800 transition flex items-center justify-center gap-1"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      Shop Now
                    </button>
                  )}
                  {item.platform === 'wardrobe' && (
                    <div className="w-full mt-2 bg-violet-100 text-violet-700 text-xs py-2 rounded-lg text-center">
                      From Your Wardrobe
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
