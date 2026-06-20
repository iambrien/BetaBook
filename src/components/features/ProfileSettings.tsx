import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { User, Phone, Camera, Upload, Loader2, Trash2 } from 'lucide-react';

export default function ProfileSettings() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be smaller than 5MB'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;

      // Upload via fetch+blob for best performance
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      setAvatarUrl(publicUrl);
      await updateProfile({ full_name: fullName, phone, avatar_url: publicUrl });
      toast.success('Profile photo updated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUrl('');
    await updateProfile({ full_name: fullName, phone, avatar_url: '' });
    toast.success('Profile photo removed');
  };

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

  const initials = (fullName || user?.email || 'U')[0].toUpperCase();

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar Upload */}
      <div className="flex flex-col items-center py-2">
        <div className="relative group mb-3">
          <div className="w-24 h-24 rounded-2xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center overflow-hidden shadow-sm">
            {uploading ? (
              <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
            ) : avatarUrl ? (
              <img
                src={avatarUrl}
                className="w-full h-full object-cover"
                alt="Profile"
                onError={() => setAvatarUrl('')}
              />
            ) : (
              <span className="text-blue-500 font-bold text-3xl">{initials}</span>
            )}
          </div>

          {/* Upload overlay on hover */}
          {!uploading && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              title="Change photo"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold transition-all active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-gray-400 text-xs mt-2">JPG, PNG or WebP · Max 5MB</p>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            type="text"
            placeholder="Your full name"
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            type="tel"
            placeholder="08012345678"
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Email (read-only) */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
        <input
          value={user?.email || ''}
          disabled
          type="email"
          className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
        />
      </div>

      <button
        type="submit"
        disabled={loading || uploading}
        className="w-full py-3.5 rounded-xl font-semibold text-white text-sm bg-blue-500 hover:bg-blue-600 disabled:opacity-60 transition-all active:scale-[0.98]"
      >
        {loading ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  );
}
