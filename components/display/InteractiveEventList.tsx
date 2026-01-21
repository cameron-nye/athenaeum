'use client';

/**
 * InteractiveEventList Component
 * Enhanced event list with tap-to-expand details using MorphingDialog
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Calendar, X, ExternalLink, Users } from 'lucide-react';
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogDescription,
  MorphingDialogClose,
  MorphingDialogContainer,
} from '@/components/motion-primitives/morphing-dialog';
import {
  formatEventTime,
  isEventOngoing,
  isEventStartingSoon,
  sortEventsByTime,
} from '@/lib/display/time-formatting';
import { isToday, parseISO, formatFullDate } from '@/lib/utils/dates';
import type { CalendarEvent, CalendarSource } from './DisplayContext';

export interface InteractiveEventListProps {
  events: CalendarEvent[];
  calendarSources: CalendarSource[];
  use24Hour?: boolean;
  timezone?: string;
  filterToday?: boolean;
}

const eventVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, height: 0, marginBottom: 0 },
};

function EventDetailPanel({
  event,
  color,
  use24Hour,
  timezone,
}: {
  event: CalendarEvent;
  color: string;
  use24Hour?: boolean;
  timezone?: string;
}) {
  const startDate = parseISO(event.start_time);
  const endDate = event.end_time ? parseISO(event.end_time) : null;
  const isOngoing = isEventOngoing(event);

  const formatTimeRange = () => {
    if (event.all_day) return 'All day';

    const startTime = formatEventTime(event, { use24Hour, timezone });
    if (!endDate) return startTime;

    const endTime = use24Hour
      ? endDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: timezone,
        })
      : endDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: timezone,
        });

    return `${startTime} - ${endTime}`;
  };

  const handleOpenMap = () => {
    if (event.location) {
      const query = encodeURIComponent(event.location);
      window.open(`https://maps.google.com/?q=${query}`, '_blank');
    }
  };

  return (
    <div className="w-full">
      {/* Color bar */}
      <div className="h-2 rounded-t-2xl" style={{ backgroundColor: color }} />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          {isOngoing && (
            <span className="mb-2 inline-block rounded-full bg-green-500/20 px-3 py-1 text-sm font-medium text-green-600">
              Happening now
            </span>
          )}
          <MorphingDialogTitle className="text-2xl font-bold text-neutral-900 dark:text-white">
            {event.title}
          </MorphingDialogTitle>
        </div>

        {/* Time */}
        <div className="mb-4 flex items-center gap-3 text-neutral-600 dark:text-neutral-300">
          <Clock className="h-5 w-5 flex-shrink-0" />
          <div>
            <div className="font-medium">{formatTimeRange()}</div>
            <div className="text-sm text-neutral-500">
              {formatFullDate(startDate, timezone)}
            </div>
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <button
            onClick={handleOpenMap}
            className="mb-4 flex w-full items-center gap-3 rounded-xl bg-neutral-100 p-4 text-left transition-colors hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600"
          >
            <MapPin className="h-5 w-5 flex-shrink-0 text-neutral-500" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-neutral-700 dark:text-neutral-200">
                {event.location}
              </div>
              <div className="text-sm text-blue-500">Open in Maps</div>
            </div>
            <ExternalLink className="h-4 w-4 text-neutral-400" />
          </button>
        )}

        {/* Description */}
        {event.description && (
          <MorphingDialogDescription className="text-neutral-600 dark:text-neutral-400">
            {event.description}
          </MorphingDialogDescription>
        )}

        {/* Close button */}
        <MorphingDialogClose className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100 py-3 font-medium text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600">
          Close
        </MorphingDialogClose>
      </div>
    </div>
  );
}

export function InteractiveEventList({
  events,
  calendarSources,
  use24Hour = false,
  timezone,
  filterToday = true,
}: InteractiveEventListProps) {
  // Filter and sort events
  const displayEvents = useMemo(() => {
    const filtered = filterToday
      ? events.filter((event) => isToday(parseISO(event.start_time), timezone))
      : events;
    return sortEventsByTime(filtered);
  }, [events, timezone, filterToday]);

  // Create a map of calendar source colors
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    calendarSources.forEach((source) => {
      map.set(source.id, source.color || '#64748b');
    });
    return map;
  }, [calendarSources]);

  if (displayEvents.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Calendar className="mx-auto mb-4 h-16 w-16 text-neutral-300 dark:text-neutral-600" />
          <div className="text-xl font-medium text-neutral-500 dark:text-neutral-400">
            No events {filterToday ? 'today' : ''}
          </div>
          <div className="mt-1 text-neutral-400 dark:text-neutral-500">Enjoy your free time</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto pr-2">
      <AnimatePresence mode="popLayout">
        {displayEvents.map((event, index) => {
          const isOngoing = isEventOngoing(event);
          const isStartingSoon = isEventStartingSoon(event);
          const color = colorMap.get(event.calendar_source_id) || '#64748b';

          return (
            <MorphingDialog
              key={event.id}
              transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            >
              <MorphingDialogTrigger className="w-full text-left">
                <motion.div
                  variants={eventVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: 'easeOut',
                  }}
                  layout
                  className={`relative cursor-pointer rounded-xl p-5 transition-all active:scale-[0.98] ${
                    isOngoing
                      ? 'bg-green-500/10 ring-2 ring-green-500/30'
                      : isStartingSoon
                        ? 'bg-amber-500/10 ring-2 ring-amber-500/30'
                        : 'bg-white dark:bg-neutral-800'
                  }`}
                >
                  {/* Color indicator */}
                  <div
                    className="absolute left-0 top-0 h-full w-1.5 rounded-l-xl"
                    style={{ backgroundColor: color }}
                  />

                  <div className="ml-4 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-lg font-medium text-neutral-900 dark:text-white">
                        {event.title}
                      </div>

                      {event.location && (
                        <div className="mt-1 flex items-center gap-1.5 truncate text-sm text-neutral-500">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <div
                        className={`text-lg font-medium ${
                          isOngoing
                            ? 'text-green-600 dark:text-green-400'
                            : isStartingSoon
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-neutral-700 dark:text-neutral-200'
                        }`}
                      >
                        {event.all_day ? 'All day' : formatEventTime(event, { use24Hour, timezone })}
                      </div>

                      {isStartingSoon && !isOngoing && (
                        <div className="mt-0.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                          Starting soon
                        </div>
                      )}

                      {isOngoing && (
                        <div className="mt-0.5 text-sm font-medium text-green-600 dark:text-green-400">
                          Now
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </MorphingDialogTrigger>

              <MorphingDialogContainer>
                <MorphingDialogContent className="relative mx-4 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-800">
                  <EventDetailPanel
                    event={event}
                    color={color}
                    use24Hour={use24Hour}
                    timezone={timezone}
                  />
                </MorphingDialogContent>
              </MorphingDialogContainer>
            </MorphingDialog>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
