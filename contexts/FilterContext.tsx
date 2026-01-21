'use client';

import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';

interface FilterState {
  selectedMembers: string[];
  selectedCalendars: string[];
  dateRange: { start: Date; end: Date };
}

type FilterAction =
  | { type: 'SET_MEMBERS'; payload: string[] }
  | { type: 'TOGGLE_MEMBER'; payload: string }
  | { type: 'SET_CALENDARS'; payload: string[] }
  | { type: 'TOGGLE_CALENDAR'; payload: string }
  | { type: 'SET_DATE_RANGE'; payload: { start: Date; end: Date } }
  | { type: 'RESET' };

function getDefaultDateRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

const initialState: FilterState = {
  selectedMembers: [],
  selectedCalendars: [],
  dateRange: getDefaultDateRange(),
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_MEMBERS':
      return { ...state, selectedMembers: action.payload };

    case 'TOGGLE_MEMBER': {
      const memberId = action.payload;
      const isSelected = state.selectedMembers.includes(memberId);
      return {
        ...state,
        selectedMembers: isSelected
          ? state.selectedMembers.filter((id) => id !== memberId)
          : [...state.selectedMembers, memberId],
      };
    }

    case 'SET_CALENDARS':
      return { ...state, selectedCalendars: action.payload };

    case 'TOGGLE_CALENDAR': {
      const calendarId = action.payload;
      const isSelected = state.selectedCalendars.includes(calendarId);
      return {
        ...state,
        selectedCalendars: isSelected
          ? state.selectedCalendars.filter((id) => id !== calendarId)
          : [...state.selectedCalendars, calendarId],
      };
    }

    case 'SET_DATE_RANGE':
      return { ...state, dateRange: action.payload };

    case 'RESET':
      return { ...initialState, dateRange: getDefaultDateRange() };

    default:
      return state;
  }
}

interface FilterContextValue {
  state: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  setMembers: (members: string[]) => void;
  toggleMember: (memberId: string) => void;
  setCalendars: (calendars: string[]) => void;
  toggleCalendar: (calendarId: string) => void;
  setDateRange: (range: { start: Date; end: Date }) => void;
  reset: () => void;
  isMemberSelected: (memberId: string) => boolean;
  isCalendarSelected: (calendarId: string) => boolean;
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(filterReducer, initialState);

  const setMembers = useCallback((members: string[]) => {
    dispatch({ type: 'SET_MEMBERS', payload: members });
  }, []);

  const toggleMember = useCallback((memberId: string) => {
    dispatch({ type: 'TOGGLE_MEMBER', payload: memberId });
  }, []);

  const setCalendars = useCallback((calendars: string[]) => {
    dispatch({ type: 'SET_CALENDARS', payload: calendars });
  }, []);

  const toggleCalendar = useCallback((calendarId: string) => {
    dispatch({ type: 'TOGGLE_CALENDAR', payload: calendarId });
  }, []);

  const setDateRange = useCallback((range: { start: Date; end: Date }) => {
    dispatch({ type: 'SET_DATE_RANGE', payload: range });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const isMemberSelected = useCallback(
    (memberId: string) => {
      return state.selectedMembers.length === 0 || state.selectedMembers.includes(memberId);
    },
    [state.selectedMembers]
  );

  const isCalendarSelected = useCallback(
    (calendarId: string) => {
      return state.selectedCalendars.length === 0 || state.selectedCalendars.includes(calendarId);
    },
    [state.selectedCalendars]
  );

  return (
    <FilterContext.Provider
      value={{
        state,
        dispatch,
        setMembers,
        toggleMember,
        setCalendars,
        toggleCalendar,
        setDateRange,
        reset,
        isMemberSelected,
        isCalendarSelected,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within FilterProvider');
  }
  return context;
}

export function useFilterState() {
  const { state } = useFilters();
  return state;
}

export function useSelectedMembers() {
  const { state, setMembers, toggleMember, isMemberSelected } = useFilters();
  return {
    selectedMembers: state.selectedMembers,
    setMembers,
    toggleMember,
    isMemberSelected,
  };
}

export function useSelectedCalendars() {
  const { state, setCalendars, toggleCalendar, isCalendarSelected } = useFilters();
  return {
    selectedCalendars: state.selectedCalendars,
    setCalendars,
    toggleCalendar,
    isCalendarSelected,
  };
}

export function useDateRange() {
  const { state, setDateRange } = useFilters();
  return {
    dateRange: state.dateRange,
    setDateRange,
  };
}
