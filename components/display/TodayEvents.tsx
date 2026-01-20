'use client';

/**
 * Today's Events List Component
 * REQ-3-022: Scrollable list of today's events
 * REQ-3-010: Smooth animations for event updates
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  formatEventTime,
  isEventOngoing,
  isEventStartingSoon,
  sortEventsByTime,
} from '@/lib/display/time-formatting';
import { isToday, parseISO } from '@/lib/utils/dates';
import type { CalendarEvent, CalendarSource } from './DisplayContext';

export interface TodayEventsProps {
  events: CalendarEvent[];
  calendarSources: CalendarSource[];
  use24Hour?: boolean;
  timezone?: string;
}

const eventVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, height: 0, marginBottom: 0 },
};

export function TodayEvents({
  events,
  calendarSources,
  use24Hour = false,
  timezone,
}: TodayEventsProps) {
  // Filter to today's events and sort
  const todayEvents = useMemo(() => {
    const filtered = events.filter((event) => isToday(parseISO(event.start_time), timezone));
    return sortEventsByTime(filtered);
  }, [events, timezone]);

  // Create a map of calendar source colors
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    calendarSources.forEach((source) => {
      map.set(source.id, source.color || '#64748b');
    });
    return map;
  }, [calendarSources]);

  if (todayEvents.length === 0) {
    return (
      <div className="display-main flex items-center justify-center">
        <div className="text-center">
          <div className="display-heading text-muted-foreground mb-2">No events today</div>
          <div className="display-body text-muted-foreground/70">Enjoy your free time</div>
        </div>
      </div>
    );
  }

  return (
    <div className="display-main space-y-4 overflow-y-auto pr-4">
      <AnimatePresence mode="popLayout">
        {todayEvents.map((event, index) => {
          const isOngoing = isEventOngoing(event);
          const isStartingSoon = isEventStartingSoon(event);
          const color = colorMap.get(event.calendar_source_id) || '#64748b';

          return (
            <motion.div
              key={event.id}
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
              className={`relative rounded-xl p-6 transition-colors ${isOngoing ? 'bg-primary/10 ring-primary/30 ring-2' : 'bg-card'} ${isStartingSoon ? 'bg-accent/20' : ''} `}
            >
              {/* Color indicator */}
              <div
                className="absolute top-0 left-0 h-full w-1.5 rounded-l-xl"
                style={{ backgroundColor: color }}
              />

              <div className="ml-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="display-body truncate font-medium">{event.title}</div>

                  {event.location && (
                    <div className="display-small text-muted-foreground mt-1 truncate">
                      {event.location}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 text-right">
                  <div
                    className={`display-body font-medium ${isOngoing ? 'text-primary' : 'text-foreground'} `}
                  >
                    {formatEventTime(event, { use24Hour, timezone })}
                  </div>

                  {isStartingSoon && !isOngoing && (
                    <div className="display-small text-accent-foreground mt-1">Starting soon</div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
