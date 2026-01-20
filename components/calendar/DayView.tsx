'use client';

/**
 * Day calendar view component with smooth animations.
 * REQ-2-023: Day calendar view
 */

import { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addDays,
  isToday,
  formatTime,
  formatFullDate,
  parseISO,
  getDayHours,
  getEventDurationMinutes,
} from '@/lib/utils/dates';
import type { CalendarViewEvent } from '@/lib/calendar/queries';
import { cn } from '@/lib/utils';

const HOUR_HEIGHT = 80; // pixels per hour (larger for day view)
const MIN_EVENT_HEIGHT = 24; // minimum event height in pixels

interface DayViewProps {
  /** Events to display */
  events: CalendarViewEvent[];
  /** Currently displayed day */
  currentDate: Date;
  /** Callback when day changes */
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
 * Separates all-day events from timed events.
 */
function separateEvents(events: CalendarViewEvent[]) {
  const allDayEvents: CalendarViewEvent[] = [];
  const timedEvents: CalendarViewEvent[] = [];

  for (const event of events) {
    if (event.all_day) {
      allDayEvents.push(event);
    } else {
      timedEvents.push(event);
    }
  }

  // Sort timed events by start time
  timedEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

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
 * Renders a single timed event with full details.
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
  const endTime = parseISO(event.end_time);

  const showDetails = height >= 60;
  const showLocation = height >= 80 && event.location;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
        delay: index * 0.03,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'absolute right-4 left-20 overflow-hidden rounded-lg px-3 py-2 text-sm',
        'cursor-pointer shadow-sm transition-[filter] hover:brightness-110',
        'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
        'text-left'
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: bgColor,
        color: getContrastColor(bgColor),
      }}
      title={event.title}
    >
      <div className="truncate font-semibold">{event.title}</div>
      {showDetails && (
        <div className="mt-0.5 text-xs opacity-90">
          {formatTime(startTime, false, timezone)} - {formatTime(endTime, false, timezone)}
        </div>
      )}
      {showLocation && <div className="mt-0.5 truncate text-xs opacity-75">{event.location}</div>}
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
        delay: index * 0.03,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'truncate rounded-lg px-3 py-2 text-left text-sm shadow-sm',
        'cursor-pointer transition-[filter] hover:brightness-110',
        'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none'
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
 * Renders the current time indicator line with pulse animation.
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
    const interval = setInterval(updatePosition, 60000);

    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <div
      className="pointer-events-none absolute right-0 left-16 z-10 flex items-center"
      style={{ top: `${position}px` }}
    >
      <motion.div
        className="bg-destructive -ml-1.5 h-3 w-3 rounded-full"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <div className="bg-destructive h-0.5 flex-1" />
    </div>
  );
}

/**
 * Day view calendar component.
 * Displays a single day with hourly grid and event details.
 */
export function DayView({
  events,
  currentDate,
  onDateChange,
  onEventClick,
  onTimeSlotClick,
  timezone,
  isLoading,
}: DayViewProps) {
  const [direction, setDirection] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Separate all-day and timed events
  const { allDayEvents, timedEvents } = useMemo(() => separateEvents(events), [events]);

  const handlePreviousDay = () => {
    setDirection(-1);
    onDateChange(addDays(currentDate, -1));
  };

  const handleNextDay = () => {
    setDirection(1);
    onDateChange(addDays(currentDate, 1));
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

  const dayKey = currentDate.toISOString().split('T')[0];
  const hours = getDayHours();
  const isTodayDate = isToday(currentDate, timezone);

  return (
    <div className="flex h-full flex-col">
      {/* Header with navigation */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-xl font-semibold">{formatFullDate(currentDate, timezone)}</h2>
          {isTodayDate && <span className="text-primary text-sm font-medium">Today</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousDay}
            className={cn(
              'hover:bg-accent rounded-md p-2 transition-colors',
              'focus:ring-ring focus:ring-2 focus:outline-none'
            )}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNextDay}
            className={cn(
              'hover:bg-accent rounded-md p-2 transition-colors',
              'focus:ring-ring focus:ring-2 focus:outline-none'
            )}
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* All-day events section */}
      {allDayEvents.length > 0 && (
        <div className="border-border bg-muted/30 border-b p-3">
          <div className="text-muted-foreground mb-2 text-xs">All day</div>
          <div className="flex flex-wrap gap-2">
            {allDayEvents.map((event, idx) => (
              <AllDayEvent
                key={event.id}
                event={event}
                onClick={() => onEventClick?.(event)}
                index={idx}
              />
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={dayKey}
            initial={{ x: direction * 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -50, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative min-h-full"
          >
            {isLoading ? (
              // Loading skeleton
              <div className="relative">
                {hours.map((hour) => (
                  <div key={hour} className="border-border flex h-[80px] border-b">
                    <div className="text-muted-foreground -mt-2 w-16 flex-shrink-0 pr-2 text-right text-xs">
                      {hour === 0 ? '' : `${hour % 12 || 12}${hour < 12 ? 'AM' : 'PM'}`}
                    </div>
                    <div className="flex-1 animate-pulse">
                      {hour % 4 === 0 && (
                        <div className="bg-muted mt-1 mr-4 ml-4 h-16 rounded-lg" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Hour rows with grid lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    onClick={() => onTimeSlotClick?.(currentDate, hour)}
                    className={cn(
                      'border-border flex h-[80px] cursor-pointer border-b',
                      'hover:bg-accent/30 transition-colors'
                    )}
                  >
                    <div className="text-muted-foreground -mt-2 w-16 flex-shrink-0 pr-2 text-right text-xs">
                      {hour === 0 ? '' : `${hour % 12 || 12}${hour < 12 ? 'AM' : 'PM'}`}
                    </div>
                    <div className="border-border flex-1 border-l" />
                  </div>
                ))}

                {/* Events */}
                {timedEvents.map((event, index) => (
                  <TimedEvent
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick?.(event)}
                    timezone={timezone}
                    index={index}
                  />
                ))}

                {/* Current time indicator */}
                {isTodayDate && <CurrentTimeIndicator timezone={timezone} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
