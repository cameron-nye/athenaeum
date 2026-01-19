'use client';

/**
 * Month calendar view component with smooth animations.
 * REQ-2-021: Month calendar view
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getMonthCalendarDates,
  addMonths,
  isToday,
  isSameMonth,
  formatMonthYear,
  formatTime,
  parseISO,
} from '@/lib/utils/dates';
import type { CalendarViewEvent } from '@/lib/calendar/queries';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface MonthViewProps {
  /** Events to display */
  events: CalendarViewEvent[];
  /** Currently displayed month */
  currentDate: Date;
  /** Callback when month changes */
  onDateChange: (date: Date) => void;
  /** Callback when an event is clicked */
  onEventClick?: (event: CalendarViewEvent) => void;
  /** Callback when a day is clicked */
  onDayClick?: (date: Date) => void;
  /** Optional timezone for displaying times */
  timezone?: string;
  /** Whether component is in loading state */
  isLoading?: boolean;
}

/**
 * Groups events by date for efficient lookup.
 */
function groupEventsByDate(events: CalendarViewEvent[]): Map<string, CalendarViewEvent[]> {
  const grouped = new Map<string, CalendarViewEvent[]>();

  for (const event of events) {
    const startDate = parseISO(event.start_time);
    const endDate = parseISO(event.end_time);

    // For multi-day events or all-day events, add to each day
    const currentDate = new Date(startDate);
    while (currentDate < endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const existing = grouped.get(dateKey) ?? [];
      if (!existing.some((e) => e.id === event.id)) {
        existing.push(event);
        grouped.set(dateKey, existing);
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  }

  return grouped;
}

/**
 * Renders a single event chip in the day cell.
 */
function EventChip({
  event,
  onClick,
  timezone,
  index,
}: {
  event: CalendarViewEvent;
  onClick?: () => void;
  timezone?: string;
  index: number;
}) {
  const startTime = parseISO(event.start_time);
  const timeStr = event.all_day ? '' : formatTime(startTime, false, timezone);

  // Use calendar source color or fallback
  const bgColor = event.calendar_source.color ?? '#6B7280';

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
        delay: index * 0.02,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'w-full truncate rounded px-1.5 py-0.5 text-left text-xs',
        'cursor-pointer transition-[filter] hover:brightness-110',
        'focus:ring-ring focus:ring-2 focus:ring-offset-1 focus:outline-none'
      )}
      style={{
        backgroundColor: bgColor,
        color: getContrastColor(bgColor),
      }}
      title={`${event.title}${timeStr ? ` - ${timeStr}` : ''}`}
    >
      {!event.all_day && <span className="font-medium">{timeStr} </span>}
      {event.title}
    </motion.button>
  );
}

/**
 * Determines if text should be light or dark based on background color.
 */
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Renders a single day cell in the month grid.
 */
function DayCell({
  date,
  events,
  currentMonth,
  onEventClick,
  onDayClick,
  timezone,
  index,
}: {
  date: Date;
  events: CalendarViewEvent[];
  currentMonth: Date;
  onEventClick?: (event: CalendarViewEvent) => void;
  onDayClick?: (date: Date) => void;
  timezone?: string;
  index: number;
}) {
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isTodayDate = isToday(date, timezone);
  const dayNumber = date.getUTCDate();

  // Sort events: all-day first, then by start time
  const sortedEvents = [...events].sort((a, b) => {
    if (a.all_day && !b.all_day) return -1;
    if (!a.all_day && b.all_day) return 1;
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  // Show max 3 events, with "+N more" if there are more
  const visibleEvents = sortedEvents.slice(0, 3);
  const hiddenCount = sortedEvents.length - 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: index * 0.01,
      }}
      onClick={() => onDayClick?.(date)}
      className={cn(
        'border-border min-h-24 cursor-pointer border-r border-b p-1',
        'hover:bg-accent/50 transition-colors',
        !isCurrentMonth && 'bg-muted/30'
      )}
    >
      <div className="mb-1 flex items-center justify-center">
        <span
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full text-sm',
            isTodayDate && 'bg-primary text-primary-foreground font-bold',
            !isCurrentMonth && !isTodayDate && 'text-muted-foreground'
          )}
        >
          {dayNumber}
        </span>
      </div>
      <div className="space-y-0.5 overflow-hidden">
        {visibleEvents.map((event, idx) => (
          <EventChip
            key={event.id}
            event={event}
            onClick={() => onEventClick?.(event)}
            timezone={timezone}
            index={idx}
          />
        ))}
        {hiddenCount > 0 && (
          <div className="text-muted-foreground px-1.5 text-xs">+{hiddenCount} more</div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Month view calendar component.
 * Displays a full month grid with events.
 */
export function MonthView({
  events,
  currentDate,
  onDateChange,
  onEventClick,
  onDayClick,
  timezone,
  isLoading,
}: MonthViewProps) {
  const [direction, setDirection] = useState(0);

  // Generate calendar dates for the month
  const calendarDates = useMemo(() => getMonthCalendarDates(currentDate), [currentDate]);

  // Group events by date
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);

  const handlePreviousMonth = () => {
    setDirection(-1);
    onDateChange(addMonths(currentDate, -1));
  };

  const handleNextMonth = () => {
    setDirection(1);
    onDateChange(addMonths(currentDate, 1));
  };

  const monthKey = `${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth()}`;

  return (
    <div className="flex h-full flex-col">
      {/* Header with navigation */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-xl font-semibold">{formatMonthYear(currentDate, timezone)}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousMonth}
            className={cn(
              'hover:bg-accent rounded-md p-2 transition-colors',
              'focus:ring-ring focus:ring-2 focus:outline-none'
            )}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNextMonth}
            className={cn(
              'hover:bg-accent rounded-md p-2 transition-colors',
              'focus:ring-ring focus:ring-2 focus:outline-none'
            )}
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="border-border bg-muted/50 grid grid-cols-7 border-b">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-muted-foreground py-2 text-center text-sm font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={monthKey}
            initial={{ x: direction * 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -50, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="grid grid-cols-7"
          >
            {isLoading
              ? // Loading skeleton
                Array.from({ length: 42 }).map((_, index) => (
                  <div
                    key={index}
                    className="border-border min-h-24 animate-pulse border-r border-b p-1"
                  >
                    <div className="bg-muted mx-auto mb-1 h-7 w-7 rounded-full" />
                    <div className="space-y-1">
                      <div className="bg-muted h-4 rounded" />
                      <div className="bg-muted h-4 w-3/4 rounded" />
                    </div>
                  </div>
                ))
              : calendarDates.map((date, index) => {
                  const dateKey = date.toISOString().split('T')[0];
                  const dayEvents = eventsByDate.get(dateKey) ?? [];

                  return (
                    <DayCell
                      key={dateKey}
                      date={date}
                      events={dayEvents}
                      currentMonth={currentDate}
                      onEventClick={onEventClick}
                      onDayClick={onDayClick}
                      timezone={timezone}
                      index={index}
                    />
                  );
                })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
