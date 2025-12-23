import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearch } from '../contexts/SearchContext';
import { generatePersonalizedRecommendations } from '../lib/wardrobeRecommendations';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import SustainabilitySection from '../components/SustainabilitySection';
import ProductCard from '../components/ProductCard';

type RecommendedItem = {
  id: string;
  name: string;
  price: number;
  currency: string;
  platform: string;
  image_url: string;
  url: string;
};

type HomeViewProps = {
  onProductClick: (productId: string) => void;
  onNavigate: (view: 'home' | 'explore' | 'favorites' | 'wardrobe' | 'product' | 'virtual-try-on' | 'profile') => void;
};

export default function HomeView({ onProductClick, onNavigate }: HomeViewProps) {
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { setForYouRecommendations, setSelectedPlatform } = useSearch();

  useEffect(() => {
    if (user) {
      loadPersonalizedContent();
    }
  }, [user]);


  const handleFavoriteToggle = (itemId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(itemId)) {
        newFavorites.delete(itemId);
      } else {
        newFavorites.add(itemId);
      }
      return newFavorites;
    });
  };

  const loadPersonalizedContent = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Generate wardrobe-based recommendations
      console.log('Generating recommendations for user:', user.id);
      const wardrobeRecommendations = await generatePersonalizedRecommendations(user.id);
      
      // Transform to RecommendedItem format
      const transformedRecommendations: RecommendedItem[] = wardrobeRecommendations.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        currency: item.currency,
        platform: item.platform,
        image_url: item.image_url,
        url: item.url
      }));

      setRecommendations(transformedRecommendations);
      setForYouRecommendations(wardrobeRecommendations);
      
      console.log(`Loaded ${transformedRecommendations.length} personalized recommendations`);

    } catch (error) {
      console.error('Error loading personalized content:', error);
      
      // Fallback to mock data
      const fallbackRecommendations: RecommendedItem[] = [
        {
          id: '1',
          name: 'Ralph Lauren Cable Knit Sweater',
          price: 36,
          currency: 'USD',
          platform: 'Depop',
          image_url: 'https://images.pexels.com/photos/794062/pexels-photo-794062.jpeg?auto=compress&cs=tinysrgb&w=800',
          url: '#',
        },
        {
          id: '2',
          name: 'Fred Perry Vintage Tennis Skirt',
          price: 23,
          currency: 'USD',
          platform: 'Poshmark',
          image_url: 'https://images.pexels.com/photos/7679454/pexels-photo-7679454.jpeg?auto=compress&cs=tinysrgb&w=800',
          url: '#',
        },
        {
          id: '3',
          name: 'Levi\'s Vintage 501 Jeans',
          price: 45,
          currency: 'USD',
          platform: 'Carousell',
          image_url: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800',
          url: '#',
        },
        {
          id: '4',
          name: 'Anthropologie Floral Blouse',
          price: 28,
          currency: 'USD',
          platform: 'Depop',
          image_url: 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800',
          url: '#',
        },
        {
          id: '5',
          name: 'Adidas Originals Sneakers',
          price: 55,
          currency: 'USD',
          platform: 'Carousell',
          image_url: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800',
          url: '#',
        },
        {
          id: '6',
          name: 'Zara Wool Blend Coat',
          price: 65,
          currency: 'USD',
          platform: 'Poshmark',
          image_url: 'https://images.pexels.com/photos/1337477/pexels-photo-1337477.jpeg?auto=compress&cs=tinysrgb&w=800',
          url: '#',
        },
        {
          id: '7',
          name: 'Mango Midi Dress',
          price: 32,
          currency: 'USD',
          platform: 'Depop',
          image_url: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=800',
          url: '#',
        },
        {
          id: '8',
          name: 'Nike Air Max Vintage',
          price: 42,
          currency: 'USD',
          platform: 'Carousell',
          image_url: 'https://images.pexels.com/photos/2048548/pexels-photo-2048548.jpeg?auto=compress&cs=tinysrgb&w=800',
          url: '#',
        }
      ];
      
      setRecommendations(fallbackRecommendations);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-[#9d8566] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading your personalized picks...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-tour-step="hero">

      <HeroSection />

      <FeaturesSection />
      <div className="max-w-7xl mx-auto px-4 py-8" data-tour-step="recommendations">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">For You</h2>
          <p className="text-slate-600">
            Personalized picks based on your style and wardrobe
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">Scroll to see more →</span>
          <button 
            onClick={() => {
              setSelectedPlatform('For You');
              onNavigate('explore');
            }} 
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:border-slate-400 transition whitespace-nowrap"
          >
              View All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto pb-4 -mx-4 px-4 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex gap-4" style={{ width: 'max-content', minWidth: '100%' }}>
          {recommendations.map((item, index) => (
            <div key={item.id} className="w-48 sm:w-56 flex-shrink-0">
              <ProductCard
                id={item.id}
                name={item.name}
                price={item.price}
                currency={item.currency}
                platform={item.platform}
                image_url={item.image_url}
                url={item.url}
                matchScore={index < 5 ? 95 - (index * 2) : undefined}
                sustainabilityScore={index < 8 ? 95 - Math.floor(index / 2) : undefined}
                onClick={onProductClick}
                onFavorite={handleFavoriteToggle}
                isFavorited={favorites.has(item.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>

      <SustainabilitySection onNavigate={onNavigate} />

    </div>
  );
}
