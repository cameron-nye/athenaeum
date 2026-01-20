'use client';

/**
 * Offline Indicator Component
 * REQ-3-019: Shows warning when display loses network connection
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  // Initialize with actual state to avoid flash
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 left-1/2 z-50 -translate-x-1/2"
        >
          <div className="bg-destructive/90 text-destructive-foreground display-small flex items-center gap-3 rounded-full px-4 py-2 shadow-lg">
            <WifiOff className="h-5 w-5" />
            <span>No internet connection</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
