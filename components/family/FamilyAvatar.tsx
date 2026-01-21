'use client';

/**
 * Family member avatar component with selection state and touch-friendly sizes.
 * Designed for the Skylight-style display interface.
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { FamilyMember } from '@/lib/types/family';

export interface FamilyAvatarProps {
  /** Family member data */
  member: FamilyMember;
  /** Avatar size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the avatar is selected (shows ring) */
  selected?: boolean;
  /** Click handler - if provided, renders as interactive button */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14', // 56px - touch-friendly
} as const;

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
} as const;

/**
 * Get initials from a name (first 2 characters or first letters of first/last name)
 */
function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function FamilyAvatar({
  member,
  size = 'md',
  selected = false,
  onClick,
  className,
}: FamilyAvatarProps) {
  const initials = getInitials(member.name);
  const isInteractive = typeof onClick === 'function';

  const avatarContent = (
    <Avatar className={sizeClasses[size]}>
      {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
      <AvatarFallback
        style={{ backgroundColor: member.color }}
        className={cn('font-medium text-white', textSizeClasses[size])}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Select ${member.name}`}
        aria-pressed={selected}
        className={cn(
          'focus-visible:ring-ring rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          selected && 'ring-primary ring-2 ring-offset-2',
          'cursor-pointer hover:scale-105',
          className
        )}
      >
        {avatarContent}
      </button>
    );
  }

  return (
    <div className={cn('rounded-full', selected && 'ring-primary ring-2 ring-offset-2', className)}>
      {avatarContent}
    </div>
  );
}

export default FamilyAvatar;
