'use client';

/**
 * CalendarView Component
 * Full calendar view for the display with interactive event list
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { DateTimeHeader } from '../DateTimeHeader';
import { InteractiveEventList } from '../InteractiveEventList';
import { UpcomingEvents } from '../UpcomingEvents';
import { CreateEventPanel } from '../CreateEventPanel';
import { useDisplayContext } from '../DisplayContext';
import { TextShimmer } from '@/components/motion-primitives/text-shimmer';

interface CalendarViewProps {
  householdName?: string;
  timezone?: string;
}

export function CalendarView({ householdName, timezone }: CalendarViewProps) {
  const { state } = useDisplayContext();
  const { events, calendarSources, settings } = state;
  const { use24HourTime, widgetsEnabled } = settings;
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  return (
    <div className="flex h-full flex-col gap-6 p-6 pb-24">
      <DateTimeHeader use24Hour={use24HourTime} timezone={timezone} householdName={householdName} />

      {/* Main content area */}
      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Today's events - main section */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <TextShimmer className="text-2xl font-bold" duration={3}>
              Today's Events
            </TextShimmer>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreatePanel(true)}
              className="flex h-10 items-center gap-2 rounded-xl bg-blue-500 px-4 font-medium text-white shadow-lg shadow-blue-500/25 transition-colors hover:bg-blue-600"
            >
              <Plus className="h-5 w-5" />
              <span>Add Event</span>
            </motion.button>
          </div>

          <div className="flex-1 overflow-hidden">
            <InteractiveEventList
              events={events}
              calendarSources={calendarSources}
              use24Hour={use24HourTime}
              timezone={timezone}
              filterToday={true}
            />
          </div>
        </div>

        {/* Upcoming events sidebar */}
        {widgetsEnabled.upcomingEvents && (
          <div className="w-96 overflow-hidden">
            <UpcomingEvents
              events={events}
              calendarSources={calendarSources}
              use24Hour={use24HourTime}
              timezone={timezone}
            />
          </div>
        )}
      </div>

      {/* Create event panel */}
      <CreateEventPanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        calendarSources={calendarSources}
      />
    </div>
  );
}
