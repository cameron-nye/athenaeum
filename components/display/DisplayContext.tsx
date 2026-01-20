'use client';

/**
 * Display Data Context
 * REQ-3-009: React context to manage display data state
 * REQ-3-010: Support for real-time event updates
 */

import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import type { RealtimeEvent } from './RealtimeProvider';

export interface CalendarSource {
  id: string;
  name: string;
  color: string | null;
  provider: string;
  enabled: boolean;
}

export interface CalendarEvent {
  id: string;
  calendar_source_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  recurrence_rule: string | null;
}

export interface DisplayWidgets {
  clock: boolean;
  weather: boolean;
  upcomingEvents: boolean;
}

export interface SlideshowSettings {
  enabled: boolean;
  interval: number; // seconds
  order: 'random' | 'sequential';
  kenBurnsEnabled: boolean;
  showPhotoInfo: boolean;
  albumFilter: string | null;
}

export interface Photo {
  id: string;
  storage_path: string;
  filename: string;
  taken_at: string | null;
  album: string | null;
  enabled: boolean;
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'auto';
  layout: 'calendar' | 'agenda' | 'split';
  use24HourTime: boolean;
  burnInPreventionEnabled: boolean;
  ambientAnimationEnabled: boolean;
  widgetsEnabled: DisplayWidgets;
  scheduledReloadTime: string; // HH:mm format
  slideshow: SlideshowSettings;
  displayMode: 'calendar' | 'photos' | 'auto';
}

export interface DisplayState {
  events: CalendarEvent[];
  calendarSources: CalendarSource[];
  photos: Photo[];
  settings: DisplaySettings;
  lastUpdated: string | null;
  isLoading: boolean;
  error: string | null;
}

type DisplayAction =
  | { type: 'SET_EVENTS'; payload: CalendarEvent[] }
  | { type: 'ADD_EVENT'; payload: CalendarEvent }
  | { type: 'UPDATE_EVENT'; payload: CalendarEvent }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'SET_CALENDAR_SOURCES'; payload: CalendarSource[] }
  | { type: 'UPDATE_CALENDAR_SOURCE'; payload: CalendarSource }
  | { type: 'SET_PHOTOS'; payload: Photo[] }
  | { type: 'ADD_PHOTO'; payload: Photo }
  | { type: 'UPDATE_PHOTO'; payload: Photo }
  | { type: 'DELETE_PHOTO'; payload: string }
  | { type: 'SET_SETTINGS'; payload: DisplaySettings }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'REFRESH_TIMESTAMP' };

interface DisplayContextValue {
  state: DisplayState;
  setEvents: (events: CalendarEvent[]) => void;
  setCalendarSources: (sources: CalendarSource[]) => void;
  setPhotos: (photos: Photo[]) => void;
  setSettings: (settings: DisplaySettings) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  handleEventChange: (event: RealtimeEvent<CalendarEvent & { id: string }>) => void;
  handleCalendarSourceChange: (event: RealtimeEvent<CalendarSource & { id: string }>) => void;
  handlePhotoChange: (event: RealtimeEvent<Photo & { id: string }>) => void;
  refreshData: () => void;
}

const DisplayContext = createContext<DisplayContextValue | null>(null);

const DEFAULT_SLIDESHOW_SETTINGS: SlideshowSettings = {
  enabled: true,
  interval: 10,
  order: 'random',
  kenBurnsEnabled: true,
  showPhotoInfo: true,
  albumFilter: null,
};

const DEFAULT_SETTINGS: DisplaySettings = {
  theme: 'auto',
  layout: 'calendar',
  use24HourTime: false,
  burnInPreventionEnabled: true,
  ambientAnimationEnabled: true,
  widgetsEnabled: {
    clock: true,
    weather: false,
    upcomingEvents: true,
  },
  scheduledReloadTime: '03:00',
  slideshow: DEFAULT_SLIDESHOW_SETTINGS,
  displayMode: 'auto',
};

const initialState: DisplayState = {
  events: [],
  calendarSources: [],
  photos: [],
  settings: DEFAULT_SETTINGS,
  lastUpdated: null,
  isLoading: true,
  error: null,
};

