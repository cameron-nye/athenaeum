'use client';

/**
 * Event detail modal/panel component.
 * REQ-2-025: Event detail modal
 */

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Clock, Calendar, Repeat } from 'lucide-react';
import { formatFullDate, formatTime, formatEventDuration, parseISO } from '@/lib/utils/dates';
import type { CalendarViewEvent } from '@/lib/calendar/queries';
import { cn } from '@/lib/utils';

interface EventDetailProps {
  /** The event to display, or null if modal is closed */
  event: CalendarViewEvent | null;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Optional timezone for displaying times */
  timezone?: string;
}

/**
 * Backdrop component with blur effect.
 */
function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={onClick}
      aria-hidden="true"
    />
  );
}

/**
 * Event detail modal component.
 * Shows event information with smooth animations.
 */
export function EventDetail({ event, onClose, timezone }: EventDetailProps) {
  // Handle escape key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (event) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [event, handleKeyDown]);

  if (!event) return null;

  const startTime = parseISO(event.start_time);
  const endTime = parseISO(event.end_time);
  const bgColor = event.calendar_source.color ?? '#6B7280';
  const duration = formatEventDuration(startTime, endTime);

  return (
    <AnimatePresence>
      {event && (
        <>
          <Backdrop onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
            }}
            className={cn(
              'fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
              'max-h-[90vh] w-full max-w-lg overflow-auto',
              'bg-card rounded-xl shadow-2xl',
              'focus:outline-none'
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-title"
          >
            {/* Color accent bar */}
            <div className="h-2 rounded-t-xl" style={{ backgroundColor: bgColor }} />

            {/* Header with close button */}
            <div className="flex items-start justify-between p-6 pb-4">
              <div className="flex-1 pr-4">
                <h2 id="event-title" className="text-foreground text-xl font-semibold">
                  {event.title}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">{event.calendar_source.name}</p>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  'hover:bg-accent rounded-full p-2 transition-colors',
                  'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none'
                )}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Event details */}
            <div className="space-y-4 px-6 pb-6">
              {/* Date and time */}
              <div className="flex items-start gap-3">
                <div className="bg-muted rounded-lg p-2">
                  <Clock className="text-muted-foreground h-5 w-5" />
                </div>
                <div>
                  {event.all_day ? (
                    <>
                      <div className="font-medium">All day</div>
                      <div className="text-muted-foreground text-sm">
                        {formatFullDate(startTime, timezone)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-medium">
                        {formatTime(startTime, false, timezone)} -{' '}
                        {formatTime(endTime, false, timezone)}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {formatFullDate(startTime, timezone)}
                      </div>
                      <div className="text-muted-foreground text-sm">Duration: {duration}</div>
                    </>
                  )}
                </div>
              </div>

              {/* Calendar */}
              <div className="flex items-start gap-3">
                <div className="bg-muted rounded-lg p-2">
                  <Calendar className="text-muted-foreground h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: bgColor }} />
                  <span>{event.calendar_source.name}</span>
                </div>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-start gap-3">
                  <div className="bg-muted rounded-lg p-2">
                    <MapPin className="text-muted-foreground h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{event.location}</div>
                  </div>
                </div>
              )}

              {/* Recurrence info */}
              {event.recurrence_rule && (
                <div className="flex items-start gap-3">
                  <div className="bg-muted rounded-lg p-2">
                    <Repeat className="text-muted-foreground h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">Recurring event</div>
                    <div className="text-muted-foreground text-sm">
                      {formatRecurrenceRule(event.recurrence_rule)}
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div className="border-border border-t pt-4">
                  <h3 className="text-muted-foreground mb-2 text-sm font-medium">Description</h3>
                  <p className="text-sm whitespace-pre-wrap">{event.description}</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Formats an RRULE string into a human-readable format.
 */
function formatRecurrenceRule(rrule: string): string {
  // Simple parsing of common RRULE patterns
  const parts: Record<string, string> = {};
  rrule.split(';').forEach((part) => {
    const [key, value] = part.split('=');
    if (key && value) {
      parts[key] = value;
    }
  });

  const freq = parts['FREQ'];
  const interval = parts['INTERVAL'] ? parseInt(parts['INTERVAL']) : 1;

  let result = '';

  switch (freq) {
    case 'DAILY':
      result = interval === 1 ? 'Daily' : `Every ${interval} days`;
      break;
    case 'WEEKLY':
      result = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
      if (parts['BYDAY']) {
        const days = parts['BYDAY'].split(',').map(formatDayName).join(', ');
        result += ` on ${days}`;
      }
      break;
    case 'MONTHLY':
      result = interval === 1 ? 'Monthly' : `Every ${interval} months`;
      break;
    case 'YEARLY':
      result = interval === 1 ? 'Yearly' : `Every ${interval} years`;
      break;
    default:
      result = rrule;
  }

  if (parts['COUNT']) {
    result += `, ${parts['COUNT']} times`;
  }
  if (parts['UNTIL']) {
    const until = parts['UNTIL'];
    const year = until.substring(0, 4);
    const month = until.substring(4, 6);
    const day = until.substring(6, 8);
    result += `, until ${month}/${day}/${year}`;
  }

  return result;
}

/**
 * Formats a two-letter day abbreviation to a full day name.
 */
function formatDayName(day: string): string {
  const days: Record<string, string> = {
    MO: 'Monday',
    TU: 'Tuesday',
    WE: 'Wednesday',
    TH: 'Thursday',
    FR: 'Friday',
    SA: 'Saturday',
    SU: 'Sunday',
  };
  return days[day] ?? day;
}
