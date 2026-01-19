'use client';

/**
 * Week calendar view component with smooth animations.
 * REQ-2-022: Week calendar view
 */

import { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getWeekDates,
  addWeeks,
  isToday,
  formatTime,
  formatShortDate,
  formatDayOfWeek,
  parseISO,
  getDayHours,
  getEventDurationMinutes,
} from '@/lib/utils/dates';
import type { CalendarViewEvent } from '@/lib/calendar/queries';
import { cn } from '@/lib/utils';

const HOUR_HEIGHT = 60; // pixels per hour
const MIN_EVENT_HEIGHT = 20; // minimum event height in pixels

interface WeekViewProps {
  /** Events to display */
  events: CalendarViewEvent[];
  /** Currently displayed week (any date in the week) */
  currentDate: Date;
  /** Callback when week changes */
  onDateChange: (date: Date) => void;
  /** Callback when an event is clicked */
  onEventClick?: (event: CalendarViewEvent) => void;
  /** Callback when a time slot is clicked */
  onTimeSlotClick?: (date: Date, hour: number) => void;
  /** Optional timezone for displaying times */
  timezone?: string;
  /** Whether component is in loading state */
  isLoading?: boolean;
}

/**
 * Groups events by date and separates all-day events.
 */
function groupEventsByDate(events: CalendarViewEvent[]) {
  const allDayEvents = new Map<string, CalendarViewEvent[]>();
  const timedEvents = new Map<string, CalendarViewEvent[]>();

  for (const event of events) {
    const startDate = parseISO(event.start_time);
    const dateKey = startDate.toISOString().split('T')[0];

    if (event.all_day) {
      const existing = allDayEvents.get(dateKey) ?? [];
      existing.push(event);
      allDayEvents.set(dateKey, existing);
    } else {
      const existing = timedEvents.get(dateKey) ?? [];
      existing.push(event);
      timedEvents.set(dateKey, existing);
    }
  }

  return { allDayEvents, timedEvents };
}

/**
 * Calculates the vertical position and height for a timed event.
 */
function getEventPosition(event: CalendarViewEvent) {
  const start = parseISO(event.start_time);
  const end = parseISO(event.end_time);

  const startHour = start.getUTCHours() + start.getUTCMinutes() / 60;
  const durationMinutes = getEventDurationMinutes(start, end);
  const durationHours = Math.max(durationMinutes / 60, MIN_EVENT_HEIGHT / HOUR_HEIGHT);

  return {
    top: startHour * HOUR_HEIGHT,
    height: Math.max(durationHours * HOUR_HEIGHT, MIN_EVENT_HEIGHT),
  };
}

/**
 * Determines if text should be light or dark based on background color.
 */
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Renders a single timed event.
 */
function TimedEvent({
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
  const { top, height } = getEventPosition(event);
  const bgColor = event.calendar_source.color ?? '#6B7280';
  const startTime = parseISO(event.start_time);

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.2,
        delay: index * 0.05,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'absolute right-1 left-1 overflow-hidden rounded px-2 py-1 text-xs',
        'cursor-pointer transition-[filter] hover:brightness-110',
        'focus:ring-ring focus:ring-2 focus:ring-offset-1 focus:outline-none'
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: bgColor,
        color: getContrastColor(bgColor),
      }}
      title={`${event.title} - ${formatTime(startTime, false, timezone)}`}
    >
      <div className="truncate font-medium">{event.title}</div>
      {height >= 40 && (
        <div className="text-[10px] opacity-80">{formatTime(startTime, false, timezone)}</div>
      )}
    </motion.button>
  );
}

/**
 * Renders an all-day event chip.
 */
function AllDayEvent({
  event,
  onClick,
  index,
}: {
  event: CalendarViewEvent;
  onClick?: () => void;
  index: number;
}) {
  const bgColor = event.calendar_source.color ?? '#6B7280';

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
        delay: index * 0.05,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'w-full truncate rounded px-2 py-1 text-left text-xs',
        'cursor-pointer transition-[filter] hover:brightness-110',
        'focus:ring-ring focus:ring-2 focus:ring-offset-1 focus:outline-none'
      )}
      style={{
        backgroundColor: bgColor,
        color: getContrastColor(bgColor),
      }}
      title={event.title}
    >
      {event.title}
    </motion.button>
  );
}

/**
 * Renders a single day column in the week view.
 */
function DayColumn({
  date,
  timedEvents,
  onEventClick,
  onTimeSlotClick,
  timezone,
  isCurrentDay,
}: {
  date: Date;
  timedEvents: CalendarViewEvent[];
  onEventClick?: (event: CalendarViewEvent) => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
  timezone?: string;
  isCurrentDay: boolean;
}) {
  const hours = getDayHours();

  // Sort events by start time
  const sortedEvents = [...timedEvents].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  return (
    <div className="border-border relative flex-1 border-r last:border-r-0">
      {/* Hour grid lines */}
      {hours.map((hour) => (
        <div
          key={hour}
          onClick={() => onTimeSlotClick?.(date, hour)}
          className={cn(
            'border-border h-[60px] cursor-pointer border-b',
            'hover:bg-accent/30 transition-colors',
            isCurrentDay && 'bg-primary/5'
          )}
        />
      ))}

      {/* Events */}
      {sortedEvents.map((event, index) => (
        <TimedEvent
          key={event.id}
          event={event}
          onClick={() => onEventClick?.(event)}
          timezone={timezone}
          index={index}
        />
      ))}

      {/* Current time indicator */}
      {isCurrentDay && <CurrentTimeIndicator timezone={timezone} />}
    </div>
  );
}

