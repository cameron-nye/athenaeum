/**
 * useMemoryMonitor hook - Memory leak prevention for 24/7 displays
 *
 * Monitors JavaScript heap memory usage and triggers a callback when
 * memory usage exceeds a threshold. This helps prevent memory leaks
 * from causing crashes on always-on wall-mounted displays.
 *
 * Note: The Performance.memory API is only available in Chromium-based browsers
 * and is not part of the Web Performance standard. This hook gracefully handles
 * browsers that don't support this API.
 *
 * REQ-3-017: Memory monitoring for long-running displays
 */

import { useEffect, useCallback, useRef, useState } from 'react';

const DEFAULT_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MEMORY_THRESHOLD = 0.85; // 85% of heap limit

/**
 * Extended Performance interface for Chromium's memory API
 */
interface PerformanceMemory {
  /** Total heap size in bytes */
  totalJSHeapSize: number;
  /** Used heap size in bytes */
  usedJSHeapSize: number;
  /** Maximum heap size limit in bytes */
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

interface UseMemoryMonitorOptions {
  /** Memory usage threshold (0-1) before triggering callback (default: 0.85) */
  threshold?: number;
  /** Milliseconds between memory checks (default: 300000 = 5 minutes) */
  interval?: number;
  /** Whether memory monitoring is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Checks if the Performance.memory API is available.
 */
function hasMemoryAPI(): boolean {
  return typeof window !== 'undefined' && 'memory' in performance;
}

/**
 * Gets current memory usage ratio (0-1).
 * Returns null if memory API is not available.
 */
function getMemoryUsageRatio(): number | null {
  if (!hasMemoryAPI()) {
    return null;
  }

  const perfWithMemory = performance as PerformanceWithMemory;
  if (!perfWithMemory.memory) {
    return null;
  }

  const { usedJSHeapSize, jsHeapSizeLimit } = perfWithMemory.memory;
  return usedJSHeapSize / jsHeapSizeLimit;
}

/**
 * Hook for monitoring memory usage and triggering recovery actions.
 *
 * @param onHighMemory - Callback fired when memory exceeds threshold
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function Display() {
 *   useMemoryMonitor(() => {
 *     // Attempt to free memory and reload if needed
 *     console.warn('High memory usage detected, reloading...');
 *     window.location.reload();
 *   });
 *
 *   return <DisplayContent />;
 * }
 * ```
 */
export function useMemoryMonitor(
  onHighMemory: () => void,
  options: UseMemoryMonitorOptions = {}
): void {
  const {
    threshold = DEFAULT_MEMORY_THRESHOLD,
    interval = DEFAULT_CHECK_INTERVAL,
    enabled = true,
  } = options;

  const onHighMemoryRef = useRef(onHighMemory);

  // Keep callback reference up to date
  useEffect(() => {
    onHighMemoryRef.current = onHighMemory;
  }, [onHighMemory]);

  const checkMemory = useCallback(() => {
    const usageRatio = getMemoryUsageRatio();

    if (usageRatio === null) {
      // Memory API not available, skip check
      return;
    }

    if (usageRatio > threshold) {
      onHighMemoryRef.current();
    }
  }, [threshold]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Skip if memory API is not available
    if (!hasMemoryAPI()) {
      return;
    }

    // Initial check
    checkMemory();

    // Set up interval for periodic checks
    const intervalId = setInterval(checkMemory, interval);

    return () => clearInterval(intervalId);
  }, [enabled, interval, checkMemory]);
}

/**
 * Memory statistics interface
 */
interface MemoryStats {
  /** Whether memory API is available */
  isSupported: boolean;
  /** Used heap size in MB (null if not supported) */
  usedMB: number | null;
  /** Total heap size in MB (null if not supported) */
  totalMB: number | null;
  /** Heap limit in MB (null if not supported) */
  limitMB: number | null;
  /** Usage ratio 0-1 (null if not supported) */
  usageRatio: number | null;
}

/**
 * Hook that returns current memory statistics.
 * Useful for displaying memory usage in debug overlays.
 *
 * @param options - Configuration options
 * @returns Memory statistics
 */
export function useMemoryStats(
  options: Pick<UseMemoryMonitorOptions, 'interval' | 'enabled'> = {}
): MemoryStats {
  const { interval = DEFAULT_CHECK_INTERVAL, enabled = true } = options;

  const [stats, setStats] = useState<MemoryStats>(() => {
    // Get initial stats
    if (!enabled || !hasMemoryAPI()) {
      return {
        isSupported: hasMemoryAPI(),
        usedMB: null,
        totalMB: null,
        limitMB: null,
        usageRatio: null,
      };
    }

    const perfWithMemory = performance as PerformanceWithMemory;
    if (!perfWithMemory.memory) {
      return {
        isSupported: false,
        usedMB: null,
        totalMB: null,
        limitMB: null,
        usageRatio: null,
      };
    }

    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = perfWithMemory.memory;
    const bytesToMB = (bytes: number) => Math.round(bytes / (1024 * 1024));

    return {
      isSupported: true,
      usedMB: bytesToMB(usedJSHeapSize),
      totalMB: bytesToMB(totalJSHeapSize),
      limitMB: bytesToMB(jsHeapSizeLimit),
      usageRatio: usedJSHeapSize / jsHeapSizeLimit,
    };
  });

  useEffect(() => {
    if (!enabled || !hasMemoryAPI()) {
      return;
    }

    const updateStats = () => {
      const perfWithMemory = performance as PerformanceWithMemory;
      if (!perfWithMemory.memory) return;

      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = perfWithMemory.memory;
      const bytesToMB = (bytes: number) => Math.round(bytes / (1024 * 1024));

      setStats({
        isSupported: true,
        usedMB: bytesToMB(usedJSHeapSize),
        totalMB: bytesToMB(totalJSHeapSize),
        limitMB: bytesToMB(jsHeapSizeLimit),
        usageRatio: usedJSHeapSize / jsHeapSizeLimit,
      });
    };

    const intervalId = setInterval(updateStats, interval);

    return () => clearInterval(intervalId);
  }, [enabled, interval]);

  return stats;
}
