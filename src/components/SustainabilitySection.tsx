import { Leaf, Droplets, Recycle, TrendingDown } from 'lucide-react';

type SustainabilityMetric = {
  icon: React.ReactNode;
  value: string;
  label: string;
  description: string;
};

const metrics: SustainabilityMetric[] = [
  {
    icon: <TrendingDown className="w-6 h-6" />,
    value: '2.3 kg',
    label: 'CO₂ Saved',
    description: 'Carbon footprint reduced by choosing secondhand',
  },
  {
    icon: <Droplets className="w-6 h-6" />,
    value: '890 L',
    label: 'Water Conserved',
    description: 'Water saved compared to buying new items',
  },
  {
    icon: <Recycle className="w-6 h-6" />,
    value: '5 items',
    label: 'Waste Diverted',
    description: 'Pieces kept out of landfills this month',
  },
  {
    icon: <Leaf className="w-6 h-6" />,
    value: '$420',
    label: 'Money Saved',
    description: 'Saved compared to retail prices',
  },
];

type SustainabilitySectionProps = {
  onNavigate: (view: 'home' | 'explore' | 'favorites' | 'wardrobe' | 'product' | 'virtual-try-on' | 'profile') => void;
};

export default function SustainabilitySection({ onNavigate }: SustainabilitySectionProps) {
  return (
    <div className="py-16 bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full mb-4 font-semibold text-sm">
            <Leaf className="w-4 h-4" />
            Your Sustainability Impact
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Making a Difference Together
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Every secondhand purchase contributes to a more sustainable future. Here's your positive impact.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-shadow duration-300 border border-green-100"
            >
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4 text-green-700">
                {metric.icon}
              </div>

              <div className="mb-3">
                <p className="text-3xl font-bold text-slate-900 mb-1">
                  {metric.value}
                </p>
                <p className="text-sm font-semibold text-green-700">
                  {metric.label}
                </p>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                {metric.description}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-[#4a5c3a] to-[#5a6d47] rounded-2xl p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">
                Keep Building Your Impact
              </h3>
              <p className="text-white/90">
                Upload more wardrobe items to get even better personalized recommendations and track your sustainability journey.
              </p>
            </div>

            <button  onClick={() => onNavigate('wardrobe')} className="bg-white text-[#4a5c3a] px-8 py-4 rounded-xl font-bold hover:bg-slate-100 transition-all duration-300 shadow-lg hover:scale-105 whitespace-nowrap">
              Upload Wardrobe Items
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-600">
            🌍 Join thousands of conscious shoppers making fashion more sustainable
          </p>
        </div>
      </div>
    </div>
  );
}
