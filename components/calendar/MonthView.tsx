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
  events: CalendarViewEvent[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick?: (event: CalendarViewEvent) => void;
  onDayClick?: (date: Date) => void;
  timezone?: string;
  isLoading?: boolean;
}

// Zen animation variants
const gridVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: 'spring' as const, stiffness: 200, damping: 25 },
      opacity: { duration: 0.3 },
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
    transition: {
      x: { type: 'spring' as const, stiffness: 200, damping: 25 },
      opacity: { duration: 0.2 },
    },
  }),
};

const dayVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (index: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: index * 0.008,
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const eventVariants = {
  hidden: { opacity: 0, y: 4, scale: 0.95 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: index * 0.03,
      type: 'spring' as const,
      stiffness: 300,
      damping: 20,
    },
  }),
};

/**
 * Groups events by date for efficient lookup.
 */
function groupEventsByDate(events: CalendarViewEvent[]): Map<string, CalendarViewEvent[]> {
  const grouped = new Map<string, CalendarViewEvent[]>();

  for (const event of events) {
    const startDate = parseISO(event.start_time);
    const endDate = parseISO(event.end_time);

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
 * Renders a single event chip with zen styling.
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
  const bgColor = event.calendar_source.color ?? '#6B7280';

  return (
    <motion.button
      custom={index}
      variants={eventVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'w-full truncate rounded-lg px-2 py-1 text-left text-xs',
        'transition-zen cursor-pointer',
        'hover:shadow-sm',
        'focus-zen'
      )}
      style={{
        backgroundColor: bgColor + '20',
        color: bgColor,
        borderLeft: `3px solid ${bgColor}`,
      }}
      title={`${event.title}${timeStr ? ` - ${timeStr}` : ''}`}
    >
      {!event.all_day && <span className="font-semibold opacity-80">{timeStr} </span>}
      <span className="font-medium">{event.title}</span>
    </motion.button>
  );
}

/**
 * Renders a single day cell with zen styling.
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
  const [isHovered, setIsHovered] = useState(false);

  const sortedEvents = [...events].sort((a, b) => {
    if (a.all_day && !b.all_day) return -1;
    if (!a.all_day && b.all_day) return 1;
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  const visibleEvents = sortedEvents.slice(0, 3);
  const hiddenCount = sortedEvents.length - 3;

  return (
    <motion.div
      custom={index}
      variants={dayVariants}
      initial="hidden"
      animate="visible"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onDayClick?.(date)}
      className={cn(
        'relative min-h-28 cursor-pointer p-2',
        'border-border/50 border-r border-b',
        'transition-zen',
        !isCurrentMonth && 'bg-muted/20',
        isHovered && isCurrentMonth && 'bg-accent/30'
      )}
    >
      {/* Subtle hover glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0"
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{
          background:
            'radial-gradient(circle at 50% 30%, oklch(0.55 0.1 155 / 0.08) 0%, transparent 70%)',
        }}
      />

      {/* Day number */}
      <div className="relative mb-2 flex items-center justify-center">
        <motion.span
          animate={{
            scale: isTodayDate ? [1, 1.05, 1] : 1,
          }}
          transition={{
            duration: 2,
            repeat: isTodayDate ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
            'transition-zen',
            isTodayDate && 'bg-primary text-primary-foreground shadow-zen',
            !isCurrentMonth && !isTodayDate && 'text-muted-foreground/60'
          )}
        >
          {dayNumber}
        </motion.span>
      </div>

      {/* Events */}
      <div className="relative space-y-1">
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-muted-foreground px-2 text-xs font-medium"
          >
            +{hiddenCount} more
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Navigation button with zen styling.
 */
function NavButton({
  onClick,
  direction,
  label,
}: {
  onClick: () => void;
  direction: 'prev' | 'next';
  label: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'rounded-xl p-2.5',
        'bg-card hover:bg-accent',
        'shadow-zen hover:shadow-zen-lg',
        'transition-zen focus-zen'
      )}
      aria-label={label}
    >
      {direction === 'prev' ? (
        <ChevronLeft className="h-5 w-5" />
      ) : (
        <ChevronRight className="h-5 w-5" />
      )}
    </motion.button>
  );
}

/**
 * Month view calendar component with zen aesthetic.
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

  const calendarDates = useMemo(() => getMonthCalendarDates(currentDate), [currentDate]);
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
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-6 py-4"
      >
        <motion.h2
          key={monthKey}
          initial={{ opacity: 0, x: direction * 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="text-2xl font-semibold tracking-tight"
        >
          {formatMonthYear(currentDate, timezone)}
        </motion.h2>
        <div className="flex items-center gap-2">
          <NavButton onClick={handlePreviousMonth} direction="prev" label="Previous month" />
          <NavButton onClick={handleNextMonth} direction="next" label="Next month" />
        </div>
      </motion.div>

      {/* Weekday headers */}
      <div className="border-border/50 bg-muted/30 grid grid-cols-7 border-b">
        {WEEKDAYS.map((day, index) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="text-muted-foreground py-3 text-center text-sm font-medium"
          >
            {day}
          </motion.div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={monthKey}
            custom={direction}
            variants={gridVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="grid grid-cols-7"
          >
            {isLoading
              ? Array.from({ length: 42 }).map((_, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.01 }}
                    className="border-border/50 min-h-28 border-r border-b p-2"
                  >
                    <div className="bg-muted mx-auto mb-2 h-8 w-8 animate-pulse rounded-full" />
                    <div className="space-y-1">
                      <div className="bg-muted h-6 animate-pulse rounded-lg" />
                      <div className="bg-muted h-6 w-3/4 animate-pulse rounded-lg" />
                    </div>
                  </motion.div>
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
