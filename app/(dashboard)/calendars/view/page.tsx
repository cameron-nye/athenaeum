'use client';

/**
 * Calendar view page with view switcher.
 * REQ-2-024: Calendar view page with view switcher
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CalendarDays, CalendarRange, ChevronDown } from 'lucide-react';
import { MonthView } from '@/components/calendar/MonthView';
import { WeekView } from '@/components/calendar/WeekView';
import { DayView } from '@/components/calendar/DayView';
import { EventDetail } from '@/components/calendar/EventDetail';
import {
  getStartOfMonth,
  getEndOfMonth,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfDay,
  getEndOfDay,
  getNow,
  formatShortDate,
} from '@/lib/utils/dates';
import type { CalendarViewEvent } from '@/lib/calendar/queries';
import { cn } from '@/lib/utils';

type ViewMode = 'month' | 'week' | 'day';

const VIEW_ICONS = {
  month: Calendar,
  week: CalendarRange,
  day: CalendarDays,
};

const VIEW_LABELS = {
  month: 'Month',
  week: 'Week',
  day: 'Day',
};

/**
 * Loading skeleton for the calendar view.
 */
function CalendarSkeleton() {
  return (
    <div className="h-full animate-pulse">
      {/* Header skeleton */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <div className="bg-muted h-7 w-48 rounded" />
        <div className="flex gap-2">
          <div className="bg-muted h-10 w-10 rounded" />
          <div className="bg-muted h-10 w-10 rounded" />
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="bg-border grid grid-cols-7 gap-px">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="bg-background h-24 p-2">
            <div className="bg-muted mx-auto mb-2 h-6 w-6 rounded-full" />
            <div className="space-y-1">
              <div className="bg-muted h-4 rounded" />
              <div className="bg-muted h-4 w-2/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * View switcher button component.
 */
function ViewButton({
  mode,
  currentMode,
  onClick,
}: {
  mode: ViewMode;
  currentMode: ViewMode;
  onClick: () => void;
}) {
  const Icon = VIEW_ICONS[mode];
  const isActive = mode === currentMode;

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-accent text-muted-foreground hover:text-foreground'
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{VIEW_LABELS[mode]}</span>
    </motion.button>
  );
}

/**
 * Today button component.
 */
function TodayButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'rounded-md px-4 py-2 text-sm font-medium',
        'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
        'transition-colors'
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      Today
    </motion.button>
  );
}

/**
 * Simple date picker dropdown.
 */
function DatePicker({
  currentDate,
  onSelect,
}: {
  currentDate: Date;
  onSelect: (date: Date) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const dateStr = formatShortDate(currentDate);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
          'hover:bg-accent transition-colors',
          'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none'
        )}
      >
        <span>{dateStr}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'absolute top-full right-0 z-20 mt-2',
                'bg-popover border-border rounded-lg border p-4 shadow-lg',
                'min-w-[280px]'
              )}
            >
              <input
                type="date"
                defaultValue={currentDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  if (e.target.value) {
                    onSelect(new Date(e.target.value + 'T12:00:00Z'));
                    setIsOpen(false);
                  }
                }}
                className={cn(
                  'border-input w-full rounded-md border px-3 py-2',
                  'bg-background text-foreground',
                  'focus:ring-ring focus:ring-2 focus:outline-none'
                )}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Main calendar view page component.
 */
export default function CalendarViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize view mode from URL or localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const urlView = searchParams.get('view') as ViewMode | null;
    if (urlView && ['month', 'week', 'day'].includes(urlView)) {
      return urlView;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('calendarViewMode');
      if (stored && ['month', 'week', 'day'].includes(stored)) {
        return stored as ViewMode;
      }
    }
    return 'month';
  });

  // Initialize current date from URL or today
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const urlDate = searchParams.get('date');
    if (urlDate) {
      const parsed = new Date(urlDate);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return getNow();
  });

  const [events, setEvents] = useState<CalendarViewEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarViewEvent | null>(null);

  // Calculate date range based on view mode
  const { startDate, endDate } = useMemo(() => {
    switch (viewMode) {
      case 'month':
        // Include days from adjacent months visible in the grid
        const monthStart = getStartOfMonth(currentDate);
        const monthEnd = getEndOfMonth(currentDate);
        return {
          startDate: getStartOfWeek(monthStart),
          endDate: getEndOfWeek(monthEnd),
        };
      case 'week':
        return {
          startDate: getStartOfWeek(currentDate),
          endDate: getEndOfWeek(currentDate),
        };
      case 'day':
        return {
          startDate: getStartOfDay(currentDate),
          endDate: getEndOfDay(currentDate),
        };
    }
  }, [viewMode, currentDate]);

  // Fetch events when date range changes
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(`/api/calendars/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events ?? []);
      } else {
        console.error('Failed to fetch events');
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Persist view mode to localStorage and URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendarViewMode', viewMode);
    }
    const params = new URLSearchParams(searchParams);
    params.set('view', viewMode);
    params.set('date', currentDate.toISOString().split('T')[0]);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [viewMode, currentDate, router, searchParams]);

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  const handleTodayClick = () => {
    setCurrentDate(getNow());
  };

  const handleEventClick = (event: CalendarViewEvent) => {
    setSelectedEvent(event);
  };

  const handleDayClick = (date: Date) => {
    // Switch to day view when clicking a day in month view
    setCurrentDate(date);
    setViewMode('day');
  };

  return (
    <div className="bg-background flex h-screen flex-col">
      {/* Top toolbar */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <TodayButton onClick={handleTodayClick} />
          <DatePicker currentDate={currentDate} onSelect={handleDateChange} />
        </div>

        <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
          {(['month', 'week', 'day'] as const).map((mode) => (
            <ViewButton
              key={mode}
              mode={mode}
              currentMode={viewMode}
              onClick={() => handleViewChange(mode)}
            />
          ))}
        </div>
      </div>

      {/* Calendar view */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <CalendarSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {viewMode === 'month' && (
                <MonthView
                  events={events}
                  currentDate={currentDate}
                  onDateChange={handleDateChange}
                  onEventClick={handleEventClick}
                  onDayClick={handleDayClick}
                />
              )}
              {viewMode === 'week' && (
                <WeekView
                  events={events}
                  currentDate={currentDate}
                  onDateChange={handleDateChange}
                  onEventClick={handleEventClick}
                />
              )}
              {viewMode === 'day' && (
                <DayView
                  events={events}
                  currentDate={currentDate}
                  onDateChange={handleDateChange}
                  onEventClick={handleEventClick}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Event detail modal */}
      <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}
