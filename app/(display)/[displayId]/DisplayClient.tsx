'use client';

/**
 * Display Client Component
 * REQ-3-005: Client-side wrapper for display with real-time updates
 * REQ-3-010: Real-time event updates with smooth animations
 * REQ-3-013: Theme support with smooth transitions
 * REQ-3-016: Scheduled page reload
 * REQ-3-029: Heartbeat mechanism
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import type { DisplayTheme } from '@/lib/display/types';
import { DisplayProvider, useDisplayContext } from '@/components/display/DisplayContext';
import { RealtimeProvider } from '@/components/display/RealtimeProvider';
import { DisplayCalendar } from '@/components/display/Calendar';
import { LoadingSkeleton } from '@/components/display/LoadingSkeleton';
import { ErrorState } from '@/components/display/ErrorState';
import { OfflineIndicator } from '@/components/display/OfflineIndicator';
import { DebugOverlay } from '@/components/display/DebugOverlay';
import type { RealtimeStatus } from '@/components/display/RealtimeProvider';
import type { DisplaySettings } from '@/lib/display/types';

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
  initialSettings: DisplaySettings;
  householdId: string;
  householdName: string;
}

/**
 * Hook for applying theme to document (REQ-3-013)
 * Handles light/dark/auto themes with smooth CSS transitions
 */
function useTheme(themeSetting: DisplayTheme) {
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Resolve 'auto' to system preference
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

    // Listen for system preference changes when in auto mode
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
    handlePhotoChange,
    setError,
    refreshData,
  } = useDisplayContext();

  // Apply theme from settings (REQ-3-013)
  useTheme(state.settings.theme);

  // Track realtime status for debug overlay
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Heartbeat mechanism (REQ-3-029)
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch('/api/displays/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayId }),
      });
    } catch {
      // Silently fail - will retry on next interval
    }
  }, [displayId]);

  useEffect(() => {
    // Send heartbeat every 5 minutes
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

      // If reload time has passed today, schedule for tomorrow
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

  // Retry function for error state
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
      onPhotosChange={handlePhotoChange}
      onStatusChange={setRealtimeStatus}
      onError={(err) => setError(err.message)}
    >
      <DisplayCalendar
        events={state.events}
        calendarSources={state.calendarSources}
        settings={state.settings}
        householdName={householdName}
      />
      <OfflineIndicator />
      <DebugOverlay
        displayId={displayId}
        householdId={householdId}
        realtimeStatus={realtimeStatus}
        lastUpdated={state.lastUpdated}
        eventCount={state.events.length}
        calendarSourceCount={state.calendarSources.length}
        photoCount={state.photos.length}
      />
    </RealtimeProvider>
  );
}

function DisplayInitializer({
  initialEvents,
  initialCalendarSources,
  initialSettings,
  children,
}: {
  initialEvents: DisplayClientProps['initialEvents'];
  initialCalendarSources: DisplayClientProps['initialCalendarSources'];
  initialSettings: DisplaySettings;
  children: React.ReactNode;
}) {
  const { setEvents, setCalendarSources, setSettings, setLoading } = useDisplayContext();

  useEffect(() => {
    setEvents(initialEvents);
    setCalendarSources(initialCalendarSources);
    setSettings(initialSettings);
    setLoading(false);
  }, [
    initialEvents,
    initialCalendarSources,
    initialSettings,
    setEvents,
    setCalendarSources,
    setSettings,
    setLoading,
  ]);

  return <>{children}</>;
}

export function DisplayClient({
  displayId,
  initialEvents,
  initialCalendarSources,
  initialSettings,
  householdId,
  householdName,
}: DisplayClientProps) {
  return (
    <DisplayProvider>
      <DisplayInitializer
        initialEvents={initialEvents}
        initialCalendarSources={initialCalendarSources}
        initialSettings={initialSettings}
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
