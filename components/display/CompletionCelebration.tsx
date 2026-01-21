'use client';

/**
 * CompletionCelebration Component
 * Celebration animation when a chore is completed
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextShimmer } from '@/components/motion-primitives/text-shimmer';
import { SlidingNumber } from '@/components/motion-primitives/sliding-number';

interface CompletionCelebrationProps {
  choreName: string;
  points: number;
  onComplete: () => void;
}

// Confetti particle component
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const randomX = Math.random() * 100 - 50;
  const randomRotation = Math.random() * 720 - 360;

  return (
    <motion.div
      initial={{
        opacity: 1,
        y: 0,
        x: 0,
        rotate: 0,
        scale: 0,
      }}
      animate={{
        opacity: [1, 1, 0],
        y: [0, -150, 400],
        x: [0, randomX, randomX * 2],
        rotate: [0, randomRotation],
        scale: [0, 1, 0.5],
      }}
      transition={{
        duration: 2,
        delay,
        ease: 'easeOut',
      }}
      className="absolute left-1/2 top-1/2"
      style={{
        width: Math.random() * 10 + 5,
        height: Math.random() * 10 + 5,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      }}
    />
  );
}

export function CompletionCelebration({
  choreName,
  points,
  onComplete,
}: CompletionCelebrationProps) {
  const [showContent, setShowContent] = useState(false);
  const [confettiColors] = useState([
    '#f87171', // red
    '#fbbf24', // yellow
    '#34d399', // green
    '#60a5fa', // blue
    '#a78bfa', // purple
    '#f472b6', // pink
    '#fb923c', // orange
  ]);

  useEffect(() => {
    // Show content after initial burst
    const timer = setTimeout(() => setShowContent(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto-close after animation
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/70 backdrop-blur-sm"
    >
      {/* Confetti burst */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <ConfettiParticle
            key={i}
            delay={Math.random() * 0.3}
            color={confettiColors[Math.floor(Math.random() * confettiColors.length)]}
          />
        ))}
      </div>

      {/* Main content */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative z-10 text-center"
          >
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.1 }}
              className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-green-500"
            >
              <motion.svg
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewBox="0 0 24 24"
                className="h-12 w-12 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.path d="M20 6L9 17l-5-5" />
              </motion.svg>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <TextShimmer className="text-3xl font-bold text-white" duration={2}>
                Great job!
              </TextShimmer>

              <div className="mt-2 text-xl text-white/80">{choreName}</div>

              {/* Points */}
              {points > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.4 }}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2"
                >
                  <span className="text-lg font-bold text-white">+</span>
                  <span className="text-2xl font-bold text-white">
                    <SlidingNumber value={points} />
                  </span>
                  <span className="text-lg font-medium text-white">points</span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
