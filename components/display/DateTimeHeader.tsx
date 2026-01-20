'use client';

/**
 * Display Date/Time Header Component
 * REQ-3-021: Header showing current date and time prominently
 */

import { Clock } from './Clock';

export interface DateTimeHeaderProps {
  use24Hour?: boolean;
  timezone?: string;
  householdName?: string;
}

export function DateTimeHeader({
  use24Hour = false,
  timezone,
  householdName,
}: DateTimeHeaderProps) {
  return (
    <header className="display-header flex items-center justify-between">
      <Clock use24Hour={use24Hour} timezone={timezone} showDate={true} showDayOfWeek={true} />

      {householdName && <div className="display-small text-muted-foreground">{householdName}</div>}
    </header>
  );
}
