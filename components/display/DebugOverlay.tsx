'use client';

/**
 * Display Debug Overlay
 * REQ-3-032: Hidden debug overlay for troubleshooting
 *
 * Toggle with Ctrl+D or Cmd+D
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wifi, WifiOff, Clock, Database, Cpu } from 'lucide-react';
import type { RealtimeStatus } from './RealtimeProvider';

interface DebugOverlayProps {
  displayId: string;
  householdId: string;
  realtimeStatus?: RealtimeStatus;
  lastUpdated?: string | null;
  eventCount?: number;
  calendarSourceCount?: number;
}

export function DebugOverlay({
  displayId,
  householdId,
  realtimeStatus = 'connecting',
  lastUpdated,
  eventCount = 0,
  calendarSourceCount = 0,
}: DebugOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  }>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // Toggle with Ctrl+D / Cmd+D
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setIsVisible((v) => !v);
      }
      // Also close on Escape
      if (e.key === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    },
    [isVisible]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Update memory info periodically (if available)
  useEffect(() => {
    const updateMemory = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const perf = performance as any;
      if (perf.memory) {
        setMemoryInfo({
          usedJSHeapSize: perf.memory.usedJSHeapSize,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
          jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
        });
      }
    };

    if (isVisible) {
      updateMemory();
      const interval = setInterval(updateMemory, 2000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const formatBytes = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatTimestamp = (iso?: string | null): string => {
    if (!iso) return 'Never';
    const date = new Date(iso);
    return date.toLocaleTimeString();
  };

  const getStatusColor = (status: RealtimeStatus): string => {
    switch (status) {
      case 'connected':
        return 'text-green-400';
      case 'connecting':
        return 'text-yellow-400';
      case 'reconnecting':
        return 'text-orange-400';
      case 'disconnected':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const StatusIcon = realtimeStatus === 'connected' ? Wifi : WifiOff;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="fixed top-4 right-4 z-50 w-80 rounded-lg bg-gray-900/95 p-4 text-sm text-white shadow-xl backdrop-blur"
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Debug Info</h3>
            <button onClick={() => setIsVisible(false)} className="rounded p-1 hover:bg-gray-800">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${getStatusColor(realtimeStatus)}`} />
              <span className="text-gray-400">Realtime:</span>
              <span className={getStatusColor(realtimeStatus)}>{realtimeStatus}</span>
            </div>

            {/* Display & Household */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-gray-500" />
                <span className="text-gray-400">Display:</span>
                <code className="rounded bg-gray-800 px-1 text-xs">{displayId.slice(0, 8)}...</code>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <span className="text-gray-400">Household:</span>
                <code className="rounded bg-gray-800 px-1 text-xs">
                  {householdId.slice(0, 8)}...
                </code>
              </div>
            </div>

            {/* Last Sync */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-gray-400">Last sync:</span>
              <span>{formatTimestamp(lastUpdated)}</span>
            </div>

            {/* Data Counts */}
            <div className="flex gap-4">
              <div>
                <span className="text-gray-400">Events:</span>{' '}
                <span className="font-mono">{eventCount}</span>
              </div>
              <div>
                <span className="text-gray-400">Calendars:</span>{' '}
                <span className="font-mono">{calendarSourceCount}</span>
              </div>
            </div>

            {/* Memory Usage */}
            {memoryInfo.usedJSHeapSize && (
              <div className="border-t border-gray-700 pt-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-400">Memory:</span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 pl-6 text-xs">
                  <div>
                    <span className="text-gray-500">Used:</span>{' '}
                    {formatBytes(memoryInfo.usedJSHeapSize)}
                  </div>
                  <div>
                    <span className="text-gray-500">Total:</span>{' '}
                    {formatBytes(memoryInfo.totalJSHeapSize)}
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Limit:</span>{' '}
                    {formatBytes(memoryInfo.jsHeapSizeLimit)}
                  </div>
                </div>
              </div>
            )}

            {/* Current Time */}
            <div className="border-t border-gray-700 pt-3 text-center text-xs text-gray-500">
              {currentTime.toLocaleString()}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 text-center text-xs text-gray-500">
            Press <kbd className="rounded bg-gray-800 px-1">Ctrl+D</kbd> to close
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
