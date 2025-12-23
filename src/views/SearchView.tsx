import { useState, useEffect } from 'react';
import { Search, Sparkles, Filter, Heart, AlertCircle, X, Tag, ShoppingCart } from 'lucide-react';
import { searchCarousell } from '../lib/carousellApi';
import { useSearch, type UnifiedSearchResult } from '../contexts/SearchContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

import { enhanceSearchWithSemantics, type SemanticSearchResult } from '../lib/geminiApi';

type SearchResult = UnifiedSearchResult;

type SearchViewProps = {
  onProductClick: (productId: string) => void;
};

export default function SearchView({ onProductClick }: SearchViewProps) {
  const {
    searchResults,
    setSearchResults,
    currentSearchQuery,
    setCurrentSearchQuery,
    selectedPlatform,
    setSelectedPlatform,
    forYouRecommendations
  } = useSearch();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState(currentSearchQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [showCheckCloset, setShowCheckCloset] = useState(false);
  const [similarItemsInCloset, setSimilarItemsInCloset] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [favoriteItems, setFavoriteItems] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    priceRange: { min: '', max: '' },
    category: '',
    condition: '',
    color: '',
    brand: '',
    size: ''
  });
  const [semanticData, setSemanticData] = useState<SemanticSearchResult | null>(null);
  // We only toggle semantic search via UI features later; leave setter out to avoid unused variable warning
  const [useSemanticSearch] = useState(true);

  // Load favorite items on mount
  useEffect(() => {
    if (user) {
      loadFavoriteItems();
    }
  }, [user]);

  const loadFavoriteItems = async () => {
    if (!user) return;

    try {
      const { data } = await api.get('/favorites');
      const favoriteIds = new Set<string>(data.map((item: any) => item.external_id));
      setFavoriteItems(favoriteIds);
    } catch (err) {
      console.error('Error loading favorites:', err);
    }
  };

  const toggleFavorite = async (item: SearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const itemId = item.id;
    const isFavorite = favoriteItems.has(itemId);

    try {
      if (isFavorite) {
        await api.delete(`/favorites/${itemId}`);

        setFavoriteItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      } else {
        await api.post('/favorites', {
          item_name: item.name,
          platform: item.platform,
          external_id: itemId,
          image_url: item.image_url,
          price: item.price,
          currency: item.currency,
          seller: item.seller || null,
          url: item.url,
          metadata: {
            condition: item.condition,
            size: item.size,
            brand: item.brand,
            description: item.description
          },
        });

        setFavoriteItems(prev => new Set(prev).add(itemId));
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowCheckCloset(false);
    setError(null);
    setSemanticData(null);


    try {
      let allResults: UnifiedSearchResult[] = [];
      let queryToSearch = searchQuery.trim();
      if (useSemanticSearch) {
        try {
          const semanticResult = await enhanceSearchWithSemantics({ query: searchQuery.trim() });
          setSemanticData(semanticResult);
          queryToSearch = semanticResult.enhancedQuery;
        } catch (semanticError) {
          console.error('Semantic search error:', semanticError);
        }
      }

      // Search external platforms
      if (selectedPlatform === 'All' || selectedPlatform === 'Carousell') {
        try {
          const carousellResults = await searchCarousell(queryToSearch);
          allResults = [...allResults, ...carousellResults];
        } catch (carousellError) {
          console.error('Carousell search error:', carousellError);
        }
      }

      // Search user's wardrobe
      if (user && (selectedPlatform === 'All' || selectedPlatform === 'My Wardrobe')) {
        try {
          const { data: wardrobeItems } = await api.get('/wardrobe/search', {
            params: { q: queryToSearch }
          });

          // Convert wardrobe items to UnifiedSearchResult format
          const wardrobeResults: UnifiedSearchResult[] = wardrobeItems.map((item: any) => ({
            id: item._id,
            name: item.name,
            price: item.purchase_price || 0,
            currency: 'USD',
            platform: 'My Wardrobe',
            image_url: item.image_url,
            url: '', // No external URL for wardrobe items
            seller: item.brand || 'Personal',
            category: item.category,
            color: item.color,
            brand: item.brand,
          }));

          allResults = [...allResults, ...wardrobeResults];
        } catch (wardrobeError) {
          console.error('Wardrobe search error:', wardrobeError);
        }
      }

      // Check if user is searching for items they might already have
      if (searchQuery.toLowerCase().includes('black blazer') ||
        searchQuery.toLowerCase().includes('blazer')) {
        setShowCheckCloset(true);
        setSimilarItemsInCloset(3);
      }

      // Update context with results
      setSearchResults(allResults);
      setCurrentSearchQuery(searchQuery.trim());

      // Reload favorites to include new results
      if (user) {
        loadFavoriteItems();
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search. Please try again.');

      // Fallback to mock data if API fails
      const fallbackResults = [
        {
          id: '1',
          name: 'Linen Pants',
          price: 20,
          currency: 'USD',
          platform: 'Depop',
          image_url: 'https://images.pexels.com/photos/5865474/pexels-photo-5865474.jpeg?auto=compress&cs=tinysrgb&w=800',
          url: '#',
        },
        {
          id: '2',
          name: 'Cream Beach Sweater',
          price: 43,
          currency: 'USD',
          platform: 'Poshmark',
          image_url: 'https://images.pexels.com/photos/5865527/pexels-photo-5865527.jpeg?auto=compress&cs=tinysrgb&w=800',
          url: '#',
        },
      ] as SearchResult[];
      setSearchResults(fallbackResults);
    } finally {
      setIsSearching(false);
    }
  };

  // Apply filters to search results
  const applyFilters = (items: SearchResult[], currentFilters: typeof filters): SearchResult[] => {
    return items.filter(item => {
      // Price range filter
      if (currentFilters.priceRange.min && item.price < parseFloat(currentFilters.priceRange.min)) {
        return false;
      }
      if (currentFilters.priceRange.max && item.price > parseFloat(currentFilters.priceRange.max)) {
        return false;
      }

      // Category filter
      if (currentFilters.category && item.category &&
        !item.category.toLowerCase().includes(currentFilters.category.toLowerCase())) {
        return false;
      }

      // Condition filter
      if (currentFilters.condition && item.condition &&
        !item.condition.toLowerCase().includes(currentFilters.condition.toLowerCase())) {
        return false;
      }

      // Color filter
      if (currentFilters.color && item.color &&
        !item.color.toLowerCase().includes(currentFilters.color.toLowerCase())) {
        return false;
      }

      // Brand filter
      if (currentFilters.brand && item.brand &&
        !item.brand.toLowerCase().includes(currentFilters.brand.toLowerCase())) {
        return false;
      }

      // Size filter
      if (currentFilters.size && item.size &&
        !item.size.toLowerCase().includes(currentFilters.size.toLowerCase())) {
        return false;
      }

      return true;
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      priceRange: { min: '', max: '' },
      category: '',
      condition: '',
      color: '',
      brand: '',
      size: ''
    });
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return filters.priceRange.min || filters.priceRange.max ||
      filters.category || filters.condition || filters.color ||
      filters.brand || filters.size;
  };

  const platforms = ['For You', 'All', 'My Wardrobe', 'Carousell', 'Depop', 'Poshmark', 'ThredUp', 'Vestiaire', 'eBay'];

  // Filter results based on selected platform and additional filters
  const filteredResults = selectedPlatform === 'For You'
    ? applyFilters(forYouRecommendations, filters)
    : selectedPlatform === 'All'
      ? applyFilters(searchResults, filters)
      : applyFilters(searchResults.filter((item: SearchResult) => item.platform === selectedPlatform), filters);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Style Semantics Search</h2>
        <p className="text-slate-600">
          Search with natural language or trendy references
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Try "coastal granddaughter core" or "vintage leather jacket"'
            className="w-full pl-12 pr-12 py-4 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent text-slate-900 placeholder-slate-400"
          />
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition ${hasActiveFilters()
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'hover:bg-slate-100 text-slate-600'
              }`}
          >
            <Filter className="w-5 h-5" />
            {hasActiveFilters() && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>
      </form>

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

      {/* Active Filters Summary */}
      {hasActiveFilters() && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.priceRange.min && (
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
              Min: ${filters.priceRange.min}
            </span>
          )}
          {filters.priceRange.max && (
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
              Max: ${filters.priceRange.max}
            </span>
          )}
          {filters.category && (
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
              {filters.category}
            </span>
          )}
          {filters.condition && (
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
              {filters.condition}
            </span>
          )}
          {filters.color && (
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
              {filters.color}
            </span>
          )}
          {filters.brand && (
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
              {filters.brand}
            </span>
          )}
          {filters.size && (
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
              Size: {filters.size}
            </span>
          )}
          <button
            onClick={clearFilters}
            className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm hover:bg-red-200 transition"
          >
            Clear All
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Search Error</h3>
              <p className="text-sm text-slate-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {semanticData && (
        <div className="mb-6 bg-gradient-to-r from-[#4a5c3a]/10 to-[#5a6d47]/10 border border-[#9d8566]/30 rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-[#4a5c3a] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-1">AI Search Understanding</h3>
              <p className="text-sm text-slate-700 mb-3">
                {semanticData.enhancedQuery !== searchQuery
                  ? `Searching for: "${semanticData.enhancedQuery}"`
                  : 'Analyzing your search with AI insights'
                }
              </p>

              <div className="flex flex-wrap gap-2">
                {semanticData.keywords.slice(0, 5).map((keyword, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 text-xs bg-white text-slate-700 px-3 py-1.5 rounded-full border border-slate-200">
                    <Tag className="w-3 h-3" />
                    {keyword}
                  </span>
                ))}
                {semanticData.styles.slice(0, 3).map((style, idx) => (
                  <span key={`style-${idx}`} className="text-xs bg-[#9d8566]/20 text-[#4a5c3a] px-3 py-1.5 rounded-full border border-[#9d8566]/30 font-medium">
                    {style}
                  </span>
                ))}
                {semanticData.colors.slice(0, 3).map((color, idx) => (
                  <span key={`color-${idx}`} className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full">
                    {color}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {showCheckCloset && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Check Your Closet</h3>
              <p className="text-sm text-slate-700">
                You have <strong>{similarItemsInCloset} similar items</strong> in your wardrobe. Are you sure you need another?
              </p>
              <button className="text-sm font-medium text-amber-700 hover:text-amber-800 mt-2 underline">
                View similar items
              </button>
            </div>
          </div>
        </div>
      )}

      {isSearching ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <Sparkles className="w-12 h-12 text-slate-400 animate-pulse" />
          </div>
          <p className="text-slate-600 mt-4">Searching across platforms...</p>
        </div>
      ) : filteredResults.length === 0 && searchResults.length === 0 ? (
        <div className="text-center py-20">
          <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Start Your Search
          </h3>
          <p className="text-slate-600 max-w-md mx-auto">
            Use natural language to describe what you're looking for. Try "coastal granddaughter core" or "vintage leather jacket"
          </p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="text-center py-20">
          <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {selectedPlatform === 'For You'
              ? 'Building Your Recommendations'
              : 'No Results Found'
            }
          </h3>
          <p className="text-slate-600 max-w-md mx-auto">
            {selectedPlatform === 'For You'
              ? 'Add more items to your wardrobe to get personalized recommendations based on your style preferences.'
              : `No items found for "${selectedPlatform}". Try selecting "All" platforms or a different platform.`
            }
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-600">
              {selectedPlatform === 'For You' ? (
                <>
                  <strong>{filteredResults.length}</strong> personalized picks based on your wardrobe
                  {hasActiveFilters() && <span className="text-slate-500"> (filtered)</span>}
                </>
              ) : (
                <>
                  {hasActiveFilters() ? 'Filtered' : 'Top'} <strong>{filteredResults.length}</strong> results
                  {selectedPlatform !== 'All' && ` from ${selectedPlatform}`}
                </>
              )}
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Sparkles className="w-4 h-4" />
              <span>
                {selectedPlatform === 'For You'
                  ? 'Based on your style'
                  : 'Sorted by relevance'
                }
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredResults.map((item: SearchResult) => (
              <div
                key={item.id}
                onClick={() => onProductClick(item.id)}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition group cursor-pointer"
              >
                <div className="aspect-[3/4] relative">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      console.error('Failed to load search result image:', item.image_url, 'for item:', item.name);
                      // Fallback image if the original fails to load
                      // Use a deterministic fallback based on the item name length to give some variety
                      const fallbacks = [
                        'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800',
                        'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=800',
                        'https://images.pexels.com/photos/325876/pexels-photo-325876.jpeg?auto=compress&cs=tinysrgb&w=800',
                        'https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=800',
                        'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=800'
                      ];
                      const index = (item.name?.length || 0) % fallbacks.length;
                      (e.target as HTMLImageElement).src = fallbacks[index];
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => toggleFavorite(item, e)}
                      className="bg-white bg-opacity-90 backdrop-blur-sm p-2 rounded-full hover:bg-opacity-100 transition"
                    >
                      <Heart
                        className={`w-4 h-4 ${favoriteItems.has(item.id)
                          ? 'text-red-500 fill-red-500'
                          : 'text-slate-700'
                          }`}
                      />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                    <span className="text-xs text-white font-medium bg-slate-900 bg-opacity-50 px-2 py-1 rounded">
                      {item.platform}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-slate-900 text-sm mb-1 line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="text-lg font-bold text-slate-900">
                    {item.currency === 'SGD' ? 'S$' : '$'}{item.price}
                  </p>
                  <p className="text-xs text-slate-500 mt-1  mb-3">{item.currency}</p>
                  {item.url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(item.url, '_blank');
                      }}
                      className="w-full bg-slate-900 text-white text-xs font-medium py-2 rounded-lg hover:bg-slate-800 transition flex items-center justify-center gap-1.5"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Shop Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Filter Results</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Price Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.priceRange.min}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        priceRange: { ...prev.priceRange, min: e.target.value }
                      }))}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.priceRange.max}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        priceRange: { ...prev.priceRange, max: e.target.value }
                      }))}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  >
                    <option value="">All Categories</option>
                    <option value="tops">Tops</option>
                    <option value="bottoms">Bottoms</option>
                    <option value="dresses">Dresses</option>
                    <option value="outerwear">Outerwear</option>
                    <option value="shoes">Shoes</option>
                    <option value="accessories">Accessories</option>
                    <option value="knitwear">Knitwear</option>
                  </select>
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Condition
                  </label>
                  <select
                    value={filters.condition}
                    onChange={(e) => setFilters(prev => ({ ...prev, condition: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  >
                    <option value="">Any Condition</option>
                    <option value="new">New</option>
                    <option value="like new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="used">Used</option>
                  </select>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Color
                  </label>
                  <select
                    value={filters.color}
                    onChange={(e) => setFilters(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  >
                    <option value="">Any Color</option>
                    <option value="black">Black</option>
                    <option value="white">White</option>
                    <option value="blue">Blue</option>
                    <option value="red">Red</option>
                    <option value="green">Green</option>
                    <option value="yellow">Yellow</option>
                    <option value="pink">Pink</option>
                    <option value="purple">Purple</option>
                    <option value="brown">Brown</option>
                    <option value="gray">Gray</option>
                    <option value="navy">Navy</option>
                    <option value="cream">Cream</option>
                  </select>
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    placeholder="Enter brand name"
                    value={filters.brand}
                    onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  />
                </div>

                {/* Size */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Size
                  </label>
                  <select
                    value={filters.size}
                    onChange={(e) => setFilters(prev => ({ ...prev, size: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  >
                    <option value="">Any Size</option>
                    <option value="xs">XS</option>
                    <option value="s">S</option>
                    <option value="m">M</option>
                    <option value="l">L</option>
                    <option value="xl">XL</option>
                    <option value="xxl">XXL</option>
                    <option value="one size">One Size</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 mt-6 border-t border-slate-200">
                <button
                  onClick={clearFilters}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}







