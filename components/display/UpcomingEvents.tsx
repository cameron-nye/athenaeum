'use client';

/**
 * Upcoming Events Sidebar Component
 * REQ-3-023: Shows next 7 days of events grouped by date
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  formatEventTimeWithContext,
  groupEventsByDate,
  sortEventsByTime,
} from '@/lib/display/time-formatting';
import { addDays, getStartOfDay, getEndOfDay, parseISO, isToday } from '@/lib/utils/dates';
import type { CalendarEvent, CalendarSource } from './DisplayContext';

export interface UpcomingEventsProps {
  events: CalendarEvent[];
  calendarSources: CalendarSource[];
  use24Hour?: boolean;
  timezone?: string;
  daysAhead?: number;
}

const containerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
};

export function UpcomingEvents({
  events,
  calendarSources,
  use24Hour = false,
  timezone,
  daysAhead = 7,
}: UpcomingEventsProps) {
  // Filter to upcoming events (tomorrow through N days ahead) and group by date
  const groupedEvents = useMemo(() => {
    const now = new Date();
    const tomorrow = getStartOfDay(addDays(now, 1));
    const endDate = getEndOfDay(addDays(now, daysAhead));

    // Filter to events in the upcoming range (excluding today)
    const upcomingEvents = events.filter((event) => {
      const eventStart = parseISO(event.start_time);
      // Exclude today's events
      if (isToday(eventStart, timezone)) {
        return false;
      }
      return eventStart >= tomorrow && eventStart <= endDate;
    });

    // Sort and group by date
    const sorted = sortEventsByTime(upcomingEvents);
    return groupEventsByDate(sorted, timezone);
  }, [events, daysAhead, timezone]);

  // Create a map of calendar source colors
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    calendarSources.forEach((source) => {
      map.set(source.id, source.color || '#64748b');
    });
    return map;
  }, [calendarSources]);

  // Convert to array for rendering
  const dateGroups = Array.from(groupedEvents.entries());

  if (dateGroups.length === 0) {
    return (
      <div className="display-sidebar flex h-full items-center justify-center">
        <div className="text-center">
          <div className="display-small text-muted-foreground">No upcoming events</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="display-sidebar space-y-6 overflow-y-auto"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <div className="display-subheading text-foreground/80 mb-4">Upcoming</div>

      <AnimatePresence mode="popLayout">
        {dateGroups.map(([dateKey, dayEvents]) => (
          <motion.div
            key={dateKey}
            variants={itemVariants}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-2"
          >
            <div className="display-small text-muted-foreground font-medium">{dateKey}</div>

            <div className="space-y-2">
              {dayEvents.map((event) => {
                const color = colorMap.get(event.calendar_source_id) || '#64748b';

                return (
                  <motion.div
                    key={event.id}
                    layout
                    className="bg-card/50 relative rounded-lg p-3 pl-4"
                  >
                    {/* Color indicator */}
                    <div
                      className="absolute top-0 left-0 h-full w-1 rounded-l-lg"
                      style={{ backgroundColor: color }}
                    />

                    <div className="display-small truncate font-medium">{event.title}</div>

                    <div className="display-small text-muted-foreground mt-0.5">
                      {formatEventTimeWithContext(event, { use24Hour, timezone })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
