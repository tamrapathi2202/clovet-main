import { Upload, Search, ShoppingCart, Sparkles } from 'lucide-react';

type Feature = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: <Upload className="w-8 h-8" />,
    title: 'Wardrobe Upload',
    description: 'Photograph and catalog your existing clothing to unlock personalized recommendations',
  },
  {
    icon: <Search className="w-8 h-8" />,
    title: 'Smart Style Search',
    description: 'Intelligent search across your preferences and wardrobe for perfect matches',
  },
  {
    icon: <ShoppingCart className="w-8 h-8" />,
    title: 'Cross-Platform Discovery',
    description: 'Find secondhand treasures across Depop, Poshmark, Vestiaire, ThredUp and more',
  },
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: 'AI Try-On',
    description: 'Visualize how items look on you before purchasing with virtual try-on',
  },
];

export default function FeaturesSection() {
  return (
    <div className="py-16 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            How Clovet Works
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Four powerful features to transform your fashion journey into a sustainable adventure
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="relative group"
              data-tour-step={`feature-${index + 1}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#8b7355] to-[#a0886d] rounded-3xl transform rotate-3 group-hover:rotate-6 transition-transform duration-300" />

              <div className="relative bg-gradient-to-br from-[#9d8566] to-[#b89a7a] text-white p-6 rounded-3xl shadow-lg transform -rotate-1 group-hover:rotate-0 transition-all duration-300 border-2 border-[#7a6247]">
                <div className="bg-white/20 backdrop-blur-sm w-16 h-16 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>

                <h3 className="text-xl font-bold mb-3 leading-tight">
                  {feature.title}
                </h3>

                <p className="text-white/90 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
