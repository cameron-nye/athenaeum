'use client';

/**
 * Calendar view page with view switcher.
 * REQ-2-024: Calendar view page with view switcher
 */

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CalendarDays, CalendarRange, ChevronDown, Sparkles } from 'lucide-react';
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

// Zen animation variants
const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const toolbarVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const viewTransition = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

/**
 * Loading skeleton for the calendar view with zen styling.
 */
function CalendarSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
      {/* Header skeleton */}
      <div className="border-border/50 flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="bg-muted/60 h-10 w-24 animate-pulse rounded-xl" />
          <div className="bg-muted/40 h-10 w-32 animate-pulse rounded-xl" />
        </div>
        <div className="bg-muted/30 flex gap-1 rounded-2xl p-1.5">
          <div className="bg-muted/50 h-9 w-20 animate-pulse rounded-xl" />
          <div className="bg-muted/40 h-9 w-20 animate-pulse rounded-xl" />
          <div className="bg-muted/40 h-9 w-20 animate-pulse rounded-xl" />
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="bg-border/30 grid grid-cols-7 gap-px p-4">
        {Array.from({ length: 35 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.01 }}
            className="bg-card/50 h-28 rounded-xl p-3"
          >
            <div className="bg-muted/50 mx-auto mb-3 h-8 w-8 animate-pulse rounded-full" />
            <div className="space-y-2">
              <div className="bg-muted/40 h-5 animate-pulse rounded-lg" />
              <div className="bg-muted/30 h-5 w-3/4 animate-pulse rounded-lg" />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Dynamic imports for calendar views - reduces initial bundle by ~30-50KB per view
const MonthView = dynamic(
  () => import('@/components/calendar/MonthView').then((m) => ({ default: m.MonthView })),
  { loading: () => <CalendarSkeleton /> }
);
const WeekView = dynamic(
  () => import('@/components/calendar/WeekView').then((m) => ({ default: m.WeekView })),
  { loading: () => <CalendarSkeleton /> }
);
const DayView = dynamic(
  () => import('@/components/calendar/DayView').then((m) => ({ default: m.DayView })),
  { loading: () => <CalendarSkeleton /> }
);

/**
 * View switcher button component with zen styling.
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
        'relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium',
        'transition-zen focus-zen',
        isActive
          ? 'bg-primary text-primary-foreground shadow-zen'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      )}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      layout
    >
      {isActive && (
        <motion.div
          layoutId="activeViewIndicator"
          className="bg-primary absolute inset-0 rounded-xl"
          initial={false}
          transition={{
            type: 'spring' as const,
            stiffness: 300,
            damping: 30,
          }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{VIEW_LABELS[mode]}</span>
      </span>
    </motion.button>
  );
}

/**
 * Today button component with zen styling.
 */
function TodayButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'rounded-xl px-5 py-2.5 text-sm font-medium',
        'bg-card text-foreground',
        'shadow-zen hover:shadow-zen-lg',
        'transition-zen focus-zen'
      )}
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.97 }}
    >
      <span className="flex items-center gap-2">
        <Sparkles className="text-primary h-3.5 w-3.5" />
        Today
      </span>
    </motion.button>
  );
}

/**
 * Simple date picker dropdown with zen styling.
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
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium',
          'hover:bg-accent/50 transition-zen focus-zen',
          'text-muted-foreground hover:text-foreground'
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>{dateStr}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
              className={cn(
                'absolute top-full right-0 z-20 mt-2',
                'bg-card rounded-2xl p-5',
                'shadow-zen-lg border-border/50 border',
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
                  'border-border/50 w-full rounded-xl border px-4 py-3',
                  'bg-background text-foreground',
                  'transition-zen focus-zen'
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
 * Component to handle URL search params synchronization.
 * Needs to be wrapped in Suspense as it uses useSearchParams.
 */
function UrlParamsSyncer({ viewMode, currentDate }: { viewMode: ViewMode; currentDate: Date }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', viewMode);
    params.set('date', currentDate.toISOString().split('T')[0]);
    router.replace(`?${params.toString()}`, { scroll: false });
    // Note: searchParams intentionally excluded from deps to prevent infinite loop.
    // We only want to sync TO the URL when viewMode/currentDate change, not react to URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, currentDate, router]);

  return null;
}

/**
 * Hook to get initial values from URL or localStorage.
 * This reads search params once on mount for SSR-safe initialization.
 */
function useInitialParams(): { initialView: ViewMode; initialDate: Date } {
  // These are only accessed client-side after hydration
  const searchParams = useSearchParams();

  const initialView = useMemo((): ViewMode => {
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
  }, [searchParams]);

  const initialDate = useMemo((): Date => {
    const urlDate = searchParams.get('date');
    if (urlDate) {
      const parsed = new Date(urlDate);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return getNow();
  }, [searchParams]);

  return { initialView, initialDate };
}

/**
 * Inner calendar view content wrapped by Suspense.
 */
function CalendarViewContent() {
  const { initialView, initialDate } = useInitialParams();

  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);

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

  // Persist view mode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendarViewMode', viewMode);
    }
  }, [viewMode]);

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
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="bg-zen-gradient texture-noise relative flex h-screen flex-col overflow-hidden"
    >
      {/* URL params syncer */}
      <UrlParamsSyncer viewMode={viewMode} currentDate={currentDate} />

      {/* Top toolbar */}
      <motion.div
        variants={toolbarVariants}
        initial="hidden"
        animate="visible"
        className="border-border/30 relative z-10 flex items-center justify-between border-b px-6 py-4"
      >
        <div className="flex items-center gap-3">
          <TodayButton onClick={handleTodayClick} />
          <DatePicker currentDate={currentDate} onSelect={handleDateChange} />
        </div>

        <motion.div
          className="bg-card/80 shadow-zen flex items-center gap-1 rounded-2xl p-1.5 backdrop-blur-sm"
          layout
        >
          {(['month', 'week', 'day'] as const).map((mode) => (
            <ViewButton
              key={mode}
              mode={mode}
              currentMode={viewMode}
              onClick={() => handleViewChange(mode)}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Calendar view */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="loading" {...viewTransition} className="h-full">
              <CalendarSkeleton />
            </motion.div>
          ) : (
            <motion.div key={viewMode} {...viewTransition} className="h-full">
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
    </motion.div>
  );
}

/**
 * Main calendar view page component.
 */
export default function CalendarViewPage() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarViewContent />
    </Suspense>
  );
}