function displayReducer(state: DisplayState, action: DisplayAction): DisplayState {
  switch (action.type) {
    case 'SET_EVENTS':
      return {
        ...state,
        events: action.payload,
        lastUpdated: new Date().toISOString(),
      };

    case 'ADD_EVENT':
      return {
        ...state,
        events: [...state.events, action.payload],
        lastUpdated: new Date().toISOString(),
      };

    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map((e) => (e.id === action.payload.id ? action.payload : e)),
        lastUpdated: new Date().toISOString(),
      };

    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter((e) => e.id !== action.payload),
        lastUpdated: new Date().toISOString(),
      };

    case 'SET_CALENDAR_SOURCES':
      return {
        ...state,
        calendarSources: action.payload,
        lastUpdated: new Date().toISOString(),
      };

    case 'UPDATE_CALENDAR_SOURCE':
      return {
        ...state,
        calendarSources: state.calendarSources.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
        lastUpdated: new Date().toISOString(),
      };

    case 'SET_PHOTOS':
      return {
        ...state,
        photos: action.payload,
        lastUpdated: new Date().toISOString(),
      };

    case 'ADD_PHOTO':
      return {
        ...state,
        photos: [...state.photos, action.payload],
        lastUpdated: new Date().toISOString(),
      };

    case 'UPDATE_PHOTO':
      return {
        ...state,
        photos: state.photos.map((p) => (p.id === action.payload.id ? action.payload : p)),
        lastUpdated: new Date().toISOString(),
      };

    case 'DELETE_PHOTO':
      return {
        ...state,
        photos: state.photos.filter((p) => p.id !== action.payload),
        lastUpdated: new Date().toISOString(),
      };

    case 'SET_SETTINGS':
      return {
        ...state,
        settings: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'REFRESH_TIMESTAMP':
      return {
        ...state,
        lastUpdated: new Date().toISOString(),
      };

    default:
      return state;
  }
}

export function DisplayProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(displayReducer, initialState);

  const setEvents = useCallback((events: CalendarEvent[]) => {
    dispatch({ type: 'SET_EVENTS', payload: events });
  }, []);

  const setCalendarSources = useCallback((sources: CalendarSource[]) => {
    dispatch({ type: 'SET_CALENDAR_SOURCES', payload: sources });
  }, []);

  const setPhotos = useCallback((photos: Photo[]) => {
    dispatch({ type: 'SET_PHOTOS', payload: photos });
  }, []);

  const setSettings = useCallback((settings: DisplaySettings) => {
    dispatch({ type: 'SET_SETTINGS', payload: settings });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const handleEventChange = useCallback((event: RealtimeEvent<CalendarEvent & { id: string }>) => {
    switch (event.eventType) {
      case 'INSERT':
        if (event.new) {
          dispatch({ type: 'ADD_EVENT', payload: event.new });
        }
        break;
      case 'UPDATE':
        if (event.new) {
          dispatch({ type: 'UPDATE_EVENT', payload: event.new });
        }
        break;
      case 'DELETE':
        if (event.old?.id) {
          dispatch({ type: 'DELETE_EVENT', payload: event.old.id });
        }
        break;
    }
  }, []);

  const handleCalendarSourceChange = useCallback(
    (event: RealtimeEvent<CalendarSource & { id: string }>) => {
      if (event.eventType === 'UPDATE' && event.new) {
        dispatch({ type: 'UPDATE_CALENDAR_SOURCE', payload: event.new });
      }
    },
    []
  );

  const handlePhotoChange = useCallback((event: RealtimeEvent<Photo & { id: string }>) => {
    switch (event.eventType) {
      case 'INSERT':
        if (event.new && event.new.enabled) {
          dispatch({ type: 'ADD_PHOTO', payload: event.new });
        }
        break;
      case 'UPDATE':
        if (event.new) {
          if (event.new.enabled) {
            dispatch({ type: 'UPDATE_PHOTO', payload: event.new });
          } else {
            // Photo disabled, remove from slideshow
            dispatch({ type: 'DELETE_PHOTO', payload: event.new.id });
          }
        }
        break;
      case 'DELETE':
        if (event.old?.id) {
          dispatch({ type: 'DELETE_PHOTO', payload: event.old.id });
        }
        break;
    }
  }, []);

  const refreshData = useCallback(() => {
    dispatch({ type: 'REFRESH_TIMESTAMP' });
  }, []);

  return (
    <DisplayContext.Provider
      value={{
        state,
        setEvents,
        setCalendarSources,
        setPhotos,
        setSettings,
        setLoading,
        setError,
        handleEventChange,
        handleCalendarSourceChange,
        handlePhotoChange,
        refreshData,
      }}
    >
      {children}
    </DisplayContext.Provider>
  );
}

export function useDisplayContext() {
  const context = useContext(DisplayContext);
  if (!context) {
    throw new Error('useDisplayContext must be used within DisplayProvider');
  }
  return context;
}

export function useDisplayEvents() {
  const { state } = useDisplayContext();
  return state.events;
}

export function useDisplayCalendarSources() {
  const { state } = useDisplayContext();
  return state.calendarSources;
}

export function useDisplayPhotos() {
  const { state } = useDisplayContext();
  return state.photos;
}

export function useDisplaySettings() {
  const { state } = useDisplayContext();
  return state.settings;
}

export function useDisplayStatus() {
  const { state } = useDisplayContext();
  return {
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
  };
}
