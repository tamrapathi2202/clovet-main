import { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Wand2, Loader2, Check, X, Download } from 'lucide-react';
import { api } from '../lib/api';
import { FavoriteItem } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { fileToBase64, downloadGeneratedImage } from '../lib/replicateApi';

type VirtualTryOnProps = {
  onBack: () => void;
  favorites: FavoriteItem[];
};

type Step = 'select-clothes' | 'upload-image' | 'generating' | 'result';

export default function VirtualTryOnView({ onBack, favorites }: VirtualTryOnProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('select-clothes');
  const [selectedItems, setSelectedItems] = useState<FavoriteItem[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [userImageFile, setUserImageFile] = useState<File | null>(null);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [defaultImage, setDefaultImage] = useState<string | null>(null);
  const [useDefaultImage, setUseDefaultImage] = useState(false);

  useEffect(() => {
    loadDefaultImage();
  }, [user]);

  const loadDefaultImage = async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/auth/me');
      if (data?.default_tryon_image) {
        setDefaultImage(data.default_tryon_image);
      }
    } catch (err) {
      console.error('Error loading default image:', err);
    }
  };

  const handleUseDefaultImage = () => {
    if (defaultImage) {
      setUploadedImage(defaultImage);
      setUseDefaultImage(true);
      setCurrentStep('upload-image');
    }
  };

  const handleItemSelect = (item: FavoriteItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(selected => selected.id === item.id);
      if (isSelected) {
        // Deselect the item
        return prev.filter(selected => selected.id !== item.id);
      } else {
        // Select only this item (single selection)
        return [item];
      }
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Image size should be less than 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setUserImageFile(file);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateVirtualTryOn = async () => {
    if (!user || (!userImageFile && !uploadedImage) || selectedItems.length === 0) return;

    setCurrentStep('generating');
    setError(null);

    try {
      // Convert user image to base64 if it's a file, otherwise use the uploadedImage (which might be default image URL)
      let userImageBase64 = '';
      if (userImageFile) {
        userImageBase64 = await fileToBase64(userImageFile);
      } else if (uploadedImage) {
        // If it's a URL (default image), we might need to fetch it or pass it as is depending on API
        // For now assuming the API handles base64, so we need to convert URL to base64 if possible or just pass it
        // But generateTryOnAPI expects base64.
        // If it's a data URL, we can extract base64.
        if (uploadedImage.startsWith('data:')) {
          userImageBase64 = uploadedImage.split(',')[1];
        } else {
          // Fetch the image and convert to base64
          const response = await fetch(uploadedImage);
          const blob = await response.blob();
          userImageBase64 = await fileToBase64(new File([blob], "default.jpg", { type: blob.type }));
        }
      }

      // Prepare clothing items data
      const clothingItems = selectedItems.map(item => ({
        name: item.item_name,
        image_url: item.image_url,
        category: (item.metadata as any)?.category || 'clothing'
      }));

      // Call backend API for virtual try-on
      const response = await api.post('/virtual-tryon', {
        userImageBase64,
        clothingImageUrl: clothingItems[0].image_url,
        clothingName: clothingItems[0].name
      });

      if (response.data.success && response.data.imageUrl) {
        setGeneratedResult(response.data.imageUrl);
        setCurrentStep('result');

        // Save try-on result to database (Stubbed)
        console.log('Saving try-on result not implemented yet');
      } else {
        throw new Error('Failed to generate virtual try-on');
      }

    } catch (err) {
      console.error('Error generating virtual try-on:', err);
      setError('Failed to generate virtual try-on. Please try again.');
      setCurrentStep('upload-image');
    }
  };

  const restart = () => {
    setCurrentStep('select-clothes');
    setSelectedItems([]);
    setUploadedImage(null);
    setUserImageFile(null);
    setGeneratedResult(null);
    setError(null);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {['select-clothes', 'upload-image', 'generating', 'result'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === step
              ? 'bg-violet-600 text-white'
              : index < ['select-clothes', 'upload-image', 'generating', 'result'].indexOf(currentStep)
                ? 'bg-green-500 text-white'
                : 'bg-slate-200 text-slate-500'
              }`}>
              {index < ['select-clothes', 'upload-image', 'generating', 'result'].indexOf(currentStep) ? (
                <Check className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            {index < 3 && (
              <div className={`w-8 h-0.5 ${index < ['select-clothes', 'upload-image', 'generating', 'result'].indexOf(currentStep)
                ? 'bg-green-500'
                : 'bg-slate-200'
                }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSelectClothes = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Clothes for Try-On</h2>
        <p className="text-slate-600">Choose one item from your favorites to try on</p>
        <p className="text-sm text-slate-500 mt-2">{selectedItems.length > 0 ? '1 item selected' : 'No item selected'}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
        {favorites.map((item, index) => (
          <div
            key={item.id || `item-${index}`}
            onClick={() => handleItemSelect(item)}
            className={`relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition cursor-pointer ${selectedItems.some(selected => selected.id === item.id)
              ? 'ring-2 ring-violet-500'
              : ''
              }`}
          >
            <div className="aspect-[3/4] relative">
              <img
                src={item.image_url}
                alt={item.item_name}
                className="w-full h-full object-cover"
              />
              {selectedItems.some(selected => selected.id === item.id) && (
                <div className="absolute inset-0 bg-violet-500 bg-opacity-20 flex items-center justify-center">
                  <div className="bg-violet-500 rounded-full p-2">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                <span className="text-xs text-white font-medium">
                  {item.platform}
                </span>
              </div>
            </div>
            <div className="p-3">
              <h3 className="font-medium text-slate-900 text-sm mb-1 line-clamp-2">
                {item.item_name}
              </h3>
              <p className="text-sm font-bold text-slate-900">
                ${item.price}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => setCurrentStep('upload-image')}
          disabled={selectedItems.length === 0}
          className="px-8 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Upload Your Photo
        </button>
      </div>
    </div>
  );

  const renderUploadImage = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Your Photo</h2>
        <p className="text-slate-600">Upload a clear, full-body photo or use your default photo</p>
      </div>

      {defaultImage && !uploadedImage && (
        <div className="mb-6 text-center">
          <button
            onClick={handleUseDefaultImage}
            className="px-6 py-3 bg-[#9d8566] text-white rounded-xl font-medium hover:bg-[#8b7355] transition inline-flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Use Default Photo
          </button>
        </div>
      )}

      <div className="mb-6">
        {uploadedImage ? (
          <div className="relative">
            <img
              src={uploadedImage}
              alt="Uploaded"
              className="w-full max-w-md mx-auto rounded-lg"
            />
            <button
              onClick={() => {
                setUploadedImage(null);
                setUserImageFile(null);
                setUseDefaultImage(false);
              }}
              className="absolute top-2 right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            {useDefaultImage && (
              <div className="absolute bottom-2 left-2 bg-[#9d8566] text-white text-xs px-3 py-1 rounded-full">
                Default Photo
              </div>
            )}
          </div>
        ) : (
          <label className="block w-full max-w-md mx-auto">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 hover:border-violet-400 transition cursor-pointer">
              <div className="text-center">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 font-medium mb-2">Click to upload your photo</p>
                <p className="text-sm text-slate-500">PNG, JPG up to 10MB</p>
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-center gap-4">
        <button
          onClick={() => setCurrentStep('select-clothes')}
          className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
        >
          Back
        </button>
        <button
          onClick={generateVirtualTryOn}
          disabled={!uploadedImage}
          className="px-8 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Wand2 className="w-4 h-4" />
          Generate Try-On
        </button>
      </div>
    </div>
  );

  const renderGenerating = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-violet-600 mx-auto animate-spin" />
          <Wand2 className="w-8 h-8 text-violet-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-2">Creating Your Virtual Try-On</h2>
      <p className="text-slate-600 mb-8">
        AI is generating a realistic image of how you'll look in your selected outfit...
      </p>

      <div className="space-y-4 text-left max-w-md mx-auto">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Check className="w-4 h-4 text-green-500" />
          Processing your photo with Replicate AI
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
          Analyzing clothing items and fit
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
          Generating virtual try-on image
        </div>
      </div>

      <div className="mt-8 p-4 bg-slate-50 rounded-lg">
        <p className="text-sm text-slate-600">
          🤖 <strong>Powered by Replicate AI (IDM-VTON Model)</strong><br />
          Advanced AI for realistic virtual try-on generation
        </p>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Virtual Try-On Result</h2>
        <p className="text-slate-600">Here's how you look in your selected outfit!</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-semibold text-slate-900 mb-4">Original Photo</h3>
          <img
            src={uploadedImage!}
            alt="Original"
            className="w-full rounded-lg shadow-lg"
          />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 mb-4">Virtual Try-On Result</h3>
          <div className="relative">
            <img
              src={generatedResult!}
              alt="Virtual try-on result"
              className="w-full rounded-lg shadow-lg"
            />
            {generatedResult?.startsWith('data:') && (
              <button
                onClick={() => downloadGeneratedImage(generatedResult!, 'clovet-virtual-tryon.png')}
                className="absolute top-2 right-2 bg-white bg-opacity-90 backdrop-blur-sm p-2 rounded-full hover:bg-opacity-100 transition"
                title="Download image"
              >
                <Download className="w-4 h-4 text-slate-700" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <h3 className="font-semibold text-slate-900 mb-4">Selected Items</h3>
        <div className="flex justify-center gap-4">
          {selectedItems.map((item) => (
            <div key={item.id} className="text-center">
              <img
                src={item.image_url}
                alt={item.item_name}
                className="w-20 h-20 object-cover rounded-lg mb-2 shadow-sm"
              />
              <p className="text-xs text-slate-600 line-clamp-2 max-w-20">{item.item_name}</p>
              <p className="text-xs text-slate-500">${item.price}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={restart}
          className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
        >
          Try Another Outfit
        </button>
        <button
          onClick={() => {
            if (generatedResult?.startsWith('data:')) {
              downloadGeneratedImage(generatedResult, 'clovet-virtual-tryon.png');
            } else {
              alert('Download feature available for AI-generated images only!');
            }
          }}
          className="px-8 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Result
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Favorites
          </button>
          <h1 className="text-xl font-semibold text-slate-900">Virtual Try-On</h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {renderStepIndicator()}

        {currentStep === 'select-clothes' && renderSelectClothes()}
        {currentStep === 'upload-image' && renderUploadImage()}
        {currentStep === 'generating' && renderGenerating()}
        {currentStep === 'result' && renderResult()}
      </div>
    </div>
  );
}