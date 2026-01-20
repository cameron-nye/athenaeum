'use client';

/**
 * Color picker component for calendar display color.
 * REQ-2-026: Create calendar color picker component
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Predefined color palette for calendars.
 * These colors are designed to be visually distinct and accessible.
 */
export const CALENDAR_COLORS = [
  { name: 'Red', value: '#DC2626' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Amber', value: '#D97706' },
  { name: 'Yellow', value: '#CA8A04' },
  { name: 'Lime', value: '#65A30D' },
  { name: 'Green', value: '#16A34A' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Teal', value: '#0D9488' },
  { name: 'Cyan', value: '#0891B2' },
  { name: 'Sky', value: '#0284C7' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Violet', value: '#7C3AED' },
  { name: 'Purple', value: '#9333EA' },
  { name: 'Fuchsia', value: '#C026D3' },
  { name: 'Pink', value: '#DB2777' },
];

interface ColorPickerProps {
  /** Currently selected color */
  value: string | null;
  /** Callback when color is selected */
  onChange: (color: string) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Color picker component for selecting calendar display colors.
 * Displays a grid of predefined colors with the current selection highlighted.
 */
export function ColorPicker({ value, onChange, disabled = false, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentColor = value ?? CALENDAR_COLORS[0].value;

  const handleColorSelect = (color: string) => {
    onChange(color);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Trigger button showing current color */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2',
          'border-border bg-background',
          'hover:bg-accent transition-colors',
          'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        aria-label="Select calendar color"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span
          className="h-5 w-5 rounded-full border border-black/10"
          style={{ backgroundColor: currentColor }}
          aria-hidden="true"
        />
        <span className="text-sm">Color</span>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close on click outside */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Color grid */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute top-full left-0 z-50 mt-2',
                'bg-popover border-border rounded-lg border p-3 shadow-lg',
                'min-w-[200px]'
              )}
              role="listbox"
              aria-label="Calendar colors"
            >
              <div className="grid grid-cols-4 gap-2">
                {CALENDAR_COLORS.map((color) => {
                  const isSelected = color.value.toLowerCase() === currentColor.toLowerCase();
                  return (
                    <motion.button
                      key={color.value}
                      type="button"
                      onClick={() => handleColorSelect(color.value)}
                      className={cn(
                        'relative h-8 w-8 rounded-full',
                        'border-2 transition-all',
                        'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
                        isSelected
                          ? 'scale-110 border-black/30'
                          : 'border-transparent hover:scale-110'
                      )}
                      style={{ backgroundColor: color.value }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      role="option"
                      aria-selected={isSelected}
                      aria-label={color.name}
                    >
                      {isSelected && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <Check className="h-4 w-4 text-white drop-shadow-md" />
                        </motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ColorPicker;
