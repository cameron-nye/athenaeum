'use client';

/**
 * PhotosView Component
 * Photo carousel/slideshow view for the display
 * Future: Integrate with Google Photos API
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, Image } from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  caption?: string;
}

interface PhotosViewProps {
  photos?: Photo[];
  autoPlayInterval?: number; // ms
}

// Placeholder photos for demo
const PLACEHOLDER_PHOTOS: Photo[] = [
  { id: '1', url: '', caption: 'Connect Google Photos to see your family photos here' },
];

export function PhotosView({ photos = PLACEHOLDER_PHOTOS, autoPlayInterval = 10000 }: PhotosViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [direction, setDirection] = useState(0);

  const hasPhotos = photos.length > 0 && photos[0].url !== '';

  const goToNext = useCallback(() => {
    if (!hasPhotos) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length, hasPhotos]);

  const goToPrev = useCallback(() => {
    if (!hasPhotos) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length, hasPhotos]);

  // Auto-advance
  useEffect(() => {
    if (!isPlaying || !hasPhotos) return;

    const timer = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(timer);
  }, [isPlaying, autoPlayInterval, goToNext, hasPhotos]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  if (!hasPhotos) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 pb-24">
        <div className="rounded-2xl bg-neutral-100 p-12 text-center dark:bg-neutral-800">
          <Image className="mx-auto mb-4 h-16 w-16 text-neutral-400" />
          <h2 className="mb-2 text-2xl font-semibold">No Photos Yet</h2>
          <p className="max-w-md text-neutral-600 dark:text-neutral-400">
            Connect your Google Photos library from the dashboard to display your family photos here
            as a slideshow.
          </p>
        </div>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-black pb-24"
      onClick={() => setIsPlaying((p) => !p)}
    >
      {/* Photo carousel */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentPhoto.url}
            alt={currentPhoto.caption || `Photo ${currentIndex + 1}`}
            className="max-h-full max-w-full object-contain"
          />
        </motion.div>
      </AnimatePresence>

      {/* Caption overlay */}
      {currentPhoto.caption && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-32 left-0 right-0 text-center"
        >
          <span className="inline-block rounded-lg bg-black/60 px-4 py-2 text-lg text-white backdrop-blur-sm">
            {currentPhoto.caption}
          </span>
        </motion.div>
      )}

      {/* Controls overlay */}
      <div className="absolute inset-x-0 bottom-28 flex items-center justify-center gap-6">
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsPlaying((p) => !p);
          }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/30 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6" />}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Dots indicator */}
      <div className="absolute inset-x-0 bottom-20 flex justify-center gap-2">
        {photos.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              setDirection(idx > currentIndex ? 1 : -1);
              setCurrentIndex(idx);
            }}
            className={`h-2 rounded-full transition-all ${
              idx === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
