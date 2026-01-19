'use client';

/**
 * Calendar selection page for enabling/disabling Google calendars.
 * REQ-2-012: Calendar selection page
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarSource {
  id: string;
  name: string;
  color: string | null;
  provider: 'google' | 'ical';
  enabled: boolean;
}

/**
 * Loading skeleton for calendar list.
 */
function CalendarSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="border-border flex animate-pulse items-center gap-4 rounded-lg border p-4"
        >
          <div className="bg-muted h-5 w-5 rounded" />
          <div className="bg-muted h-4 w-4 rounded-full" />
          <div className="bg-muted h-4 flex-1 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Individual calendar item with checkbox.
 */
function CalendarItem({
  calendar,
  isSelected,
  onToggle,
  index,
}: {
  calendar: CalendarSource;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
}) {
  const color = calendar.color ?? '#6B7280';

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onToggle}
      className={cn(
        'flex w-full items-center gap-4 rounded-lg border p-4 text-left',
        'transition-all duration-200',
        'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-accent/50'
      )}
    >
      <div
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
        )}
      >
        {isSelected && <Check className="text-primary-foreground h-3 w-3" />}
      </div>
      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
      <span className="flex-1 font-medium">{calendar.name}</span>
    </motion.button>
  );
}

/**
 * Calendar selection page component.
 */
export default function CalendarConnectPage() {
  const router = useRouter();
  const [calendars, setCalendars] = useState<CalendarSource[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available calendars
  useEffect(() => {
    async function fetchCalendars() {
      try {
        const response = await fetch('/api/calendars/sources');
        if (!response.ok) {
          throw new Error('Failed to fetch calendars');
        }
        const data = await response.json();
        setCalendars(data.sources ?? []);

        // Pre-select already enabled calendars
        const enabledIds = (data.sources ?? [])
          .filter((c: CalendarSource) => c.enabled)
          .map((c: CalendarSource) => c.id);
        setSelectedIds(new Set(enabledIds));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load calendars');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCalendars();
  }, []);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(calendars.map((c) => c.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/calendars/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabledIds: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? 'Failed to save selection');
      }

      router.push('/calendars');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save selection');
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <Calendar className="text-primary h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Select Calendars</h1>
        <p className="text-muted-foreground mt-2">
          Choose which calendars you want to display on your family dashboard.
        </p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-destructive/10 text-destructive mb-6 rounded-lg p-4"
        >
          {error}
        </motion.div>
      )}

      {isLoading ? (
        <CalendarSkeleton />
      ) : calendars.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-muted-foreground py-12 text-center"
        >
          <Calendar className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>No calendars found.</p>
          <p className="text-sm">Please connect a Google account first.</p>
        </motion.div>
      ) : (
        <>
          {/* Selection controls */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              {selectedIds.size} of {calendars.length} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                Select all
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                onClick={handleDeselectAll}
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                Deselect all
              </button>
            </div>
          </div>

          {/* Calendar list */}
          <div className="space-y-3">
            {calendars.map((calendar, index) => (
              <CalendarItem
                key={calendar.id}
                calendar={calendar}
                isSelected={selectedIds.has(calendar.id)}
                onToggle={() => handleToggle(calendar.id)}
                index={index}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex justify-end gap-4">
            <button
              onClick={() => router.push('/calendars')}
              className={cn(
                'rounded-lg px-6 py-2 font-medium',
                'border-border border',
                'hover:bg-accent transition-colors',
                'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none'
              )}
            >
              Cancel
            </button>
            <motion.button
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                'flex items-center gap-2 rounded-lg px-6 py-2 font-medium',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90 transition-colors',
                'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Selection'}
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}
