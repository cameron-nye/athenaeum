'use client';

/**
 * CreateEventPanel Component
 * Slide-up panel for creating calendar events from the display
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, Type, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDisplayContext, type CalendarSource } from './DisplayContext';

interface CreateEventPanelProps {
  isOpen: boolean;
  onClose: () => void;
  calendarSources: CalendarSource[];
  onCreated?: () => void;
}

type Step = 'title' | 'datetime' | 'location' | 'calendar';

export function CreateEventPanel({
  isOpen,
  onClose,
  calendarSources,
  onCreated,
}: CreateEventPanelProps) {
  const [step, setStep] = useState<Step>('title');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to only show Google calendars that can create events
  const writableCalendars = useMemo(() => {
    return calendarSources.filter((source) => source.provider === 'google');
  }, [calendarSources]);

  // Set default calendar
  useState(() => {
    if (writableCalendars.length > 0 && !selectedCalendarId) {
      setSelectedCalendarId(writableCalendars[0].id);
    }
  });

  const resetForm = useCallback(() => {
    setStep('title');
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('09:00');
    setEndTime('10:00');
    setIsAllDay(false);
    setLocation('');
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!selectedCalendarId) {
      setError('Please select a calendar');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build start and end times
      const startDateTime = isAllDay
        ? `${date}T00:00:00`
        : `${date}T${startTime}:00`;
      const endDateTime = isAllDay
        ? `${date}T23:59:59`
        : `${date}T${endTime}:00`;

      const response = await fetch('/api/display/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          start_time: startDateTime,
          end_time: endDateTime,
          all_day: isAllDay,
          location: location.trim() || null,
          calendar_source_id: selectedCalendarId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create event');
      }

      handleClose();
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, date, startTime, endTime, isAllDay, location, selectedCalendarId, handleClose, onCreated]);

  const goNext = useCallback(() => {
    const steps: Step[] = ['title', 'datetime', 'location', 'calendar'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    } else {
      handleSubmit();
    }
  }, [step, handleSubmit]);

  const goBack = useCallback(() => {
    const steps: Step[] = ['title', 'datetime', 'location', 'calendar'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  }, [step]);

  const canProceed = step === 'title' ? title.trim().length > 0 : true;

  // Quick date buttons
  const quickDates = useMemo(() => {
    const today = new Date();
    return [
      { label: 'Today', date: today },
      { label: 'Tomorrow', date: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      { label: 'This Weekend', date: getNextWeekend(today) },
      { label: 'Next Week', date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) },
    ];
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-neutral-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
              <button
                onClick={step === 'title' ? handleClose : goBack}
                className="flex items-center text-neutral-500 hover:text-neutral-700"
              >
                {step === 'title' ? (
                  <X className="h-6 w-6" />
                ) : (
                  <>
                    <ChevronLeft className="h-5 w-5" />
                    <span className="text-sm font-medium">Back</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <div className="text-lg font-semibold">New Event</div>
                <div className="text-xs text-neutral-500">
                  Step {['title', 'datetime', 'location', 'calendar'].indexOf(step) + 1} of 4
                </div>
              </div>

              <button
                onClick={goNext}
                disabled={!canProceed || isSubmitting}
                className={`flex items-center font-medium ${
                  canProceed && !isSubmitting
                    ? 'text-blue-500 hover:text-blue-600'
                    : 'text-neutral-300'
                }`}
              >
                {step === 'calendar' ? (
                  isSubmitting ? 'Creating...' : 'Create'
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 80px)' }}>
              {error && (
                <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-700">{error}</div>
              )}

              <AnimatePresence mode="wait">
                {/* Step 1: Title */}
                {step === 'title' && (
                  <motion.div
                    key="title"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <label className="block">
                      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        <Type className="h-4 w-4" />
                        Event title
                      </span>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Doctor's appointment"
                        autoFocus
                        className="w-full rounded-xl border border-neutral-300 px-4 py-4 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                      />
                    </label>
                  </motion.div>
                )}

                {/* Step 2: Date & Time */}
                {step === 'datetime' && (
                  <motion.div
                    key="datetime"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Quick date selection */}
                    <div>
                      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        <Calendar className="h-4 w-4" />
                        When?
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {quickDates.map(({ label, date: d }) => {
                          const dateStr = d.toISOString().split('T')[0];
                          return (
                            <button
                              key={label}
                              onClick={() => setDate(dateStr)}
                              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                date === dateStr
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="mt-3 w-full rounded-xl border border-neutral-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                      />
                    </div>

                    {/* All day toggle */}
                    <div className="flex items-center justify-between rounded-xl bg-neutral-100 p-4 dark:bg-neutral-700">
                      <span className="font-medium text-neutral-700 dark:text-neutral-200">
                        All-day event
                      </span>
                      <button
                        onClick={() => setIsAllDay(!isAllDay)}
                        className={`h-8 w-14 rounded-full transition-colors ${
                          isAllDay ? 'bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-600'
                        }`}
                      >
                        <div
                          className={`h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                            isAllDay ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Time inputs */}
                    {!isAllDay && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            <Clock className="h-4 w-4" />
                            Start time
                          </span>
                          <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full rounded-xl border border-neutral-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            <Clock className="h-4 w-4" />
                            End time
                          </span>
                          <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full rounded-xl border border-neutral-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 3: Location */}
                {step === 'location' && (
                  <motion.div
                    key="location"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <label className="block">
                      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        <MapPin className="h-4 w-4" />
                        Location (optional)
                      </span>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g., 123 Main St or Video call"
                        autoFocus
                        className="w-full rounded-xl border border-neutral-300 px-4 py-4 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                      />
                    </label>
                    <p className="text-sm text-neutral-500">
                      Adding a location makes it easy to get directions from the event details.
                    </p>
                  </motion.div>
                )}

                {/* Step 4: Calendar selection */}
                {step === 'calendar' && (
                  <motion.div
                    key="calendar"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Add to calendar
                    </div>

                    {writableCalendars.length === 0 ? (
                      <div className="rounded-xl bg-amber-100 p-4 text-amber-800">
                        No Google calendars connected. Connect a Google Calendar from the
                        dashboard to create events.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {writableCalendars.map((calendar) => (
                          <button
                            key={calendar.id}
                            onClick={() => setSelectedCalendarId(calendar.id)}
                            className={`flex w-full items-center gap-3 rounded-xl p-4 text-left transition-all ${
                              selectedCalendarId === calendar.id
                                ? 'bg-blue-100 ring-2 ring-blue-500 dark:bg-blue-900/30'
                                : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700'
                            }`}
                          >
                            <div
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: calendar.color || '#64748b' }}
                            />
                            <span className="font-medium text-neutral-700 dark:text-neutral-200">
                              {calendar.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Event summary */}
                    <div className="mt-6 rounded-xl bg-neutral-100 p-4 dark:bg-neutral-700">
                      <div className="mb-2 text-sm font-medium text-neutral-500">Summary</div>
                      <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                        {title}
                      </div>
                      <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                        {!isAllDay && ` at ${startTime}`}
                      </div>
                      {location && (
                        <div className="mt-1 text-sm text-neutral-500">{location}</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Safe area padding */}
            <div className="h-safe" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Helper to get next Saturday
function getNextWeekend(from: Date): Date {
  const daysUntilSaturday = (6 - from.getDay() + 7) % 7 || 7;
  return new Date(from.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);
}
