'use client';

/**
 * Display Client Component
 * Display-first architecture with view switching and touch interactions
 * REQ-3-005: Client-side wrapper for display with real-time updates
 * REQ-3-010: Real-time event updates with smooth animations
 * REQ-3-013: Theme support with smooth transitions
 * REQ-3-016: Scheduled page reload
 * REQ-3-029: Heartbeat mechanism
 */

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DisplayTheme } from '@/lib/display/types';
import {
  DisplayProvider,
  useDisplayContext,
  type DisplayView,
  type HouseholdMember,
} from '@/components/display/DisplayContext';
import { RealtimeProvider } from '@/components/display/RealtimeProvider';
import { LoadingSkeleton } from '@/components/display/LoadingSkeleton';
import { ErrorState } from '@/components/display/ErrorState';
import { OfflineIndicator } from '@/components/display/OfflineIndicator';
import { DebugOverlay } from '@/components/display/DebugOverlay';
import { NavigationDock } from '@/components/display/NavigationDock';
import { CalendarView } from '@/components/display/views/CalendarView';
import { ChoresView } from '@/components/display/views/ChoresView';
import { PhotosView } from '@/components/display/views/PhotosView';
import { SettingsQuickView } from '@/components/display/views/SettingsQuickView';
import type { RealtimeStatus } from '@/components/display/RealtimeProvider';
import type { DisplaySettings } from '@/lib/display/types';

interface ChoreAssignment {
  id: string;
  chore_id: string;
  due_date: string;
  assigned_to: string | null;
  completed_at: string | null;
  completed_by?: string | null;
  chore: {
    id: string;
    title: string;
    icon: string | null;
    points: number;
  };
  user?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  completer?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface DisplayClientProps {
  displayId: string;
  initialEvents: Array<{
    id: string;
    calendar_source_id: string;
    title: string;
    description: string | null;
    location: string | null;
    start_time: string;
    end_time: string;
    all_day: boolean;
    recurrence_rule: string | null;
  }>;
  initialCalendarSources: Array<{
    id: string;
    name: string;
    color: string | null;
    provider: string;
    enabled: boolean;
  }>;
  initialChoreAssignments: ChoreAssignment[];
  initialSettings: DisplaySettings;
  householdId: string;
  householdName: string;
  initialHouseholdMembers?: HouseholdMember[];
}

/**
 * Hook for applying theme to document (REQ-3-013)
 * Handles light/dark/auto themes with smooth CSS transitions
 */
function useTheme(themeSetting: DisplayTheme) {
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const getResolvedTheme = (): 'light' | 'dark' => {
      if (themeSetting === 'auto') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return themeSetting;
    };

    const applyTheme = (theme: 'light' | 'dark') => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      setResolvedTheme(theme);
    };

    applyTheme(getResolvedTheme());

    if (themeSetting === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeSetting]);

  return resolvedTheme;
}

const viewVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
};

// View order for animation direction - constant array
const VIEW_ORDER: DisplayView[] = ['calendar', 'chores', 'photos', 'settings'];

