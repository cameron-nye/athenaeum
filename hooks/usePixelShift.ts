/**
 * usePixelShift hook - Burn-in prevention for display mode
 *
 * Subtly shifts the entire display content by a few pixels at regular intervals
 * to prevent OLED/LCD burn-in on wall-mounted displays running 24/7.
 *
 * REQ-3-014: Burn-in prevention for long-running displays
 */

import { useState, useEffect } from 'react';

const MAX_SHIFT = 3; // pixels - subtle enough to not be noticeable
const SHIFT_INTERVAL = 5 * 60 * 1000; // 5 minutes between shifts

interface PixelOffset {
  x: number;
  y: number;
}

/**
 * Hook that provides pixel offset values for burn-in prevention.
 * Use the returned offset to transform the display container.
 *
 * @example
 * ```tsx
 * function Display() {
 *   const offset = usePixelShift();
 *   return (
 *     <div style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
 *       {content}
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns PixelOffset - Current x/y offset values
 */
/**
 * Generates a random pixel offset within the max shift range.
 */
function generateOffset(maxShift: number): PixelOffset {
  return {
    x: Math.round((Math.random() - 0.5) * 2 * maxShift),
    y: Math.round((Math.random() - 0.5) * 2 * maxShift),
  };
}

export function usePixelShift(): PixelOffset {
  // Initialize with a random offset
  const [offset, setOffset] = useState<PixelOffset>(() => generateOffset(MAX_SHIFT));

  useEffect(() => {
    // Update offset at regular intervals
    const interval = setInterval(() => {
      setOffset(generateOffset(MAX_SHIFT));
    }, SHIFT_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return offset;
}

/**
 * Configuration options for usePixelShift
 */
interface UsePixelShiftOptions {
  /** Maximum pixels to shift in any direction (default: 3) */
  maxShift?: number;
  /** Milliseconds between shifts (default: 300000 = 5 minutes) */
  interval?: number;
  /** Whether to enable the shifting (default: true) */
  enabled?: boolean;
}

/**
 * Configurable version of usePixelShift hook.
 *
 * @param options - Configuration options
 * @returns PixelOffset - Current x/y offset values
 */
export function usePixelShiftConfigurable(options: UsePixelShiftOptions = {}): PixelOffset {
  const { maxShift = MAX_SHIFT, interval = SHIFT_INTERVAL, enabled = true } = options;

  // Initialize with offset if enabled, or zero offset if disabled
  const [offset, setOffset] = useState<PixelOffset>(() =>
    enabled ? generateOffset(maxShift) : { x: 0, y: 0 }
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Update offset at regular intervals
    const intervalId = setInterval(() => {
      setOffset(generateOffset(maxShift));
    }, interval);

    return () => clearInterval(intervalId);
  }, [maxShift, interval, enabled]);

  // Return zero offset when disabled, otherwise use the state
  if (!enabled) {
    return { x: 0, y: 0 };
  }

  return offset;
}
