'use client';

/* eslint-disable react-hooks/set-state-in-effect -- Slideshow requires state sync when photos change */

/**
 * Photo Slideshow Component for Display
 * REQ-4-013: Create slideshow component with elegant transitions
 * REQ-4-014: Implement slideshow image preloading
 * REQ-4-016: Implement Ken Burns effect
 * REQ-4-020: Display photo info overlay
 * REQ-4-021: Handle slideshow with no photos
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDisplayUrl } from '@/lib/photos/urls';
import { ImageOff } from 'lucide-react';

export interface SlideshowPhoto {
  id: string;
  storage_path: string;
  filename: string;
  taken_at: string | null;
  album: string | null;
}

export interface SlideshowSettings {
  enabled: boolean;
  interval: number; // seconds
  order: 'random' | 'sequential';
  kenBurnsEnabled: boolean;
  showPhotoInfo: boolean;
}

export interface SlideshowProps {
  photos: SlideshowPhoto[];
  settings: SlideshowSettings;
  onNoPhotos?: () => void;
}

// Ken Burns animation variants - different start positions
const kenBurnsVariants = [
  { scale: [1, 1.08], x: ['0%', '2%'], y: ['0%', '1%'] },
  { scale: [1.08, 1], x: ['2%', '0%'], y: ['1%', '0%'] },
  { scale: [1, 1.1], x: ['0%', '-2%'], y: ['0%', '2%'] },
  { scale: [1.1, 1], x: ['-2%', '0%'], y: ['2%', '0%'] },
  { scale: [1, 1.06], x: ['0%', '1%'], y: ['0%', '-1%'] },
  { scale: [1.06, 1], x: ['1%', '0%'], y: ['-1%', '0%'] },
];

// Fisher-Yates shuffle
function shuffleArray(length: number): number[] {
  const result = Array.from({ length }, (_, i) => i);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getRandomKenBurnsIndex(): number {
  return Math.floor(Math.random() * kenBurnsVariants.length);
}

export function Slideshow({ photos, settings, onNoPhotos }: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayOrder, setDisplayOrder] = useState<number[]>([]);
  const [kenBurnsIndex, setKenBurnsIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const preloadedImages = useRef<Map<string, HTMLImageElement>>(new Map());

  // Initialize display order when photos or order setting changes
  // This is intentional state synchronization when external data (photos) changes
  useEffect(() => {
    if (photos.length === 0) {
      setDisplayOrder([]);
      return;
    }
    if (settings.order === 'random') {
      setDisplayOrder(shuffleArray(photos.length));
    } else {
      setDisplayOrder(Array.from({ length: photos.length }, (_, i) => i));
    }
    setCurrentIndex(0);
    setKenBurnsIndex(getRandomKenBurnsIndex());
  }, [photos.length, settings.order]);

  // Notify when no photos
  useEffect(() => {
    if (photos.length === 0) {
      onNoPhotos?.();
    }
  }, [photos.length, onNoPhotos]);

  // Compute safe current index
  const safeCurrentIndex =
    displayOrder.length > 0 ? Math.min(currentIndex, displayOrder.length - 1) : 0;

  // Preload images callback
  const preloadImages = useCallback(
    (startIndex: number, order: number[]) => {
      if (order.length === 0 || photos.length === 0) return;

      const indicesToPreload: number[] = [];
      for (let i = 0; i < Math.min(3, order.length); i++) {
        const idx = (startIndex + i) % order.length;
        indicesToPreload.push(order[idx]);
      }

      indicesToPreload.forEach((photoIdx) => {
        const photo = photos[photoIdx];
        if (!photo) return;

        const url = getDisplayUrl(photo.storage_path);
        if (preloadedImages.current.has(url)) return;

        const img = new Image();
        img.src = url;
        preloadedImages.current.set(url, img);
      });

      // Clean up old preloaded images (keep only last 5)
      if (preloadedImages.current.size > 5) {
        const keys = Array.from(preloadedImages.current.keys());
        const toDelete = keys.slice(0, keys.length - 5);
        toDelete.forEach((key) => preloadedImages.current.delete(key));
      }
    },
    [photos]
  );

  // Preload images effect
  useEffect(() => {
    preloadImages(safeCurrentIndex, displayOrder);
  }, [safeCurrentIndex, displayOrder, preloadImages]);

  // Auto-advance slideshow
  useEffect(() => {
    if (!settings.enabled || photos.length <= 1 || displayOrder.length === 0) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % displayOrder.length;
        // Reset order if we've gone through all photos
        if (next === 0 && settings.order === 'random') {
          setDisplayOrder(shuffleArray(photos.length));
        }
        // Pick new Ken Burns variant for each slide
        setKenBurnsIndex(getRandomKenBurnsIndex());
        return next;
      });
    }, settings.interval * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [settings.enabled, settings.interval, settings.order, photos.length, displayOrder.length]);

  // Get current photo
  const currentPhotoIndex = displayOrder[safeCurrentIndex];
  const currentPhoto = photos[currentPhotoIndex] ?? null;

  // Get current Ken Burns variant
  const kenBurnsVariant = kenBurnsVariants[kenBurnsIndex];

  // Empty state
  if (photos.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-900">
        <div className="flex flex-col items-center gap-4 text-neutral-400">
          <ImageOff className="h-16 w-16 opacity-50" />
          <p className="display-body text-center">No photos available</p>
          <p className="text-sm opacity-70">Upload photos to start the slideshow</p>
        </div>
      </div>
    );
  }

  if (!currentPhoto) return null;

  const imageUrl = getDisplayUrl(currentPhoto.storage_path);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhoto.id}
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        >
          {settings.kenBurnsEnabled ? (
            <motion.img
              src={imageUrl}
              alt={currentPhoto.filename}
              className="h-full w-full object-contain"
              initial={{
                scale: kenBurnsVariant.scale[0],
                x: kenBurnsVariant.x[0],
                y: kenBurnsVariant.y[0],
              }}
              animate={{
                scale: kenBurnsVariant.scale[1],
                x: kenBurnsVariant.x[1],
                y: kenBurnsVariant.y[1],
              }}
              transition={{
                duration: settings.interval,
                ease: 'linear',
              }}
            />
          ) : (
            <img
              src={imageUrl}
              alt={currentPhoto.filename}
              className="h-full w-full object-contain"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Photo info overlay */}
      {settings.showPhotoInfo && currentPhoto && (
        <AnimatePresence>
          <motion.div
            key={`info-${currentPhoto.id}`}
            className="absolute bottom-6 left-6 rounded-lg bg-black/40 px-4 py-2 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{
              delay: 0.5,
              duration: 0.3,
            }}
          >
            {currentPhoto.taken_at && (
              <p className="text-sm text-white/90">
                {new Date(currentPhoto.taken_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
            {currentPhoto.album && <p className="text-xs text-white/70">{currentPhoto.album}</p>}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Progress indicator (subtle) */}
      <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-white/10">
        <motion.div
          className="h-full bg-white/30"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{
            duration: settings.interval,
            ease: 'linear',
            repeat: Infinity,
          }}
          key={safeCurrentIndex}
        />
      </div>
    </div>
  );
}
