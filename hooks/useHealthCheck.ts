/**
 * useHealthCheck hook - 24/7 reliability monitoring
 *
 * Periodically pings a health endpoint to verify the application
 * is functioning correctly. Triggers a callback when consecutive
 * failures exceed a threshold, allowing the display to auto-recover.
 *
 * REQ-3-015: Automatic recovery from errors for always-on displays
 */

import { useEffect, useRef, useCallback } from 'react';

const DEFAULT_HEALTH_INTERVAL = 60 * 1000; // 1 minute
const DEFAULT_MAX_ERRORS = 5;
const DEFAULT_HEALTH_ENDPOINT = '/api/health';

interface UseHealthCheckOptions {
  /** Health check endpoint URL (default: '/api/health') */
  endpoint?: string;
  /** Milliseconds between health checks (default: 60000 = 1 minute) */
  interval?: number;
  /** Number of consecutive failures before triggering onUnhealthy (default: 5) */
  maxErrors?: number;
  /** Whether health checking is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for monitoring application health and triggering recovery actions.
 *
 * @param onUnhealthy - Callback fired when consecutive errors exceed maxErrors
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function Display() {
 *   useHealthCheck(() => {
 *     // Attempt recovery - reload the page
 *     window.location.reload();
 *   });
 *
 *   return <DisplayContent />;
 * }
 * ```
 */
export function useHealthCheck(onUnhealthy: () => void, options: UseHealthCheckOptions = {}): void {
  const {
    endpoint = DEFAULT_HEALTH_ENDPOINT,
    interval = DEFAULT_HEALTH_INTERVAL,
    maxErrors = DEFAULT_MAX_ERRORS,
    enabled = true,
  } = options;

  const errorCountRef = useRef(0);
  const onUnhealthyRef = useRef(onUnhealthy);

  // Keep callback reference up to date
  useEffect(() => {
    onUnhealthyRef.current = onUnhealthy;
  }, [onUnhealthy]);

  const performHealthCheck = useCallback(async () => {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Health check failed with status: ${response.status}`);
      }

      // Reset error count on successful check
      errorCountRef.current = 0;
    } catch {
      errorCountRef.current += 1;

      if (errorCountRef.current >= maxErrors) {
        // Reset count before triggering callback to prevent rapid-fire calls
        errorCountRef.current = 0;
        onUnhealthyRef.current();
      }
    }
  }, [endpoint, maxErrors]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Perform initial health check
    performHealthCheck();

    // Set up interval for periodic checks
    const intervalId = setInterval(performHealthCheck, interval);

    return () => clearInterval(intervalId);
  }, [enabled, interval, performHealthCheck]);
}

/**
 * Hook that returns health status instead of using a callback.
 * Useful for displaying health status in the UI.
 *
 * @param options - Configuration options
 * @returns Health status object
 */
export function useHealthStatus(options: UseHealthCheckOptions = {}): {
  isHealthy: boolean;
  consecutiveErrors: number;
  lastCheckTime: Date | null;
} {
  const {
    endpoint = DEFAULT_HEALTH_ENDPOINT,
    interval = DEFAULT_HEALTH_INTERVAL,
    enabled = true,
  } = options;

  const errorCountRef = useRef(0);
  const lastCheckRef = useRef<Date | null>(null);
  const isHealthyRef = useRef(true);

  // Use refs for values to avoid re-renders on every check
  // Component can poll these values when needed

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const performCheck = async () => {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Health check failed`);
        }

        errorCountRef.current = 0;
        isHealthyRef.current = true;
      } catch {
        errorCountRef.current += 1;
        isHealthyRef.current = errorCountRef.current < 3; // Consider unhealthy after 3 errors
      }
      lastCheckRef.current = new Date();
    };

    performCheck();
    const intervalId = setInterval(performCheck, interval);

    return () => clearInterval(intervalId);
  }, [enabled, endpoint, interval]);

  return {
    isHealthy: isHealthyRef.current,
    consecutiveErrors: errorCountRef.current,
    lastCheckTime: lastCheckRef.current,
  };
}
