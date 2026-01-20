'use client';

/**
 * User avatar component with image and initials fallback
 * REQ-5-028: Family member avatars
 */

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface UserAvatarProps {
  /** Display name for generating initials */
  name?: string | null;
  /** Avatar image URL */
  avatarUrl?: string | null;
  /** Size of the avatar */
  size?: AvatarSize;
  /** Additional CSS classes */
  className?: string;
  /** Show border around avatar */
  bordered?: boolean;
}

const SIZE_CONFIG: Record<AvatarSize, { container: string; text: string; pixels: number }> = {
  xs: { container: 'h-6 w-6', text: 'text-xs', pixels: 24 },
  sm: { container: 'h-8 w-8', text: 'text-xs', pixels: 32 },
  md: { container: 'h-10 w-10', text: 'text-sm', pixels: 40 },
  lg: { container: 'h-12 w-12', text: 'text-base', pixels: 48 },
  xl: { container: 'h-16 w-16', text: 'text-lg', pixels: 64 },
};

// Generate a consistent color from a string (name/email)
function stringToColor(str: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

// Generate initials from name
function getInitials(name: string | null | undefined): string {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function UserAvatar({
  name,
  avatarUrl,
  size = 'md',
  className,
  bordered = false,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const initials = useMemo(() => getInitials(name), [name]);
  const bgColor = useMemo(() => stringToColor(name || 'unknown'), [name]);
  const config = SIZE_CONFIG[size];

  const showImage = avatarUrl && !imageError;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-full',
        config.container,
        !showImage && bgColor,
        bordered && 'ring-2 ring-white dark:ring-gray-800',
        className
      )}
    >
      {showImage ? (
        <Image
          src={avatarUrl}
          alt={name || 'User avatar'}
          width={config.pixels}
          height={config.pixels}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className={cn('font-medium text-white', config.text)}>{initials}</span>
      )}
    </div>
  );
}

// Group of avatars with overlap
interface AvatarGroupProps {
  users: Array<{ name?: string | null; avatarUrl?: string | null }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarGroup({ users, max = 3, size = 'sm', className }: AvatarGroupProps) {
  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {displayUsers.map((user, index) => (
        <UserAvatar key={index} name={user.name} avatarUrl={user.avatarUrl} size={size} bordered />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'relative flex items-center justify-center rounded-full',
            'bg-gray-200 dark:bg-gray-700',
            'ring-2 ring-white dark:ring-gray-800',
            SIZE_CONFIG[size].container
          )}
        >
          <span
            className={cn('font-medium text-gray-600 dark:text-gray-300', SIZE_CONFIG[size].text)}
          >
            +{remaining}
          </span>
        </div>
      )}
    </div>
  );
}

export default UserAvatar;
