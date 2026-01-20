'use client';

/**
 * Display Calendar Component
 * REQ-3-006: Calendar view optimized for 1080p wall display with smooth animations
 * REQ-5-019: Integrate chores into display layout
 */

import { DateTimeHeader } from './DateTimeHeader';
import { TodayEvents } from './TodayEvents';
import { UpcomingEvents } from './UpcomingEvents';
import { ChoreList } from './ChoreList';
import type {
  CalendarEvent,
  CalendarSource,
  ChoreAssignment,
  DisplaySettings,
} from './DisplayContext';

export interface DisplayCalendarProps {
  events: CalendarEvent[];
  calendarSources: CalendarSource[];
  choreAssignments: ChoreAssignment[];
  settings: DisplaySettings;
  householdName?: string;
  timezone?: string;
}

export function DisplayCalendar({
  events,
  calendarSources,
  choreAssignments,
  settings,
  householdName,
  timezone,
}: DisplayCalendarProps) {
  const { use24HourTime, burnInPreventionEnabled, ambientAnimationEnabled } = settings;

  return (
    <div
      className={`display-grid h-full w-full ${ambientAnimationEnabled ? 'display-ambient-bg' : 'bg-background'} ${burnInPreventionEnabled ? 'display-burnin-prevention' : ''} `}
    >
      <DateTimeHeader use24Hour={use24HourTime} timezone={timezone} householdName={householdName} />

      <TodayEvents
        events={events}
        calendarSources={calendarSources}
        use24Hour={use24HourTime}
        timezone={timezone}
      />

      {settings.widgetsEnabled.upcomingEvents && (
        <UpcomingEvents
          events={events}
          calendarSources={calendarSources}
          use24Hour={use24HourTime}
          timezone={timezone}
        />
      )}

      {settings.widgetsEnabled.chores && (
        <div className="display-chores bg-card/50 rounded-2xl p-6">
          <ChoreList assignments={choreAssignments} />
        </div>
      )}
    </div>
  );
}
