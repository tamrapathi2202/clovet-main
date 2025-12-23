import { Sparkles } from 'lucide-react';

export default function HeroSection() {
  return (
    <div className="relative bg-gradient-to-br from-[#4a5c3a] via-[#5a6d47] to-[#6b7e54] text-white overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-20">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <h1
              className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              <span className="text-[#d4a574]">clovet</span>
            </h1>
            <Sparkles className="w-10 h-10 text-[#d4a574]" />
          </div>

          <p className="text-xl sm:text-2xl font-light mb-8 max-w-3xl mx-auto leading-relaxed text-white/95">
            Clovet encourages sustainable fashion habits by enabling rediscovery of
            shoppers' wardrobe and personalizing secondhand recommendations
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium">
            <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
              ♻️ Sustainable Shopping
            </span>
            <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
              👗 Smart Wardrobe
            </span>
            <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
              🎯 Personalized Picks
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
