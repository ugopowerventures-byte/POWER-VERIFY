import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/apiClient';
import { UserAvatar } from '../../components/common/UserAvatar';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Camera,
  Trash2,
  UploadCloud,
  AlertCircle,
  Lock,
  ArrowRight
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, refreshUser, navigate } = useAuth();
  
  // Profile Details Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile Picture Upload & Preview State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Handle Photo Selection & Compression
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    setPhotoSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg)$/i)) {
      setPhotoError('Only JPG, JPEG, and PNG images are supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Selected image is too large (max 10MB). Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawUrl = event.target?.result as string;
      if (!rawUrl) return;

      // Compress client-side to max 400x400 for snappy avatar rendering
      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setImagePreview(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setImagePreview(rawUrl);
        }
      };
      img.onerror = () => setImagePreview(rawUrl);
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  };

  // Save Selected Profile Picture
  const handleSavePhoto = async () => {
    if (!imagePreview) return;
    try {
      setIsUploadingPhoto(true);
      setPhotoError(null);
      setPhotoSuccess(null);
      await api.post('/auth/profile-picture', { pictureData: imagePreview });
      await refreshUser();
      setImagePreview(null);
      setPhotoSuccess('Profile picture updated successfully!');
      setTimeout(() => setPhotoSuccess(null), 3500);
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to save profile picture.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Cancel Photo Preview
  const handleCancelPreview = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove Profile Picture
  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    try {
      setIsUploadingPhoto(true);
      setPhotoError(null);
      setPhotoSuccess(null);
      await api.delete('/auth/profile-picture');
      await refreshUser();
      setImagePreview(null);
      setPhotoSuccess('Profile picture removed.');
      setTimeout(() => setPhotoSuccess(null), 3500);
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to remove profile picture.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Save General Profile Details
  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError(null);
    try {
      setLoading(true);
      await api.patch('/auth/profile', {
        fullName,
        phone,
        address
      });
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const currentAvatar = imagePreview || user?.avatarUrl;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
          Account Profile & Security
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Manage your personal details, profile avatar picture, and verification transaction authorization preferences.
        </p>
      </div>

      {/* SECTION 1: User Profile Picture */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-extrabold text-gray-950 flex items-center gap-2">
              <Camera className="w-5 h-5 text-orange-600" />
              <span>User Profile Picture</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload a clear JPG or PNG image to personalize your account avatar across the platform.
            </p>
          </div>

          <div className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
            Account Avatar Only • Never Replaces Verification Slips
          </div>
        </div>

        {photoSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{photoSuccess}</span>
          </div>
        )}

        {photoError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{photoError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar Preview */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 rounded-3xl overflow-hidden bg-gradient-to-tr from-amber-500 to-orange-600 border-4 border-white shadow-xl flex items-center justify-center text-white">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={user?.fullName || 'User Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-2">
                  <span className="text-3xl font-black text-black">
                    {user?.fullName?.charAt(0) || 'U'}
                  </span>
                  <span className="text-[9px] font-bold text-black/70 uppercase tracking-wider mt-0.5">
                    No Photo
                  </span>
                </div>
              )}
            </div>

            {imagePreview && (
              <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase shadow-md">
                Preview
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 flex-1 text-center sm:text-left">
            <div>
              <p className="text-sm font-bold text-gray-900">
                {imagePreview ? 'Photo Selected (Pending Save)' : user?.avatarUrl ? 'Custom Profile Picture Active' : 'Default Profile Avatar Active'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Supported formats: <strong className="text-gray-700 font-mono">PNG, JPG, JPEG</strong> (Max 10MB).
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {!imagePreview ? (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{user?.avatarUrl ? 'Change Picture' : 'Upload Picture'}</span>
                  </button>

                  {user?.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isUploadingPhoto}
                      className="px-3.5 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <span>Remove</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSavePhoto}
                    disabled={isUploadingPhoto}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isUploadingPhoto ? 'Saving Picture...' : 'Save Profile Picture'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelPreview}
                    disabled={isUploadingPhoto}
                    className="px-3.5 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs transition-all"
                  >
                    Cancel Preview
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Legal & Account Information Form */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
          <UserAvatar user={user} size="lg" showBorder className="shadow-md shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-gray-950">{user?.fullName}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-xs text-gray-500 font-mono">@{user?.username}</span>
              <span className={`text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm ${
                user?.role === 'MEGA_ADMIN'
                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                  : user?.role === 'SUPER_ADMIN'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : user?.role === 'ADMIN'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : user?.role === 'AGENT'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                ROLE: {(user?.role || 'USER').replace(/_/g, ' ').toUpperCase()}
              </span>
              <span className="text-xs bg-gray-100 text-gray-700 font-bold px-2.5 py-0.5 rounded-full uppercase border border-gray-200">
                STATUS: {user?.status}
              </span>
            </div>
          </div>
        </div>

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Profile successfully updated.</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmitProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1.5">
                Full Legal Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
                />
                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
                />
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1.5">
                Email Address (Permanent)
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1.5">
                Username (Permanent)
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={user?.username || ''}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-not-allowed font-mono"
                />
                <ShieldCheck className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1.5">
              Physical / Business Address
            </label>
            <div className="relative">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 14 Marina Road, Lagos Island, Lagos"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-orange-500"
              />
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-black text-white font-bold text-xs hover:bg-gray-800 transition-colors shadow-sm"
            >
              {loading ? 'Saving Changes...' : 'Update Legal Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
