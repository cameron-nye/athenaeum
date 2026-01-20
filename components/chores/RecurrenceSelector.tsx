'use client';

/**
 * Recurrence selector component for chore scheduling
 * REQ-5-012: Create recurrence selector component
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RecurrenceConfig,
  RecurrenceType,
  WEEKDAY_SHORT_LABELS,
  generateRRule,
  parseRRuleToConfig,
  parseRRuleToText,
  jsWeekdayToRRule,
} from '@/lib/chores/recurrence';

interface RecurrenceSelectorProps {
  /** Current RRULE string value (controlled) */
  value?: string | null;
  /** Start date for the recurrence (used when generating RRULE) */
  startDate: Date;
  /** Callback when recurrence changes, provides RRULE string or null */
  onChange: (rrule: string | null) => void;
  /** Optional class name */
  className?: string;
}

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

export function RecurrenceSelector({
  value,
  startDate,
  onChange,
  className,
}: RecurrenceSelectorProps) {
  // Derive config from controlled value prop (fully controlled component)
  const config = useMemo(() => parseRRuleToConfig(value ?? null), [value]);

  const [isExpanded, setIsExpanded] = useState(false);

  // Generate RRULE and notify parent when config changes
  const handleConfigChange = useCallback(
    (newConfig: RecurrenceConfig) => {
      const rrule = generateRRule(newConfig, startDate);
      onChange(rrule);
    },
    [startDate, onChange]
  );

  // Handle type change
  const handleTypeChange = useCallback(
    (type: RecurrenceType) => {
      const newConfig: RecurrenceConfig = { type };

      // Set sensible defaults for weekly/monthly
      if (type === 'weekly' || type === 'biweekly') {
        // Default to the weekday of the start date
        newConfig.weekday = jsWeekdayToRRule(startDate.getDay());
      } else if (type === 'monthly') {
        // Default to the day of month from start date
        newConfig.monthday = startDate.getDate();
      }

      handleConfigChange(newConfig);
      setIsExpanded(type !== 'none' && type !== 'daily');
    },
    [startDate, handleConfigChange]
  );

  // Handle weekday selection
  const handleWeekdayChange = useCallback(
    (weekday: number) => {
      handleConfigChange({ ...config, weekday });
    },
    [config, handleConfigChange]
  );

  // Handle monthday change
  const handleMonthdayChange = useCallback(
    (monthday: number) => {
      handleConfigChange({ ...config, monthday });
    },
    [config, handleConfigChange]
  );

  // Generate display text
  const displayText = useMemo(() => {
    if (config.type === 'none') return 'Does not repeat';
    const rrule = generateRRule(config, startDate);
    return parseRRuleToText(rrule);
  }, [config, startDate]);

  const showWeekdaySelector = config.type === 'weekly' || config.type === 'biweekly';
  const showMonthdaySelector = config.type === 'monthly';
  const showAdvanced = showWeekdaySelector || showMonthdaySelector;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main type selector */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Repeat
          </span>
        </label>
        <select
          value={config.type}
          onChange={(e) => handleTypeChange(e.target.value as RecurrenceType)}
          className={cn(
            'w-full rounded-xl border bg-white px-4 py-2.5 dark:bg-gray-900',
            'border-gray-200 dark:border-gray-700',
            'focus:border-transparent focus:ring-2 focus:ring-indigo-500',
            'text-gray-900 dark:text-white'
          )}
        >
          {RECURRENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Advanced options */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Toggle for advanced options */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2',
                'bg-gray-50 dark:bg-gray-800/50',
                'text-sm text-gray-600 dark:text-gray-400',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'transition-colors'
              )}
            >
              <span>
                {isExpanded ? 'Hide options' : 'Customize schedule'}
                {!isExpanded && <span className="ml-2 text-gray-400">({displayText})</span>}
              </span>
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
              />
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="mt-3"
                >
                  {/* Weekday selector */}
                  {showWeekdaySelector && (
                    <WeekdaySelector value={config.weekday} onChange={handleWeekdayChange} />
                  )}

                  {/* Month day selector */}
                  {showMonthdaySelector && (
                    <MonthdaySelector value={config.monthday} onChange={handleMonthdayChange} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview text */}
      {config.type !== 'none' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-500 dark:text-gray-400"
        >
          {displayText}
        </motion.p>
      )}
    </div>
  );
}

/**
 * Weekday selector for weekly/biweekly recurrence
 */
function WeekdaySelector({
  value,
  onChange,
}: {
  value?: number;
  onChange: (weekday: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-gray-600 dark:text-gray-400">On which day?</label>
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_SHORT_LABELS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => onChange(index)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium',
              'transition-all duration-150',
              value === index
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Month day selector for monthly recurrence
 */
function MonthdaySelector({
  value,
  onChange,
}: {
  value?: number;
  onChange: (monthday: number) => void;
}) {
  // Generate array of 1-31
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  return (
    <div>
      <label className="mb-2 block text-sm text-gray-600 dark:text-gray-400">
        On which day of the month?
      </label>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => onChange(day)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg text-sm',
              'transition-all duration-150',
              value === day
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            )}
          >
            {day}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        Note: Months with fewer days will use the last available day.
      </p>
    </div>
  );
}

export default RecurrenceSelector;
