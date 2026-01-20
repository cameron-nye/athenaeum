'use client';

/**
 * Display Mode Controller
 * REQ-4-017: Idle detection for slideshow trigger
 * REQ-4-018: Slideshow mode toggle
 *
 * Handles switching between calendar and slideshow modes with smooth transitions.
 * Supports auto mode (switches based on event activity), always calendar, or always photos.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DisplayCalendar } from './Calendar';
import { Slideshow } from './Slideshow';
import type { CalendarEvent, CalendarSource, DisplaySettings, Photo } from './DisplayContext';

export interface DisplayModeControllerProps {
  events: CalendarEvent[];
  calendarSources: CalendarSource[];
  photos: Photo[];
  settings: DisplaySettings;
  householdName?: string;
  timezone?: string;
}

// Time constants
const IDLE_CHECK_INTERVAL = 60 * 1000; // Check every minute
const DEFAULT_IDLE_THRESHOLD_HOURS = 2; // Consider "idle" if no events in next 2 hours

/**
 * Check if there are upcoming events within the threshold
 */
function hasUpcomingEvents(
  events: CalendarEvent[],
  thresholdHours: number = DEFAULT_IDLE_THRESHOLD_HOURS
): boolean {
  const now = new Date();
  const threshold = new Date(now.getTime() + thresholdHours * 60 * 60 * 1000);

  return events.some((event) => {
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);

    // Event is upcoming if it starts before threshold and hasn't ended yet
    return startTime <= threshold && endTime >= now;
  });
}

export function DisplayModeController({
  events,
  calendarSources,
  photos,
  settings,
  householdName,
  timezone,
}: DisplayModeControllerProps) {
  const { displayMode, slideshow } = settings;

  // Track current mode and manual override
  const [currentMode, setCurrentMode] = useState<'calendar' | 'photos'>('calendar');
  const [manualOverride, setManualOverride] = useState<'calendar' | 'photos' | null>(null);

  // Filter enabled photos for slideshow
  const enabledPhotos = useMemo(() => photos.filter((p) => p.enabled), [photos]);

  // Convert photos to slideshow format
  const slideshowPhotos = useMemo(
    () =>
      enabledPhotos.map((p) => ({
        id: p.id,
        storage_path: p.storage_path,
        filename: p.filename,
        taken_at: p.taken_at,
        album: p.album,
      })),
    [enabledPhotos]
  );

  // Determine the active mode based on settings and conditions
  const activeMode = useMemo(() => {
    // Manual override takes precedence
    if (manualOverride) {
      return manualOverride;
    }

    // Fixed mode settings
    if (displayMode === 'calendar') {
      return 'calendar';
    }
    if (displayMode === 'photos') {
      return enabledPhotos.length > 0 ? 'photos' : 'calendar';
    }

    // Auto mode: switch based on event activity
    return currentMode;
  }, [displayMode, manualOverride, currentMode, enabledPhotos.length]);

  // Auto mode: check for upcoming events periodically
  useEffect(() => {
    if (displayMode !== 'auto' || manualOverride) return;

    const checkIdleStatus = () => {
      const hasEvents = hasUpcomingEvents(events);

      if (hasEvents) {
        setCurrentMode('calendar');
      } else if (enabledPhotos.length > 0 && slideshow.enabled) {
        setCurrentMode('photos');
      }
    };

    // Initial check
    checkIdleStatus();

    // Periodic checks
    const interval = setInterval(checkIdleStatus, IDLE_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [displayMode, manualOverride, events, enabledPhotos.length, slideshow.enabled]);

  // Keyboard shortcut for manual toggle (Ctrl+P or Cmd+P)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setManualOverride((prev) => {
          if (prev === null) {
            // First toggle: switch to opposite of current
            return activeMode === 'calendar' ? 'photos' : 'calendar';
          } else if (prev === 'calendar') {
            // Toggle to photos
            return 'photos';
          } else {
            // Clear override, return to auto
            return null;
          }
        });
      }
    },
    [activeMode]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Callback when slideshow has no photos
  const handleNoPhotos = useCallback(() => {
    setCurrentMode('calendar');
    setManualOverride(null);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {activeMode === 'calendar' ? (
        <motion.div
          key="calendar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="h-full w-full"
        >
          <DisplayCalendar
            events={events}
            calendarSources={calendarSources}
            settings={settings}
            householdName={householdName}
            timezone={timezone}
          />
        </motion.div>
      ) : (
        <motion.div
          key="slideshow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="h-full w-full"
        >
          <Slideshow photos={slideshowPhotos} settings={slideshow} onNoPhotos={handleNoPhotos} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