function DisplayContent({
  displayId,
  householdId,
  householdName,
}: {
  displayId: string;
  householdId: string;
  householdName: string;
}) {
  const {
    state,
    handleEventChange,
    handleCalendarSourceChange,
    handleChoreAssignmentChange,
    setError,
    refreshData,
    setActiveView,
  } = useDisplayContext();

  // Track view navigation direction for animations
  const [viewDirection, setViewDirection] = useState(0);
  const previousViewRef = useRef<DisplayView>(state.activeView);

  // Apply theme from settings
  useTheme(state.settings.theme);

  // Track realtime status for debug overlay
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleViewChange = useCallback(
    (newView: DisplayView) => {
      const currentIndex = VIEW_ORDER.indexOf(state.activeView);
      const newIndex = VIEW_ORDER.indexOf(newView);
      setViewDirection(newIndex > currentIndex ? 1 : -1);
      previousViewRef.current = state.activeView;
      setActiveView(newView);
    },
    [state.activeView, setActiveView]
  );

  // Calculate overdue count for dock badge
  const overdueCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return state.choreAssignments.filter((a) => !a.completed_at && a.due_date < today).length;
  }, [state.choreAssignments]);

  // Heartbeat mechanism (REQ-3-029)
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch('/api/displays/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayId }),
      });
    } catch {
      // Silently fail
    }
  }, [displayId]);

  useEffect(() => {
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 5 * 60 * 1000);
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [sendHeartbeat]);

  // Scheduled page reload (REQ-3-016)
  useEffect(() => {
    const scheduleReload = () => {
      const now = new Date();
      const [hours, minutes] = state.settings.scheduledReloadTime?.split(':').map(Number) || [3, 0];
      const reloadTime = new Date(now);
      reloadTime.setHours(hours, minutes, 0, 0);

      if (reloadTime <= now) {
        reloadTime.setDate(reloadTime.getDate() + 1);
      }

      const msUntilReload = reloadTime.getTime() - now.getTime();
      reloadTimeoutRef.current = setTimeout(() => {
        window.location.reload();
      }, msUntilReload);
    };

    scheduleReload();
    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [state.settings.scheduledReloadTime]);

  const handleRetry = useCallback(() => {
    setError(null);
    refreshData();
    window.location.reload();
  }, [setError, refreshData]);

  if (state.error) {
    return <ErrorState error={state.error} onRetry={handleRetry} />;
  }

  if (state.isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <RealtimeProvider
      householdId={householdId}
      onEventsChange={handleEventChange}
      onCalendarSourcesChange={handleCalendarSourceChange}
      onChoreAssignmentsChange={handleChoreAssignmentChange}
      onStatusChange={setRealtimeStatus}
      onError={(err) => setError(err.message)}
    >
      <div
        className={`relative h-screen w-screen overflow-hidden ${
          state.settings.ambientAnimationEnabled ? 'display-ambient-bg' : 'bg-background'
        } ${state.settings.burnInPreventionEnabled ? 'display-burnin-prevention' : ''}`}
      >
        {/* Main content area with view switching */}
        <AnimatePresence mode="wait" custom={viewDirection}>
          <motion.div
            key={state.activeView}
            custom={viewDirection}
            variants={viewVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute inset-0"
          >
            {state.activeView === 'calendar' && (
              <CalendarView householdName={householdName} />
            )}
            {state.activeView === 'chores' && (
              <ChoresView householdMembers={state.householdMembers} />
            )}
            {state.activeView === 'photos' && <PhotosView />}
            {state.activeView === 'settings' && (
              <SettingsQuickView displayId={displayId} isOnline={realtimeStatus === 'connected'} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation dock */}
        <NavigationDock
          activeView={state.activeView}
          onViewChange={handleViewChange}
          overdueCount={overdueCount}
        />

        {/* Overlays */}
        <OfflineIndicator />
        <DebugOverlay
          displayId={displayId}
          householdId={householdId}
          realtimeStatus={realtimeStatus}
          lastUpdated={state.lastUpdated}
          eventCount={state.events.length}
          calendarSourceCount={state.calendarSources.length}
        />
      </div>
    </RealtimeProvider>
  );
}

function DisplayInitializer({
  initialEvents,
  initialCalendarSources,
  initialChoreAssignments,
  initialSettings,
  initialHouseholdMembers,
  children,
}: {
  initialEvents: DisplayClientProps['initialEvents'];
  initialCalendarSources: DisplayClientProps['initialCalendarSources'];
  initialChoreAssignments: DisplayClientProps['initialChoreAssignments'];
  initialSettings: DisplaySettings;
  initialHouseholdMembers?: HouseholdMember[];
  children: React.ReactNode;
}) {
  const {
    setEvents,
    setCalendarSources,
    setChoreAssignments,
    setSettings,
    setLoading,
    setHouseholdMembers,
  } = useDisplayContext();

  useEffect(() => {
    setEvents(initialEvents);
    setCalendarSources(initialCalendarSources);
    setChoreAssignments(initialChoreAssignments);
    setSettings(initialSettings);
    if (initialHouseholdMembers) {
      setHouseholdMembers(initialHouseholdMembers);
    }
    setLoading(false);
  }, [
    initialEvents,
    initialCalendarSources,
    initialChoreAssignments,
    initialSettings,
    initialHouseholdMembers,
    setEvents,
    setCalendarSources,
    setChoreAssignments,
    setSettings,
    setHouseholdMembers,
    setLoading,
  ]);

  // Fetch household members if not provided
  useEffect(() => {
    if (!initialHouseholdMembers) {
      fetch('/api/display/household/members')
        .then((res) => res.json())
        .then((data) => {
          if (data.members) {
            setHouseholdMembers(data.members);
          }
        })
        .catch(console.error);
    }
  }, [initialHouseholdMembers, setHouseholdMembers]);

  return <>{children}</>;
}

export function DisplayClient({
  displayId,
  initialEvents,
  initialCalendarSources,
  initialChoreAssignments,
  initialSettings,
  householdId,
  householdName,
  initialHouseholdMembers,
}: DisplayClientProps) {
  return (
    <DisplayProvider>
      <DisplayInitializer
        initialEvents={initialEvents}
        initialCalendarSources={initialCalendarSources}
        initialChoreAssignments={initialChoreAssignments}
        initialSettings={initialSettings}
        initialHouseholdMembers={initialHouseholdMembers}
      >
        <DisplayContent
          displayId={displayId}
          householdId={householdId}
          householdName={householdName}
        />
      </DisplayInitializer>
    </DisplayProvider>
  );
}