/**
 * Renders the current time indicator line.
 */
function CurrentTimeIndicator({ timezone }: { timezone?: string }) {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      setPosition((hours + minutes / 60) * HOUR_HEIGHT);
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <div
      className="pointer-events-none absolute right-0 left-0 z-10 flex items-center"
      style={{ top: `${position}px` }}
    >
      <div className="bg-destructive -ml-1 h-2 w-2 rounded-full" />
      <div className="bg-destructive h-0.5 flex-1" />
    </div>
  );
}

/**
 * Week view calendar component.
 * Displays a 7-day view with hourly grid.
 */
export function WeekView({
  events,
  currentDate,
  onDateChange,
  onEventClick,
  onTimeSlotClick,
  timezone,
  isLoading,
}: WeekViewProps) {
  const [direction, setDirection] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate week dates
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  // Group events
  const { allDayEvents, timedEvents } = useMemo(() => groupEventsByDate(events), [events]);

  const handlePreviousWeek = () => {
    setDirection(-1);
    onDateChange(addWeeks(currentDate, -1));
  };

  const handleNextWeek = () => {
    setDirection(1);
    onDateChange(addWeeks(currentDate, 1));
  };

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollPosition = Math.max(0, (currentHour - 1) * HOUR_HEIGHT);
      scrollRef.current.scrollTop = scrollPosition;
    }
  }, []);

  const weekKey = weekDates[0].toISOString().split('T')[0];
  const hours = getDayHours();

  // Format week range for header
  const startDate = weekDates[0];
  const endDate = weekDates[6];
  const weekRangeText = `${formatShortDate(startDate, timezone)} - ${formatShortDate(endDate, timezone)}`;

  return (
    <div className="flex h-full flex-col">
      {/* Header with navigation */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-xl font-semibold">{weekRangeText}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousWeek}
            className={cn(
              'hover:bg-accent rounded-md p-2 transition-colors',
              'focus:ring-ring focus:ring-2 focus:outline-none'
            )}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNextWeek}
            className={cn(
              'hover:bg-accent rounded-md p-2 transition-colors',
              'focus:ring-ring focus:ring-2 focus:outline-none'
            )}
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="border-border flex border-b">
        {/* Time gutter spacer */}
        <div className="w-16 flex-shrink-0" />

        {weekDates.map((date) => {
          const isTodayDate = isToday(date, timezone);
          return (
            <div
              key={date.toISOString()}
              className={cn(
                'border-border flex-1 border-r py-2 text-center last:border-r-0',
                isTodayDate && 'bg-primary/10'
              )}
            >
              <div className="text-muted-foreground text-xs">
                {formatDayOfWeek(date, 'short', timezone)}
              </div>
              <div className={cn('text-lg font-semibold', isTodayDate && 'text-primary')}>
                {date.getUTCDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day events section */}
      {Array.from(allDayEvents.values()).some((e) => e.length > 0) && (
        <div className="border-border bg-muted/30 flex border-b">
          <div className="text-muted-foreground w-16 flex-shrink-0 py-2 pr-2 text-right text-xs">
            All day
          </div>
          {weekDates.map((date) => {
            const dateKey = date.toISOString().split('T')[0];
            const dayAllDayEvents = allDayEvents.get(dateKey) ?? [];
            return (
              <div
                key={dateKey}
                className="border-border flex-1 space-y-1 border-r p-1 last:border-r-0"
              >
                {dayAllDayEvents.map((event, idx) => (
                  <AllDayEvent
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick?.(event)}
                    index={idx}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={weekKey}
            initial={{ x: direction * 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -50, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex min-h-full"
          >
            {/* Time labels */}
            <div className="w-16 flex-shrink-0">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="text-muted-foreground -mt-2 h-[60px] pr-2 text-right text-xs"
                >
                  {hour === 0 ? '' : `${hour % 12 || 12}${hour < 12 ? 'AM' : 'PM'}`}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {isLoading
              ? // Loading skeleton
                Array.from({ length: 7 }).map((_, idx) => (
                  <div key={idx} className="border-border flex-1 border-r last:border-r-0">
                    {hours.map((hour) => (
                      <div key={hour} className="border-border h-[60px] animate-pulse border-b">
                        {hour % 3 === 0 && <div className="bg-muted m-1 h-8 rounded" />}
                      </div>
                    ))}
                  </div>
                ))
              : weekDates.map((date) => {
                  const dateKey = date.toISOString().split('T')[0];
                  const dayTimedEvents = timedEvents.get(dateKey) ?? [];

                  return (
                    <DayColumn
                      key={dateKey}
                      date={date}
                      timedEvents={dayTimedEvents}
                      onEventClick={onEventClick}
                      onTimeSlotClick={onTimeSlotClick}
                      timezone={timezone}
                      isCurrentDay={isToday(date, timezone)}
                    />
                  );
                })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
