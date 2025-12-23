import { useState, useEffect } from 'react';
import { User, Mail, Calendar, LogOut, Trash2, Upload, Image as ImageIcon, X, Eye, RefreshCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Profile, TryOnResult } from '../lib/types';
import { clearRecommendationCache } from '../lib/wardrobeRecommendations';
import { uploadImage } from '../lib/imageUpload';

export default function ProfileView() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tryOnHistory, setTryOnHistory] = useState<TryOnResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedTryOn, setSelectedTryOn] = useState<TryOnResult | null>(null);
  const [clearingCache, setClearingCache] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadTryOnHistory();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data } = await api.get('/auth/me');
      setProfile(data);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTryOnHistory = async () => {
    // Stub for now as backend doesn't support try-on history yet
    setTryOnHistory([]);
  };

  const handleDefaultImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const { url } = await uploadImage(file);

      if (url) {
        await api.put('/auth/profile', { default_tryon_image: url });
        await loadProfile();
        alert('Default photo saved successfully!');
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDefaultImage = async () => {
    if (!user) return;

    try {
      await api.put('/auth/profile', { default_tryon_image: null });
      setProfile(prev => prev ? { ...prev, default_tryon_image: null } : null);
    } catch (err) {
      console.error('Error removing image:', err);
    }
  };

  const handleDeleteTryOn = async (tryOnId: string) => {
    // Stub
    console.log('Delete try-on not implemented', tryOnId);
  };
  const handleClearRecommendations = async () => {
    if (!user) return;
    if (!confirm('Clear cached recommendations? Fresh recommendations will be generated next time you visit the For You page.')) return;

    setClearingCache(true);
    try {
      await clearRecommendationCache(user.id);
      alert('Recommendations cache cleared! You will get fresh recommendations on your next visit.');
    } catch (err) {
      console.error('Error clearing recommendations:', err);
      alert('Failed to clear recommendations cache.');
    } finally {
      setClearingCache(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-slate-300 border-t-[#9d8566] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Profile</h2>
        <p className="text-slate-600">Manage your account settings and try-on preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#9d8566] to-[#b89a7a] p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-[#9d8566]" />
              </div>
              <div className="text-white">
                <h3 className="text-xl font-bold mb-1">
                  {profile?.email?.split('@')[0] || 'User'}
                </h3>
                <p className="text-white/90 text-sm">Clovet Member</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Mail className="w-5 h-5 text-slate-600" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 mb-1">Email</p>
                <p className="text-sm text-slate-900 font-medium truncate">{profile?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Calendar className="w-5 h-5 text-slate-600" />
              <div className="flex-1">
                <p className="text-xs text-slate-600 mb-1">Member Since</p>
                <p className="text-sm text-slate-900 font-medium">
                  {profile?.created_at ? formatDate(profile.created_at) : 'N/A'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-2">
              <button
                onClick={handleClearRecommendations}
                disabled={clearingCache}
                className="w-full flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCcw className={`w-4 h-4 ${clearingCache ? 'animate-spin' : ''}`} />
                <span className="font-medium">
                  {clearingCache ? 'Clearing...' : 'Clear Recommendations Cache'}
                </span>
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Default Try-On Photo</h3>
              <p className="text-sm text-slate-600 mt-1">
                Set a default photo for virtual try-ons
              </p>
            </div>
          </div>

          {profile?.default_tryon_image ? (
            <div className="relative group">
              <img
                src={profile.default_tryon_image}
                alt="Default try-on"
                className="w-full aspect-[3/4] object-cover rounded-xl"
              />
              <button
                onClick={handleRemoveDefaultImage}
                className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
              <label className="absolute bottom-3 left-3 right-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleDefaultImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl text-center cursor-pointer hover:bg-white transition">
                  <Upload className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-xs font-medium">Change Photo</p>
                </div>
              </label>
            </div>
          ) : (
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleDefaultImageUpload}
                disabled={uploading}
                className="hidden"
              />
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center cursor-pointer hover:border-[#9d8566] hover:bg-slate-50 transition">
                {uploading ? (
                  <div className="w-12 h-12 border-4 border-slate-300 border-t-[#9d8566] rounded-full animate-spin mx-auto mb-4" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                )}
                <p className="text-slate-900 font-medium mb-1">
                  {uploading ? 'Uploading...' : 'Upload Default Photo'}
                </p>
                <p className="text-sm text-slate-600">
                  Click to select a photo for try-ons
                </p>
              </div>
            </label>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Try-On History</h3>
            <p className="text-sm text-slate-600 mt-1">
              {tryOnHistory.length} saved try-on results
            </p>
          </div>
        </div>

        {tryOnHistory.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No try-on results yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Try on items to see them here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {tryOnHistory.map((tryOn) => (
              <div
                key={tryOn.id}
                className="relative group bg-slate-50 rounded-xl overflow-hidden"
              >
                <img
                  src={tryOn.result_image_url}
                  alt={tryOn.item_name}
                  className="w-full aspect-[3/4] object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTryOn(tryOn)}
                      className="p-2 bg-white rounded-full hover:scale-110 transition"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTryOn(tryOn.id)}
                      className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {tryOn.item_name}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {formatDate(tryOn.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTryOn && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTryOn(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedTryOn.item_name}
                </h3>
                <button
                  onClick={() => setSelectedTryOn(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-600 mb-2">Original Item</p>
                  <img
                    src={selectedTryOn.item_image_url}
                    alt="Item"
                    className="w-full aspect-[3/4] object-cover rounded-xl"
                  />
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Your Photo</p>
                  <img
                    src={selectedTryOn.user_image_url}
                    alt="User"
                    className="w-full aspect-[3/4] object-cover rounded-xl"
                  />
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Try-On Result</p>
                  <img
                    src={selectedTryOn.result_image_url}
                    alt="Result"
                    className="w-full aspect-[3/4] object-cover rounded-xl"
                  />
                </div>
              </div>

              {selectedTryOn.platform && (
                <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-600">
                    Platform: <span className="font-medium text-slate-900">{selectedTryOn.platform}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
