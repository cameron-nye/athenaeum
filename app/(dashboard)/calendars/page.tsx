'use client';

/**
 * Calendars list page showing all connected calendar sources.
 * REQ-2-013: Create calendars list page
 */

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Plus,
  RefreshCw,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarSource {
  id: string;
  name: string;
  color: string | null;
  provider: 'google' | 'ical';
  enabled: boolean;
  last_synced_at: string | null;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * Formats the last synced time in a human-readable way.
 */
function formatLastSynced(date: string | null): string {
  if (!date) return 'Never synced';

  const now = new Date();
  const synced = new Date(date);
  const diffMs = now.getTime() - synced.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return synced.toLocaleDateString();
}

/**
 * Provider badge component.
 */
function ProviderBadge({ provider }: { provider: 'google' | 'ical' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        provider === 'google' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
      )}
    >
      {provider === 'google' ? 'Google' : 'iCal'}
    </span>
  );
}

/**
 * Sync status indicator component.
 */
function SyncStatusIndicator({ status }: { status: SyncStatus }) {
  switch (status) {
    case 'syncing':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'success':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
}

/**
 * Loading skeleton for calendar list.
 */
function CalendarListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="border-border flex animate-pulse items-center gap-4 rounded-lg border p-4"
        >
          <div className="bg-muted h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="bg-muted h-4 w-32 rounded" />
            <div className="bg-muted h-3 w-24 rounded" />
          </div>
          <div className="bg-muted h-6 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Individual calendar card component.
 */
function CalendarCard({
  calendar,
  syncStatus,
  onToggle,
  onSync,
  onDelete,
  index,
}: {
  calendar: CalendarSource;
  syncStatus: SyncStatus;
  onToggle: () => void;
  onSync: () => void;
  onDelete: () => void;
  index: number;
}) {
  const color = calendar.color ?? '#6B7280';
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to disconnect "${calendar.name}"?`)) {
      return;
    }
    setIsDeleting(true);
    onDelete();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'border-border flex items-center gap-4 rounded-lg border p-4',
        'hover:bg-accent/30 transition-colors'
      )}
    >
      {/* Calendar color indicator */}
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: color + '20' }}
      >
        <Calendar className="h-5 w-5" style={{ color }} />
      </div>

      {/* Calendar info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium">{calendar.name}</h3>
          <ProviderBadge provider={calendar.provider} />
          <SyncStatusIndicator status={syncStatus} />
        </div>
        <div className="text-muted-foreground flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3" />
          <span>{formatLastSynced(calendar.last_synced_at)}</span>
        </div>
      </div>

      {/* Toggle switch */}
      <button
        onClick={onToggle}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
          calendar.enabled ? 'bg-primary' : 'bg-muted'
        )}
        aria-label={calendar.enabled ? 'Disable calendar' : 'Enable calendar'}
      >
        <motion.span
          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow"
          animate={{ x: calendar.enabled ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>

      {/* Sync button */}
      <button
        onClick={onSync}
        disabled={syncStatus === 'syncing'}
        className={cn(
          'rounded-lg p-2',
          'hover:bg-accent transition-colors',
          'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        aria-label="Sync calendar"
      >
        <RefreshCw className={cn('h-5 w-5', syncStatus === 'syncing' && 'animate-spin')} />
      </button>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className={cn(
          'rounded-lg p-2',
          'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
          'transition-colors',
          'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        aria-label="Disconnect calendar"
      >
        {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
      </button>
    </motion.div>
  );
}

/**
 * Error alert component.
 */
function ErrorAlert({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-destructive/10 text-destructive mb-6 flex items-center justify-between rounded-lg p-4"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <span>{message}</span>
      </div>
      <button onClick={onDismiss} className="hover:bg-destructive/20 rounded p-1 transition-colors">
        &times;
      </button>
    </motion.div>
  );
}

/**
 * Component that handles URL error params.
 * Needs to be wrapped in Suspense as it uses useSearchParams.
 */
function ErrorParamHandler({ onError }: { onError: (error: string) => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      const errorMessages: Record<string, string> = {
        oauth_denied: 'Calendar access was denied',
        invalid_callback: 'Invalid OAuth callback',
        invalid_state: 'Invalid security token',
        csrf_failed: 'Security verification failed',
        no_refresh_token: 'Could not get calendar access token',
        no_household: 'No household found for your account',
        no_calendars: 'No calendars found in your account',
        db_error: 'Failed to save calendar connection',
        callback_failed: 'Calendar connection failed',
      };
      onError(errorMessages[urlError] ?? 'An error occurred');
      // Clear error from URL
      router.replace('/calendars', { scroll: false });
    }
  }, [searchParams, router, onError]);

  return null;
}

/**
 * Calendars list page component.
 */
export default function CalendarsPage() {
  const router = useRouter();
  const [calendars, setCalendars] = useState<CalendarSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({});

  const handleUrlError = useCallback((err: string) => {
    setError(err);
  }, []);

  // Fetch calendars
  const fetchCalendars = useCallback(async () => {
    try {
      const response = await fetch('/api/calendars/sources?all=true');
      if (!response.ok) {
        throw new Error('Failed to fetch calendars');
      }
      const data = await response.json();
      setCalendars(data.sources ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendars');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  const handleToggle = async (calendar: CalendarSource) => {
    // Optimistic update
    setCalendars((prev) =>
      prev.map((c) => (c.id === calendar.id ? { ...c, enabled: !c.enabled } : c))
    );

    try {
      const response = await fetch('/api/calendars/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabledIds: calendars
            .filter((c) => (c.id === calendar.id ? !c.enabled : c.enabled))
            .map((c) => c.id),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update calendar');
      }
    } catch {
      // Revert on failure
      setCalendars((prev) =>
        prev.map((c) => (c.id === calendar.id ? { ...c, enabled: calendar.enabled } : c))
      );
      setError('Failed to update calendar');
    }
  };

  const handleSync = async (calendar: CalendarSource) => {
    setSyncStatuses((prev) => ({ ...prev, [calendar.id]: 'syncing' }));

    try {
      const response = await fetch('/api/calendars/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendar_source_id: calendar.id }),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      setSyncStatuses((prev) => ({ ...prev, [calendar.id]: 'success' }));

      // Refresh calendar data to get updated last_synced_at
      fetchCalendars();

      // Clear success status after 3 seconds
      setTimeout(() => {
        setSyncStatuses((prev) => ({ ...prev, [calendar.id]: 'idle' }));
      }, 3000);
    } catch {
      setSyncStatuses((prev) => ({ ...prev, [calendar.id]: 'error' }));

      // Clear error status after 5 seconds
      setTimeout(() => {
        setSyncStatuses((prev) => ({ ...prev, [calendar.id]: 'idle' }));
      }, 5000);
    }
  };

  const handleDelete = async (calendar: CalendarSource) => {
    try {
      const response = await fetch(`/api/calendars/sources/${calendar.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect calendar');
      }

      // Remove from local state
      setCalendars((prev) => prev.filter((c) => c.id !== calendar.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect calendar');
    }
  };

  const handleAddCalendar = () => {
    // Redirect to Google OAuth initiation
    window.location.href = '/api/google/auth';
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Handle URL error params */}
      <Suspense fallback={null}>
        <ErrorParamHandler onError={handleUrlError} />
      </Suspense>

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendars</h1>
          <p className="text-muted-foreground mt-1">Manage your connected calendar sources</p>
        </div>
        <motion.button
          onClick={handleAddCalendar}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 font-medium',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none'
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="h-5 w-5" />
          Add Calendar
        </motion.button>
      </div>

      {/* Error alert */}
      <AnimatePresence>
        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      </AnimatePresence>

      {/* Calendar list */}
      {isLoading ? (
        <CalendarListSkeleton />
      ) : calendars.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-border rounded-lg border border-dashed py-16 text-center"
        >
          <Calendar className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h3 className="mb-2 font-medium">No calendars connected</h3>
          <p className="text-muted-foreground mb-6 text-sm">
            Connect a Google Calendar to get started
          </p>
          <button
            onClick={handleAddCalendar}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors'
            )}
          >
            <Plus className="h-5 w-5" />
            Add Calendar
          </button>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {calendars.map((calendar, index) => (
              <CalendarCard
                key={calendar.id}
                calendar={calendar}
                syncStatus={syncStatuses[calendar.id] ?? 'idle'}
                onToggle={() => handleToggle(calendar)}
                onSync={() => handleSync(calendar)}
                onDelete={() => handleDelete(calendar)}
                index={index}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* View calendar link */}
      {calendars.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 text-center">
          <button
            onClick={() => router.push('/calendars/view')}
            className={cn(
              'text-primary hover:text-primary/80 font-medium',
              'transition-colors hover:underline'
            )}
          >
            View Calendar →
          </button>
        </motion.div>
      )}
    </div>
  );
}
