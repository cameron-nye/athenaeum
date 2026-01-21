'use client';

/**
 * SettingsQuickView Component
 * Quick settings panel for the display
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, RefreshCw, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { useDisplayContext } from '../DisplayContext';
import type { DisplayTheme } from '@/lib/display/types';

interface SettingsQuickViewProps {
  displayId: string;
  isOnline?: boolean;
}

export function SettingsQuickView({ displayId, isOnline = true }: SettingsQuickViewProps) {
  const { state, setSettings } = useDisplayContext();
  const { settings } = state;
  const [isReloading, setIsReloading] = useState(false);

  const handleThemeChange = (theme: DisplayTheme) => {
    setSettings({ ...settings, theme });
  };

  const handleToggle = (key: 'burnInPreventionEnabled' | 'ambientAnimationEnabled') => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleReload = () => {
    setIsReloading(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const themeOptions: { id: DisplayTheme; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: 'Light', icon: <Sun className="h-5 w-5" /> },
    { id: 'dark', label: 'Dark', icon: <Moon className="h-5 w-5" /> },
    { id: 'auto', label: 'Auto', icon: <Monitor className="h-5 w-5" /> },
  ];

  return (
    <div className="flex h-full flex-col p-6 pb-24">
      <h1 className="mb-8 text-3xl font-bold">Display Settings</h1>

      <div className="grid max-w-2xl gap-6">
        {/* Connection status */}
        <div className="rounded-xl bg-neutral-100 p-4 dark:bg-neutral-800">
          <div className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Connection
          </div>
          <div className="flex items-center gap-3">
            {isOnline ? (
              <>
                <Wifi className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-600 dark:text-green-400">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-600 dark:text-red-400">Offline</span>
              </>
            )}
          </div>
          <div className="mt-2 text-sm text-neutral-500">Display ID: {displayId.slice(0, 8)}...</div>
        </div>

        {/* Theme */}
        <div className="rounded-xl bg-neutral-100 p-4 dark:bg-neutral-800">
          <div className="mb-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Theme
          </div>
          <div className="flex gap-3">
            {themeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleThemeChange(option.id)}
                className={`flex flex-1 flex-col items-center gap-2 rounded-lg p-4 transition-colors ${
                  settings.theme === option.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-neutral-700 hover:bg-neutral-50 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600'
                }`}
              >
                {option.icon}
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Display options */}
        <div className="rounded-xl bg-neutral-100 p-4 dark:bg-neutral-800">
          <div className="mb-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Display Options
          </div>
          <div className="space-y-3">
            <ToggleOption
              label="Burn-in Prevention"
              description="Subtle pixel shifting to prevent screen burn"
              enabled={settings.burnInPreventionEnabled}
              onToggle={() => handleToggle('burnInPreventionEnabled')}
            />
            <ToggleOption
              label="Ambient Animation"
              description="Subtle background animation"
              enabled={settings.ambientAnimationEnabled}
              onToggle={() => handleToggle('ambientAnimationEnabled')}
            />
          </div>
        </div>

        {/* Time format */}
        <div className="rounded-xl bg-neutral-100 p-4 dark:bg-neutral-800">
          <div className="mb-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Time Format
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setSettings({ ...settings, use24HourTime: false })}
              className={`flex-1 rounded-lg p-3 transition-colors ${
                !settings.use24HourTime
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
              }`}
            >
              12-hour (3:30 PM)
            </button>
            <button
              onClick={() => setSettings({ ...settings, use24HourTime: true })}
              className={`flex-1 rounded-lg p-3 transition-colors ${
                settings.use24HourTime
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
              }`}
            >
              24-hour (15:30)
            </button>
          </div>
        </div>

        {/* Reload button */}
        <button
          onClick={handleReload}
          disabled={isReloading}
          className="flex items-center justify-center gap-2 rounded-xl bg-neutral-200 p-4 text-neutral-700 transition-colors hover:bg-neutral-300 disabled:opacity-50 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
        >
          <motion.div animate={isReloading ? { rotate: 360 } : {}} transition={{ duration: 1, repeat: Infinity }}>
            <RefreshCw className="h-5 w-5" />
          </motion.div>
          <span className="font-medium">{isReloading ? 'Reloading...' : 'Reload Display'}</span>
        </button>
      </div>
    </div>
  );
}

function ToggleOption({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-lg bg-white p-3 text-left transition-colors hover:bg-neutral-50 dark:bg-neutral-700 dark:hover:bg-neutral-600"
    >
      <div>
        <div className="font-medium text-neutral-900 dark:text-white">{label}</div>
        <div className="text-sm text-neutral-500 dark:text-neutral-400">{description}</div>
      </div>
      <div
        className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
          enabled ? 'bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-500'
        }`}
      >
        <motion.div
          animate={{ x: enabled ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="h-5 w-5 rounded-full bg-white shadow-sm"
        />
      </div>
    </button>
  );
}
