import { Heart, Leaf, ShoppingCart } from 'lucide-react';

type ProductCardProps = {
  id: string;
  name: string;
  price: number;
  currency: string;
  platform: string;
  image_url: string;
  url?: string;
  matchScore?: number;
  sustainabilityScore?: number;
  onClick: (id: string) => void;
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
};

export default function ProductCard({
  id,
  name,
  price,
  currency,
  platform,
  image_url,
  url,
  matchScore,
  sustainabilityScore,
  onClick,
  onFavorite,
  isFavorited = false,
}: ProductCardProps) {
  return (
    <div
      onClick={() => onClick(id)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer border border-slate-200 hover:border-[#9d8566]/30"
    >
      <div className="aspect-[3/4] relative overflow-hidden bg-slate-100">
        <img
          src={image_url}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />

        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          {matchScore && (
            <div className="bg-[#4a5c3a] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
            </div>
          )}

          {sustainabilityScore && (
            <div className="bg-green-600 text-white text-xs font-bold px-2 py-1.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1">
              <Leaf className="w-3 h-3" />
              {sustainabilityScore}
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavorite?.(id);
          }}
          className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 shadow-lg ${
            isFavorited
              ? 'bg-red-500 text-white'
              : 'bg-white/90 hover:bg-white text-slate-700'
          }`}
        >
          <Heart
            className={`w-5 h-5 transition-transform ${
              isFavorited ? 'fill-current scale-110' : ''
            }`}
          />
        </button>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
          <span className="text-xs text-white font-semibold bg-slate-900/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
            {platform}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-slate-900 text-base mb-2 line-clamp-2 leading-snug group-hover:text-[#4a5c3a] transition-colors">
          {name}
        </h3>

        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-slate-900">
            ${price}
          </p>
          <p className="text-sm text-slate-500">{currency}</p>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-3">
            Secondhand • Sustainable Choice
          </p>
          {url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(url, '_blank');
              }}
              className="w-full bg-slate-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-slate-800 transition flex items-center justify-center gap-2 group/btn"
            >
              <ShoppingCart className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              Shop Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
