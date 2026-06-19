import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { User, Phone, Camera } from 'lucide-react';

export default function ProfileSettings() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ full_name: fullName, phone, avatar_url: avatarUrl });
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Avatar preview */}
      <div className="flex flex-col items-center py-4">
        <div className="w-20 h-20 rounded-2xl bg-[#1E3A8A]/10 flex items-center justify-center overflow-hidden mb-3 border-2 border-[#1E3A8A]/20">
          {avatarUrl
            ? <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar" onError={() => setAvatarUrl('')} />
            : <span className="text-[#1E3A8A] font-bold text-2xl">
                {(fullName || user?.phone || 'U')[0].toUpperCase()}
              </span>
          }
        </div>
        <p className="text-gray-400 text-xs">Tap to update avatar URL below</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Profile Photo URL</label>
        <div className="relative">
          <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} type="url"
            placeholder="https://example.com/photo.jpg"
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={fullName} onChange={e => setFullName(e.target.value)} type="text"
            placeholder="Your full name"
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
            placeholder="08012345678"
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]" />
        </div>
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-3.5 rounded-xl font-semibold text-white text-sm disabled:opacity-60 transition-all"
        style={{ background: 'linear-gradient(135deg, #1E3A8A, #2A4FA8)' }}>
        {loading ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  );
}
