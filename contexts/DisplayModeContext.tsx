'use client';

import { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';

type DisplayMode = 'interactive' | 'display';

interface DisplayModeState {
  mode: DisplayMode;
  brightness: number;
  autoRotate: boolean;
  rotateInterval: number; // minutes
  idleTimeout: number; // seconds before switching to display mode
  lastInteraction: number; // timestamp
}

type DisplayModeAction =
  | { type: 'SET_MODE'; payload: DisplayMode }
  | { type: 'SET_BRIGHTNESS'; payload: number }
  | { type: 'SET_AUTO_ROTATE'; payload: boolean }
  | { type: 'SET_ROTATE_INTERVAL'; payload: number }
  | { type: 'SET_IDLE_TIMEOUT'; payload: number }
  | { type: 'RECORD_INTERACTION' }
  | { type: 'RESET_TO_DEFAULTS' };

const DEFAULT_STATE: DisplayModeState = {
  mode: 'interactive',
  brightness: 100,
  autoRotate: false,
  rotateInterval: 30, // 30 minutes
  idleTimeout: 300, // 5 minutes
  lastInteraction: Date.now(),
};

function displayModeReducer(state: DisplayModeState, action: DisplayModeAction): DisplayModeState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.payload };

    case 'SET_BRIGHTNESS':
      return { ...state, brightness: Math.max(10, Math.min(100, action.payload)) };

    case 'SET_AUTO_ROTATE':
      return { ...state, autoRotate: action.payload };

    case 'SET_ROTATE_INTERVAL':
      return { ...state, rotateInterval: Math.max(1, action.payload) };

    case 'SET_IDLE_TIMEOUT':
      return { ...state, idleTimeout: Math.max(30, action.payload) };

    case 'RECORD_INTERACTION':
      return { ...state, lastInteraction: Date.now(), mode: 'interactive' };

    case 'RESET_TO_DEFAULTS':
      return { ...DEFAULT_STATE, lastInteraction: Date.now() };

    default:
      return state;
  }
}

interface DisplayModeContextValue {
  state: DisplayModeState;
  setMode: (mode: DisplayMode) => void;
  setBrightness: (brightness: number) => void;
  setAutoRotate: (autoRotate: boolean) => void;
  setRotateInterval: (minutes: number) => void;
  setIdleTimeout: (seconds: number) => void;
  recordInteraction: () => void;
  resetToDefaults: () => void;
  isDisplayMode: boolean;
  isInteractiveMode: boolean;
}

const DisplayModeContext = createContext<DisplayModeContextValue | undefined>(undefined);

interface DisplayModeProviderProps {
  children: ReactNode;
  enableIdleDetection?: boolean;
}

export function DisplayModeProvider({
  children,
  enableIdleDetection = false,
}: DisplayModeProviderProps) {
  const [state, dispatch] = useReducer(displayModeReducer, DEFAULT_STATE);

  const setMode = useCallback((mode: DisplayMode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
  }, []);

  const setBrightness = useCallback((brightness: number) => {
    dispatch({ type: 'SET_BRIGHTNESS', payload: brightness });
  }, []);

  const setAutoRotate = useCallback((autoRotate: boolean) => {
    dispatch({ type: 'SET_AUTO_ROTATE', payload: autoRotate });
  }, []);

  const setRotateInterval = useCallback((minutes: number) => {
    dispatch({ type: 'SET_ROTATE_INTERVAL', payload: minutes });
  }, []);

  const setIdleTimeout = useCallback((seconds: number) => {
    dispatch({ type: 'SET_IDLE_TIMEOUT', payload: seconds });
  }, []);

  const recordInteraction = useCallback(() => {
    dispatch({ type: 'RECORD_INTERACTION' });
  }, []);

  const resetToDefaults = useCallback(() => {
    dispatch({ type: 'RESET_TO_DEFAULTS' });
  }, []);

  // Idle detection - switch to display mode after inactivity
  useEffect(() => {
    if (!enableIdleDetection) return;

    const checkIdle = () => {
      const now = Date.now();
      const idleTime = (now - state.lastInteraction) / 1000;

      if (idleTime >= state.idleTimeout && state.mode === 'interactive') {
        dispatch({ type: 'SET_MODE', payload: 'display' });
      }
    };

    const interval = setInterval(checkIdle, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [enableIdleDetection, state.lastInteraction, state.idleTimeout, state.mode]);

  // Listen for user interactions to record activity
  useEffect(() => {
    if (!enableIdleDetection) return;

    const handleInteraction = () => {
      dispatch({ type: 'RECORD_INTERACTION' });
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => {
      window.addEventListener(event, handleInteraction, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleInteraction);
      });
    };
  }, [enableIdleDetection]);

  // Apply brightness as CSS filter
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--display-brightness', `${state.brightness}%`);
    }
  }, [state.brightness]);

  return (
    <DisplayModeContext.Provider
      value={{
        state,
        setMode,
        setBrightness,
        setAutoRotate,
        setRotateInterval,
        setIdleTimeout,
        recordInteraction,
        resetToDefaults,
        isDisplayMode: state.mode === 'display',
        isInteractiveMode: state.mode === 'interactive',
      }}
    >
      {children}
    </DisplayModeContext.Provider>
  );
}

export function useDisplayMode() {
  const context = useContext(DisplayModeContext);
  if (!context) {
    throw new Error('useDisplayMode must be used within DisplayModeProvider');
  }
  return context;
}

export function useDisplayBrightness() {
  const { state, setBrightness } = useDisplayMode();
  return {
    brightness: state.brightness,
    setBrightness,
  };
}

export function useAutoRotate() {
  const { state, setAutoRotate, setRotateInterval } = useDisplayMode();
  return {
    autoRotate: state.autoRotate,
    rotateInterval: state.rotateInterval,
    setAutoRotate,
    setRotateInterval,
  };
}
