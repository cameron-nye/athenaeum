'use client';

/**
 * DisplayClock Component - Large clock optimized for wall-mounted displays
 *
 * A prominent, easy-to-read clock component designed for the display mode.
 * Features large typography, smooth animations, and ambient styling.
 *
 * REQ-3-007: Large clock display with current time and date
 * REQ-3-018: Display-optimized typography
 */

import { useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { formatClockTime } from '@/lib/display/time-formatting';
import { formatFullDate, formatDayOfWeek } from '@/lib/utils/dates';
import { cn } from '@/lib/utils';

export interface DisplayClockProps {
  /** Use 24-hour time format */
  use24Hour?: boolean;
  /** IANA timezone string (e.g., 'America/New_York') */
  timezone?: string;
  /** Show the full date below the clock */
  showDate?: boolean;
  /** Show the day of week */
  showDayOfWeek?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Large clock component for display mode.
 * Designed to be easily readable from across the room.
 */
export const DisplayClock = memo(function DisplayClock({
  use24Hour = false,
  timezone,
  showDate = true,
  showDayOfWeek = true,
  className,
}: DisplayClockProps) {
  const [time, setTime] = useState(() => formatClockTime(new Date(), use24Hour, timezone));
  const [date, setDate] = useState(() => new Date());

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(formatClockTime(now, use24Hour, timezone));
      setDate(now);
    };

    // Update immediately
    updateTime();

    // Update every second for clock accuracy
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [use24Hour, timezone]);

  // Format date string, removing the day of week (we show it separately)
  const dateString = formatFullDate(date, timezone).replace(
    formatDayOfWeek(date, 'long', timezone) + ', ',
    ''
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn('flex flex-col items-center justify-center gap-4', className)}
    >
      {/* Time display */}
      <div className="flex items-baseline gap-2">
        {/* Hours */}
        <motion.span
          key={`hours-${time.hours}`}
          initial={{ opacity: 0.8, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-[8rem] leading-none font-light tracking-tight tabular-nums"
        >
          {time.hours}
        </motion.span>

        {/* Separator - animated pulse */}
        <motion.span
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          className="text-muted-foreground text-[8rem] leading-none font-light tracking-tight"
        >
          :
        </motion.span>

        {/* Minutes */}
        <motion.span
          key={`minutes-${time.minutes}`}
          initial={{ opacity: 0.8, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-[8rem] leading-none font-light tracking-tight tabular-nums"
        >
          {time.minutes}
        </motion.span>

        {/* AM/PM indicator for 12-hour format */}
        {time.period && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-muted-foreground ml-4 text-4xl font-medium"
          >
            {time.period}
          </motion.span>
        )}
      </div>

      {/* Day of week */}
      {showDayOfWeek && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-3xl font-medium"
        >
          {formatDayOfWeek(date, 'long', timezone)}
        </motion.div>
      )}

      {/* Date */}
      {showDate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-foreground/80 text-2xl font-normal"
        >
          {dateString}
        </motion.div>
      )}
    </motion.div>
  );
});
