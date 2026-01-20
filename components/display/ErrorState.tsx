'use client';

/**
 * Display Error State Component
 * REQ-3-018: User-friendly error message with retry
 */

import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  autoRetryDelay?: number; // milliseconds, 0 to disable
}

export function ErrorState({ error, onRetry, autoRetryDelay = 30000 }: ErrorStateProps) {
  const [countdown, setCountdown] = useState(
    autoRetryDelay > 0 ? Math.ceil(autoRetryDelay / 1000) : 0
  );
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(() => {
    if (onRetry) {
      setIsRetrying(true);
      onRetry();
      // Reset after short delay (component may unmount if retry succeeds)
      setTimeout(() => setIsRetrying(false), 1000);
    }
  }, [onRetry]);

  // Auto-retry countdown
  useEffect(() => {
    if (autoRetryDelay <= 0 || !onRetry) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleRetry();
          return Math.ceil(autoRetryDelay / 1000);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRetryDelay, onRetry, handleRetry]);

  // Log error for debugging
  useEffect(() => {
    console.error('[Display Error]', error);
  }, [error]);

  return (
    <div className="display-grid bg-background h-full w-full">
      <div className="col-span-2 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <AlertCircle className="text-destructive/70 h-16 w-16" />
          </div>

          <h1 className="display-heading text-foreground mb-4">Something went wrong</h1>

          <p className="display-body text-muted-foreground mb-8">{getUserFriendlyMessage(error)}</p>

          {onRetry && (
            <div className="space-y-4">
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className={`bg-primary text-primary-foreground display-body hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-6 py-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <RefreshCw className={`h-5 w-5 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : 'Retry Now'}
              </button>

              {autoRetryDelay > 0 && (
                <p className="display-small text-muted-foreground">Auto-retrying in {countdown}s</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getUserFriendlyMessage(error: string): string {
  const lowerError = error.toLowerCase();

  if (lowerError.includes('network') || lowerError.includes('fetch')) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }

  if (lowerError.includes('token') || lowerError.includes('auth')) {
    return 'This display needs to be set up again. Please visit the dashboard to reconnect.';
  }

  if (lowerError.includes('not found') || lowerError.includes('404')) {
    return 'The requested data could not be found. Please check your display settings.';
  }

  return 'An unexpected error occurred. The display will automatically try to reconnect.';
}
