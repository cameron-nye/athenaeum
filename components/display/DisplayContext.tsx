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
  chores: boolean;
}

export interface ChoreAssignment {
  id: string;
  chore_id: string;
  due_date: string;
  assigned_to: string | null;
  completed_at: string | null;
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
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'auto';
  layout: 'calendar' | 'agenda' | 'split';
  use24HourTime: boolean;
  burnInPreventionEnabled: boolean;
  ambientAnimationEnabled: boolean;
  widgetsEnabled: DisplayWidgets;
  scheduledReloadTime: string; // HH:mm format
}

export interface DisplayState {
  events: CalendarEvent[];
  calendarSources: CalendarSource[];
  choreAssignments: ChoreAssignment[];
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
  | { type: 'SET_CHORE_ASSIGNMENTS'; payload: ChoreAssignment[] }
  | { type: 'ADD_CHORE_ASSIGNMENT'; payload: ChoreAssignment }
  | { type: 'UPDATE_CHORE_ASSIGNMENT'; payload: ChoreAssignment }
  | { type: 'DELETE_CHORE_ASSIGNMENT'; payload: string }
  | { type: 'SET_SETTINGS'; payload: DisplaySettings }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'REFRESH_TIMESTAMP' };

// Database record type for realtime updates (without joined data)
export interface ChoreAssignmentRecord {
  id: string;
  chore_id: string;
  assigned_to: string | null;
  due_date: string;
  recurrence_rule: string | null;
  completed_at: string | null;
  created_at: string;
}

interface DisplayContextValue {
  state: DisplayState;
  setEvents: (events: CalendarEvent[]) => void;
  setCalendarSources: (sources: CalendarSource[]) => void;
  setChoreAssignments: (assignments: ChoreAssignment[]) => void;
  setSettings: (settings: DisplaySettings) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  handleEventChange: (event: RealtimeEvent<CalendarEvent & { id: string }>) => void;
  handleCalendarSourceChange: (event: RealtimeEvent<CalendarSource & { id: string }>) => void;
  handleChoreAssignmentChange: (event: RealtimeEvent<ChoreAssignmentRecord>) => void;
  refreshData: () => void;
}

const DisplayContext = createContext<DisplayContextValue | null>(null);

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
    chores: true,
  },
  scheduledReloadTime: '03:00',
};

const initialState: DisplayState = {
  events: [],
  calendarSources: [],
  choreAssignments: [],
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

    case 'SET_CHORE_ASSIGNMENTS':
      return {
        ...state,
        choreAssignments: action.payload,
        lastUpdated: new Date().toISOString(),
      };

    case 'ADD_CHORE_ASSIGNMENT':
      return {
        ...state,
        choreAssignments: [...state.choreAssignments, action.payload],
        lastUpdated: new Date().toISOString(),
      };

    case 'UPDATE_CHORE_ASSIGNMENT':
      return {
        ...state,
        choreAssignments: state.choreAssignments.map((a) =>
          a.id === action.payload.id
            ? {
                ...action.payload,
                // Preserve existing chore/user data if the update doesn't have it
                chore: action.payload.chore.title ? action.payload.chore : a.chore,
                user: action.payload.user || a.user,
              }
            : a
        ),
        lastUpdated: new Date().toISOString(),
      };

    case 'DELETE_CHORE_ASSIGNMENT':
      return {
        ...state,
        choreAssignments: state.choreAssignments.filter((a) => a.id !== action.payload),
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

  const setChoreAssignments = useCallback((assignments: ChoreAssignment[]) => {
    dispatch({ type: 'SET_CHORE_ASSIGNMENTS', payload: assignments });
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

  const handleChoreAssignmentChange = useCallback((event: RealtimeEvent<ChoreAssignmentRecord>) => {
    switch (event.eventType) {
      case 'INSERT':
        // For INSERT, we don't have the joined chore/user data
        // The page will need to refresh to get complete data
        // For now, trigger a timestamp refresh to indicate data changed
        dispatch({ type: 'REFRESH_TIMESTAMP' });
        break;
      case 'UPDATE':
        // For UPDATE, we can update the mutable fields (completed_at, due_date, assigned_to)
        // but we keep the existing chore/user data since those likely didn't change
        if (event.new) {
          const updated = event.new;
          dispatch({
            type: 'UPDATE_CHORE_ASSIGNMENT',
            payload: {
              id: updated.id,
              chore_id: updated.chore_id,
              due_date: updated.due_date,
              assigned_to: updated.assigned_to,
              completed_at: updated.completed_at,
              // Placeholder chore - the reducer will merge with existing data
              chore: { id: updated.chore_id, title: '', icon: null, points: 0 },
              user: null,
            },
          });
        }
        break;
      case 'DELETE':
        if (event.old?.id) {
          dispatch({ type: 'DELETE_CHORE_ASSIGNMENT', payload: event.old.id });
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
        setChoreAssignments,
        setSettings,
        setLoading,
        setError,
        handleEventChange,
        handleCalendarSourceChange,
        handleChoreAssignmentChange,
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

export function useDisplayChoreAssignments() {
  const { state } = useDisplayContext();
  return state.choreAssignments;
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
