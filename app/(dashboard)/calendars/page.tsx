'use client';

/**
 * Calendars list page showing all connected calendar sources.
 * REQ-2-013: Create calendars list page
 */

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import {
  Calendar,
  Plus,
  RefreshCw,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoutButton } from '@/components/auth/LogoutButton';

interface CalendarSource {
  id: string;
  name: string;
  color: string | null;
  provider: 'google' | 'ical';
  enabled: boolean;
  last_synced_at: string | null;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

// Zen-inspired animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 15,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    x: -30,
    scale: 0.95,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const floatVariants = {
  initial: { y: 0 },
  animate: {
    y: [-2, 2, -2],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};

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
 * Provider badge component with zen styling.
 */
function ProviderBadge({ provider }: { provider: 'google' | 'ical' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        'transition-zen',
        provider === 'google'
          ? 'bg-[oklch(0.92_0.03_220)] text-[oklch(0.4_0.1_220)]'
          : 'bg-secondary text-secondary-foreground'
      )}
    >
      {provider === 'google' ? 'Google' : 'iCal'}
    </span>
  );
}

/**
 * Sync status indicator with smooth animations.
 */
function SyncStatusIndicator({ status }: { status: SyncStatus }) {
  return (
    <AnimatePresence mode="wait">
      {status === 'syncing' && (
        <motion.div
          key="syncing"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2 }}
        >
          <Loader2 className="text-primary h-4 w-4 animate-spin" />
        </motion.div>
      )}
      {status === 'success' && (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring' as const, stiffness: 300, damping: 20 }}
        >
          <Check className="h-4 w-4 text-[oklch(0.6_0.15_150)]" />
        </motion.div>
      )}
      {status === 'error' && (
        <motion.div
          key="error"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2 }}
        >
          <AlertCircle className="text-destructive h-4 w-4" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Loading skeleton with zen-inspired shimmer.
 */
function CalendarListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
          className={cn(
            'flex items-center gap-4 rounded-2xl p-5',
            'bg-card shadow-zen',
            'relative overflow-hidden'
          )}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ translateX: ['100%', '-100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: i * 0.2 }}
          />
          <div className="bg-muted h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="bg-muted h-4 w-36 rounded-lg" />
            <div className="bg-muted h-3 w-24 rounded-lg" />
          </div>
          <div className="bg-muted h-7 w-14 rounded-full" />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Individual calendar card with zen styling and fluid animations.
 */
function CalendarCard({
  calendar,
  syncStatus,
  onToggle,
  onSync,
  onDelete,
}: {
  calendar: CalendarSource;
  syncStatus: SyncStatus;
  onToggle: () => void;
  onSync: () => void;
  onDelete: () => void;
}) {
  const color = calendar.color ?? '#6B7280';
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to disconnect "${calendar.name}"?`)) {
      return;
    }
    setIsDeleting(true);
    onDelete();
  };

  return (
    <motion.div
      variants={itemVariants}
      layout
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        'group relative flex items-center gap-4 rounded-2xl p-5',
        'bg-card shadow-zen',
        'transition-zen hover:shadow-zen-lg',
        'hover:border-primary/10 border border-transparent'
      )}
    >
      {/* Subtle glow on hover */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0"
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: `radial-gradient(circle at 30% 50%, ${color}15 0%, transparent 70%)`,
        }}
      />

      {/* Calendar color indicator with float animation */}
      <motion.div
        variants={floatVariants}
        initial="initial"
        animate={calendar.enabled ? 'animate' : 'initial'}
        className="relative flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: color + '15' }}
      >
        <Calendar className="transition-zen h-6 w-6" style={{ color }} />
        {calendar.enabled && (
          <motion.div
            className="absolute -top-1 -right-1 h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Calendar info */}
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <h3 className="truncate text-base font-medium">{calendar.name}</h3>
          <ProviderBadge provider={calendar.provider} />
          <SyncStatusIndicator status={syncStatus} />
        </div>
        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatLastSynced(calendar.last_synced_at)}</span>
        </div>
      </div>

      {/* Toggle switch with smooth animation */}
      <motion.button
        onClick={onToggle}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'transition-zen relative h-7 w-13 rounded-full',
          'focus-zen',
          calendar.enabled ? 'bg-primary' : 'bg-muted'
        )}
        style={{ width: '52px' }}
        aria-label={calendar.enabled ? 'Disable calendar' : 'Enable calendar'}
      >
        <motion.span
          className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-md"
          animate={{ x: calendar.enabled ? 24 : 0 }}
          transition={{ type: 'spring' as const, stiffness: 400, damping: 25 }}
        />
      </motion.button>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <motion.button
          onClick={onSync}
          disabled={syncStatus === 'syncing'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'rounded-xl p-2.5',
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            'transition-zen focus-zen',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          aria-label="Sync calendar"
        >
          <RefreshCw className={cn('h-5 w-5', syncStatus === 'syncing' && 'animate-spin')} />
        </motion.button>

        <motion.button
          onClick={handleDelete}
          disabled={isDeleting}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'rounded-xl p-2.5',
            'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
            'transition-zen focus-zen',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          aria-label="Disconnect calendar"
        >
          {isDeleting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Trash2 className="h-5 w-5" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

/**
 * Error alert with zen styling.
 */
function ErrorAlert({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ type: 'spring' as const, stiffness: 200, damping: 20 }}
      className={cn(
        'mb-6 flex items-center justify-between rounded-2xl p-4',
        'bg-destructive/10 text-destructive',
        'border-destructive/20 border'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="bg-destructive/20 rounded-full p-2">
          <AlertCircle className="h-4 w-4" />
        </div>
        <span className="font-medium">{message}</span>
      </div>
      <motion.button
        onClick={onDismiss}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="transition-zen hover:bg-destructive/20 rounded-lg p-1.5"
      >
        <span className="sr-only">Dismiss</span>
        <span aria-hidden>&times;</span>
      </motion.button>
    </motion.div>
  );
}

/**
 * Empty state with zen illustration.
 */
function EmptyState({ onAddCalendar }: { onAddCalendar: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn('relative overflow-hidden rounded-3xl py-20 text-center', 'bg-card shadow-zen')}
    >
      {/* Decorative background circles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="bg-primary/5 absolute -top-20 -left-20 h-64 w-64 rounded-full"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="bg-accent/10 absolute -right-32 -bottom-32 h-96 w-96 rounded-full"
          animate={{ scale: [1, 1.05, 1], rotate: [0, -3, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <motion.div variants={floatVariants} initial="initial" animate="animate" className="relative">
        <div className="bg-primary/10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
          <Calendar className="text-primary h-10 w-10" />
        </div>
      </motion.div>

      <h3 className="relative mb-2 text-xl font-semibold">No calendars connected</h3>
      <p className="text-muted-foreground relative mb-8 text-sm">
        Connect a Google Calendar to begin your journey
      </p>

      <motion.button
        onClick={onAddCalendar}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'relative inline-flex items-center gap-2 rounded-xl px-6 py-3',
          'bg-primary text-primary-foreground font-medium',
          'shadow-zen hover:shadow-zen-lg',
          'transition-zen focus-zen'
        )}
      >
        <Plus className="h-5 w-5" />
        Add Calendar
      </motion.button>
    </motion.div>
  );
}

/**
 * Component that handles URL error params.
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
      router.replace('/calendars', { scroll: false });
    }
  }, [searchParams, router, onError]);

  return null;
}

// SWR fetcher function
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch calendars');
  }
  const data = await response.json();
  return data.sources ?? [];
};

/**
 * Calendars list page component.
 */
export default function CalendarsPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({});

  const {
    data: calendars = [],
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<CalendarSource[]>('/api/calendars/sources?all=true', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const handleUrlError = useCallback((err: string) => {
    setError(err);
  }, []);

  useEffect(() => {
    if (swrError) {
      setError(swrError.message);
    }
  }, [swrError]);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((id) => clearTimeout(id));
      timeoutRefs.current.clear();
    };
  }, []);

  const handleToggle = useCallback(
    async (calendar: CalendarSource) => {
      const optimisticData = calendars.map((c) =>
        c.id === calendar.id ? { ...c, enabled: !c.enabled } : c
      );

      try {
        await mutate(
          async () => {
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

            return optimisticData;
          },
          {
            optimisticData,
            rollbackOnError: true,
            revalidate: false,
          }
        );
      } catch {
        setError('Failed to update calendar');
      }
    },
    [calendars, mutate]
  );

  const handleSync = useCallback(
    async (calendar: CalendarSource) => {
      const existingTimeout = timeoutRefs.current.get(calendar.id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        timeoutRefs.current.delete(calendar.id);
      }

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
        mutate();

        const successTimeout = setTimeout(() => {
          setSyncStatuses((prev) => ({ ...prev, [calendar.id]: 'idle' }));
          timeoutRefs.current.delete(calendar.id);
        }, 3000);
        timeoutRefs.current.set(calendar.id, successTimeout);
      } catch {
        setSyncStatuses((prev) => ({ ...prev, [calendar.id]: 'error' }));

        const errorTimeout = setTimeout(() => {
          setSyncStatuses((prev) => ({ ...prev, [calendar.id]: 'idle' }));
          timeoutRefs.current.delete(calendar.id);
        }, 5000);
        timeoutRefs.current.set(calendar.id, errorTimeout);
      }
    },
    [mutate]
  );

  const handleDelete = useCallback(
    async (calendar: CalendarSource) => {
      const optimisticData = calendars.filter((c) => c.id !== calendar.id);

      try {
        await mutate(
          async () => {
            const response = await fetch(`/api/calendars/sources/${calendar.id}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              throw new Error('Failed to disconnect calendar');
            }

            return optimisticData;
          },
          {
            optimisticData,
            rollbackOnError: true,
            revalidate: false,
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to disconnect calendar');
      }
    },
    [calendars, mutate]
  );

  const handleAddCalendar = useCallback(() => {
    window.location.href = '/api/google/auth';
  }, []);

  return (
    <div className="bg-zen-gradient texture-noise min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Handle URL error params */}
        <Suspense fallback={null}>
          <ErrorParamHandler onError={handleUrlError} />
        </Suspense>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 flex items-center justify-between"
        >
          <div>
            <motion.h1
              className="text-3xl font-bold tracking-tight"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              Calendars
            </motion.h1>
            <motion.p
              className="text-muted-foreground mt-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Manage your connected calendar sources
            </motion.p>
          </div>
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <LogoutButton />
            <motion.button
              onClick={handleAddCalendar}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium',
                'bg-primary text-primary-foreground',
                'shadow-zen hover:shadow-zen-lg',
                'transition-zen focus-zen'
              )}
            >
              <Sparkles className="h-4 w-4" />
              Add Calendar
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Error alert */}
        <AnimatePresence>
          {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
        </AnimatePresence>

        {/* Calendar list */}
        {isLoading ? (
          <CalendarListSkeleton />
        ) : calendars.length === 0 ? (
          <EmptyState onAddCalendar={handleAddCalendar} />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {calendars.map((calendar) => (
                <CalendarCard
                  key={calendar.id}
                  calendar={calendar}
                  syncStatus={syncStatuses[calendar.id] ?? 'idle'}
                  onToggle={() => handleToggle(calendar)}
                  onSync={() => handleSync(calendar)}
                  onDelete={() => handleDelete(calendar)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* View calendar link */}
        {calendars.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 text-center"
          >
            <motion.button
              onClick={() => router.push('/calendars/view')}
              whileHover={{ scale: 1.02 }}
              className={cn(
                'inline-flex items-center gap-2 font-medium',
                'text-primary hover:text-primary/80',
                'transition-zen'
              )}
            >
              View Calendar
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
