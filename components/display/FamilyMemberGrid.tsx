'use client';

/**
 * FamilyMemberGrid Component
 * Grid of family member avatars for selection
 * Used for chore completion tracking, filtering, and assignment
 */

import { motion } from 'framer-motion';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { GlowEffect } from '@/components/motion-primitives/glow-effect';
import type { HouseholdMember } from './DisplayContext';

interface FamilyMemberGridProps {
  members: HouseholdMember[];
  onSelect: (memberId: string) => void;
  selectedId?: string | null;
  disabled?: boolean;
  size?: 'md' | 'lg';
}

export function FamilyMemberGrid({
  members,
  onSelect,
  selectedId,
  disabled = false,
  size = 'lg',
}: FamilyMemberGridProps) {
  const avatarSize = size === 'lg' ? 80 : 56;
  const containerClass = size === 'lg' ? 'grid-cols-3 gap-6' : 'grid-cols-4 gap-4';

  if (members.length === 0) {
    return (
      <div className="py-8 text-center text-neutral-500">
        No family members found. Add members from the dashboard.
      </div>
    );
  }

  return (
    <div className={`grid ${containerClass}`}>
      {members.map((member, index) => (
        <motion.button
          key={member.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => !disabled && onSelect(member.id)}
          disabled={disabled}
          className={`group relative flex flex-col items-center gap-2 rounded-xl p-3 transition-all ${
            disabled
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700'
          } ${selectedId === member.id ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
        >
          {selectedId === member.id && (
            <GlowEffect
              colors={['#3b82f6', '#60a5fa', '#93c5fd']}
              mode="breathe"
              blur="medium"
              className="absolute inset-0 rounded-xl"
            />
          )}

          <div className="relative">
            {member.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.avatar_url}
                alt={member.display_name || 'User'}
                width={avatarSize}
                height={avatarSize}
                className={`rounded-full object-cover ring-2 ${
                  selectedId === member.id
                    ? 'ring-blue-500'
                    : 'ring-neutral-200 group-hover:ring-blue-300 dark:ring-neutral-600'
                }`}
                style={{ width: avatarSize, height: avatarSize }}
              />
            ) : (
              <UserAvatar
                name={member.display_name}
                avatarUrl={member.avatar_url}
                size={size === 'lg' ? 'xl' : 'lg'}
              />
            )}
          </div>

          <span
            className={`text-center font-medium ${
              size === 'lg' ? 'text-sm' : 'text-xs'
            } ${selectedId === member.id ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300'}`}
          >
            {member.display_name || 'Unknown'}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
