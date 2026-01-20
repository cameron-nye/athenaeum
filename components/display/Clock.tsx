'use client';

/**
 * Display Clock Component
 * REQ-3-007: Large clock display with current time and date
 */

import { useEffect, useState } from 'react';
import { formatClockTime } from '@/lib/display/time-formatting';
import { formatFullDate, formatDayOfWeek } from '@/lib/utils/dates';

export interface ClockProps {
  use24Hour?: boolean;
  timezone?: string;
  showDate?: boolean;
  showDayOfWeek?: boolean;
}

export function Clock({
  use24Hour = false,
  timezone,
  showDate = true,
  showDayOfWeek = true,
}: ClockProps) {
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

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="display-time flex items-baseline gap-2 tabular-nums">
        <span>{time.hours}</span>
        <span className="animate-pulse">:</span>
        <span>{time.minutes}</span>
        {time.period && (
          <span className="display-heading text-muted-foreground ml-2">{time.period}</span>
        )}
      </div>

      {showDayOfWeek && (
        <div className="display-subheading text-muted-foreground">
          {formatDayOfWeek(date, 'long', timezone)}
        </div>
      )}

      {showDate && (
        <div className="display-date text-foreground/80">
          {formatFullDate(date, timezone).replace(
            formatDayOfWeek(date, 'long', timezone) + ', ',
            ''
          )}
        </div>
      )}
    </div>
  );
}
