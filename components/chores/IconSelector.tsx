'use client';

/**
 * Emoji icon selector for chores
 * REQ-5-021: Create chore icon selector component
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconSelectorProps {
  /** Currently selected icon */
  value?: string | null;
  /** Callback when icon is selected */
  onChange: (icon: string) => void;
  /** Optional class name */
  className?: string;
}

// Common chore-related emojis organized by category
const ICON_CATEGORIES = {
  Cleaning: ['🧹', '🧽', '🪣', '🧴', '🧼', '🚿', '🛁', '🚽', '🪥', '🧺'],
  Kitchen: ['🍽️', '🥣', '🍴', '🥄', '🔪', '🍳', '🥘', '🧊', '🥤', '☕'],
  Laundry: ['👕', '👖', '🧦', '👗', '👔', '🧥', '🛏️', '🧸', '🪆', '🧵'],
  Outdoor: ['🌱', '🌿', '🌳', '🌺', '🪴', '🏡', '🚗', '🏎️', '🗑️', '📮'],
  Pets: ['🐕', '🐈', '🐠', '🐦', '🐹', '🦎', '🦴', '🥫', '🪺', '🧬'],
  General: ['✨', '💫', '⭐', '🌟', '✅', '📋', '📝', '🗓️', '⏰', '🔔'],
  More: ['💪', '🎯', '🏆', '🎉', '❤️', '👍', '🙌', '💯', '🔥', '⚡'],
} as const;

// Flatten all icons for search
const ALL_ICONS = Object.values(ICON_CATEGORIES).flat();

export function IconSelector({ value, onChange, className }: IconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!searchQuery) {
      if (activeCategory) {
        return ICON_CATEGORIES[activeCategory as keyof typeof ICON_CATEGORIES] || [];
      }
      return ALL_ICONS;
    }
    // Simple search - just show all icons that visually match
    // In a real app, you might have emoji keywords to search
    return ALL_ICONS;
  }, [searchQuery, activeCategory]);

  const handleSelect = useCallback(
    (icon: string) => {
      onChange(icon);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onChange]
  );

  const currentIcon = value || '✨';

  return (
    <div className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-xl border-2 text-3xl',
          'transition-all duration-200',
          'hover:scale-105 hover:shadow-md',
          isOpen
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
        )}
      >
        {currentIcon}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute top-full left-0 z-50 mt-2',
                'w-80 rounded-2xl border shadow-xl',
                'bg-white dark:bg-gray-800',
                'border-gray-200 dark:border-gray-700'
              )}
            >
              {/* Search */}
              <div className="border-b border-gray-100 p-3 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search icons..."
                    className={cn(
                      'w-full rounded-lg border py-2 pr-8 pl-9',
                      'border-gray-200 dark:border-gray-600',
                      'bg-gray-50 dark:bg-gray-900',
                      'text-sm text-gray-900 dark:text-white',
                      'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    )}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <X className="h-3 w-3 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Categories */}
              {!searchQuery && (
                <div className="flex gap-1 overflow-x-auto border-b border-gray-100 p-2 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setActiveCategory(null)}
                    className={cn(
                      'flex-shrink-0 rounded-lg px-3 py-1 text-xs font-medium',
                      'transition-colors',
                      activeCategory === null
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                  >
                    All
                  </button>
                  {Object.keys(ICON_CATEGORIES).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={cn(
                        'flex-shrink-0 rounded-lg px-3 py-1 text-xs font-medium',
                        'transition-colors',
                        activeCategory === category
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}

              {/* Icons grid */}
              <div className="max-h-64 overflow-y-auto p-3">
                <div className="grid grid-cols-8 gap-1">
                  {filteredIcons.map((icon, index) => (
                    <motion.button
                      key={`${icon}-${index}`}
                      type="button"
                      onClick={() => handleSelect(icon)}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg text-xl',
                        'transition-colors',
                        value === icon
                          ? 'bg-indigo-100 ring-2 ring-indigo-500 dark:bg-indigo-900/50'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      {icon}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Current selection */}
              {value && (
                <div className="border-t border-gray-100 p-3 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Selected:</span>
                    <span className="text-xl">{value}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default IconSelector;
