import React, { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import { UserSummary } from '../../types';

interface UserAvatarProps {
  user?: Partial<UserSummary> | Record<string, any> | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm font-bold',
  lg: 'w-12 h-12 text-base font-bold',
  xl: 'w-24 h-24 text-2xl font-black'
};

const iconSizeMap = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-12 h-12'
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  showBorder = false
}) => {
  const [imageError, setImageError] = useState(false);

  // Authoritative photo resolution supporting all stored schema variations
  const photoUrl =
    user?.avatarUrl ||
    (user as any)?.avatar_url ||
    user?.profilePictureUrl ||
    (user as any)?.profilePhoto ||
    (user as any)?.photoUrl ||
    (user as any)?.photo_url ||
    (user as any)?.image ||
    (user as any)?.picture ||
    '';

  // Crucial: Reset image error state whenever user or photoUrl changes
  useEffect(() => {
    setImageError(false);
  }, [photoUrl]);

  const sizeClasses = sizeMap[size] || sizeMap.md;
  const iconClasses = iconSizeMap[size] || iconSizeMap.md;

  // Generate clean initials (e.g., "UO" from "Ugochukwu Opara")
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const initials = getInitials(user?.fullName || (user as any)?.name || (user as any)?.username);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-2xl overflow-hidden select-none transition-all ${sizeClasses} ${
        showBorder ? 'ring-2 ring-white/20' : ''
      } ${className}`}
    >
      {photoUrl && !imageError ? (
        <img
          src={photoUrl}
          alt={user?.fullName || 'User Avatar'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-tr from-[#FF6B00] to-[#FFA800] text-black flex items-center justify-center font-extrabold shadow-inner">
          {initials ? (
            <span>{initials}</span>
          ) : (
            <UserIcon className={iconClasses} />
          )}
        </div>
      )}
    </div>
  );
};
