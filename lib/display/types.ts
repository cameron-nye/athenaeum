/**
 * Display settings and types for Raspberry Pi wall displays
 * REQ-3-011: Define JSON schema for display settings
 */

export type DisplayTheme = 'light' | 'dark' | 'auto';

export type DisplayLayout = 'calendar' | 'agenda' | 'split';

export interface DisplayWidgets {
  clock: boolean;
  weather: boolean;
  upcomingEvents: boolean;
}

export interface DisplaySettings {
  theme: DisplayTheme;
  layout: DisplayLayout;
  widgetsEnabled: DisplayWidgets;
  refreshInterval: number; // minutes
  scheduledReloadTime: string; // HH:mm format, e.g., "03:00"
  burnInPreventionEnabled: boolean;
  ambientAnimationEnabled: boolean;
  use24HourTime: boolean;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  theme: 'auto',
  layout: 'calendar',
  widgetsEnabled: {
    clock: true,
    weather: false, // disabled by default until weather feature exists
    upcomingEvents: true,
  },
  refreshInterval: 5,
  scheduledReloadTime: '03:00',
  burnInPreventionEnabled: true,
  ambientAnimationEnabled: true,
  use24HourTime: false,
};

export interface Display {
  id: string;
  household_id: string;
  name: string;
  auth_token: string;
  settings: DisplaySettings;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisplayWithStatus extends Display {
  isOnline: boolean;
}

/**
 * Parse and validate display settings from JSONB
 * Returns default settings for any missing/invalid fields
 */
export function parseDisplaySettings(raw: Record<string, unknown> | null): DisplaySettings {
  if (!raw) {
    return { ...DEFAULT_DISPLAY_SETTINGS };
  }

  const theme = validateTheme(raw.theme);
  const layout = validateLayout(raw.layout);
  const widgetsEnabled = validateWidgets(raw.widgetsEnabled);
  const refreshInterval = validateNumber(raw.refreshInterval, 5, 1, 60);
  const scheduledReloadTime = validateTimeString(raw.scheduledReloadTime, '03:00');
  const burnInPreventionEnabled = validateBoolean(raw.burnInPreventionEnabled, true);
  const ambientAnimationEnabled = validateBoolean(raw.ambientAnimationEnabled, true);
  const use24HourTime = validateBoolean(raw.use24HourTime, false);

  return {
    theme,
    layout,
    widgetsEnabled,
    refreshInterval,
    scheduledReloadTime,
    burnInPreventionEnabled,
    ambientAnimationEnabled,
    use24HourTime,
  };
}

function validateTheme(value: unknown): DisplayTheme {
  if (value === 'light' || value === 'dark' || value === 'auto') {
    return value;
  }
  return DEFAULT_DISPLAY_SETTINGS.theme;
}

function validateLayout(value: unknown): DisplayLayout {
  if (value === 'calendar' || value === 'agenda' || value === 'split') {
    return value;
  }
  return DEFAULT_DISPLAY_SETTINGS.layout;
}

function validateWidgets(value: unknown): DisplayWidgets {
  if (typeof value !== 'object' || value === null) {
    return { ...DEFAULT_DISPLAY_SETTINGS.widgetsEnabled };
  }

  const obj = value as Record<string, unknown>;
  return {
    clock: typeof obj.clock === 'boolean' ? obj.clock : true,
    weather: typeof obj.weather === 'boolean' ? obj.weather : false,
    upcomingEvents: typeof obj.upcomingEvents === 'boolean' ? obj.upcomingEvents : true,
  };
}

function validateNumber(value: unknown, defaultValue: number, min: number, max: number): number {
  if (typeof value === 'number' && value >= min && value <= max) {
    return value;
  }
  return defaultValue;
}

function validateTimeString(value: unknown, defaultValue: string): string {
  if (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return value;
  }
  return defaultValue;
}

function validateBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  return defaultValue;
}

/**
 * Check if a display is considered online based on last_seen_at
 * Online if seen within the last 10 minutes
 */
export function isDisplayOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) {
    return false;
  }

  const lastSeen = new Date(lastSeenAt);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  return lastSeen > tenMinutesAgo;
}

/**
 * Generate a secure random token for display authentication
 */
export function generateDisplayToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
