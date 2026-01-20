'use client';

/**
 * Supabase Realtime Provider for Display
 * REQ-3-008: Handle real-time subscriptions for display updates
 * REQ-3-033: Graceful reconnection handling
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import {
  createDisplayBrowserClient,
  getDisplayTokenFromDocument,
} from '@/lib/supabase/display-client';

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface RealtimeEvent<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  old: T | null;
  new: T | null;
}

export interface RealtimeProviderProps {
  householdId: string;
  onEventsChange?: (event: RealtimeEvent<EventRecord>) => void;
  onCalendarSourcesChange?: (event: RealtimeEvent<CalendarSourceRecord>) => void;
  onStatusChange?: (status: RealtimeStatus) => void;
  onError?: (error: Error) => void;
  children: React.ReactNode;
}

interface EventRecord {
  id: string;
  calendar_source_id: string;
  external_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  recurrence_rule: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface CalendarSourceRecord {
  id: string;
  household_id: string;
  user_id: string | null;
  provider: string;
  external_id: string;
  name: string;
  color: string | null;
  enabled: boolean;
  last_synced_at: string | null;
  created_at: string;
}

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff

export function RealtimeProvider({
  householdId,
  onEventsChange,
  onCalendarSourcesChange,
  onStatusChange,
  onError,
  children,
}: RealtimeProviderProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribeRef = useRef<() => void>(() => {});
  const statusRef = useRef<RealtimeStatus>('connecting');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- status available via statusRef for child components
  const [_status, setStatus] = useState<RealtimeStatus>('connecting');

  // Store callbacks in refs to avoid dependency issues
  const onEventsChangeRef = useRef(onEventsChange);
  const onCalendarSourcesChangeRef = useRef(onCalendarSourcesChange);
  const onErrorRef = useRef(onError);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onEventsChangeRef.current = onEventsChange;
    onCalendarSourcesChangeRef.current = onCalendarSourcesChange;
    onErrorRef.current = onError;
    onStatusChangeRef.current = onStatusChange;
  }, [onEventsChange, onCalendarSourcesChange, onError, onStatusChange]);

  const updateStatus = useCallback((newStatus: RealtimeStatus) => {
    statusRef.current = newStatus;
    setStatus(newStatus);
    onStatusChangeRef.current?.(newStatus);
  }, []);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    cleanup();
    updateStatus('reconnecting');

    const delay =
      RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)];
    reconnectAttemptRef.current++;

    reconnectTimeoutRef.current = setTimeout(() => {
      subscribeRef.current();
    }, delay);
  }, [cleanup, updateStatus]);

  // Subscribe function - does not call setState directly
  const createSubscription = useCallback(
    (onConnect: () => void, onDisconnect: (err?: Error) => void) => {
      const displayToken = getDisplayTokenFromDocument();
      if (!displayToken) {
        onErrorRef.current?.(new Error('No display token found'));
        onDisconnect();
        return;
      }

      // Create or reuse Supabase client
      if (!supabaseRef.current) {
        supabaseRef.current = createDisplayBrowserClient(displayToken);
      }

      const supabase = supabaseRef.current;

      // Create channel for household
      const channel = supabase.channel(`display:${householdId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        },
      });

      // Subscribe to events table changes
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        (payload) => {
          onEventsChangeRef.current?.({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            old: payload.old as EventRecord | null,
            new: payload.new as EventRecord | null,
          });
        }
      );

      // Subscribe to calendar_sources table changes
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_sources',
        },
        (payload) => {
          onCalendarSourcesChangeRef.current?.({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            old: payload.old as CalendarSourceRecord | null,
            new: payload.new as CalendarSourceRecord | null,
          });
        }
      );

      // Handle channel status
      channel.subscribe((channelStatus, err) => {
        if (channelStatus === 'SUBSCRIBED') {
          reconnectAttemptRef.current = 0;
          onConnect();
        } else if (channelStatus === 'CLOSED' || channelStatus === 'CHANNEL_ERROR') {
          onDisconnect(err ? new Error(`Realtime error: ${err.message}`) : undefined);
        }
      });

      channelRef.current = channel;
    },
    [householdId]
  );

  // Effect for initial subscription and reconnection
  useEffect(() => {
    const onConnect = () => {
      updateStatus('connected');
    };

    const onDisconnect = (err?: Error) => {
      if (err) {
        onErrorRef.current?.(err);
      }
      scheduleReconnect();
    };

    const subscribe = () => {
      createSubscription(onConnect, onDisconnect);
    };

    // Store in ref for reconnection
    subscribeRef.current = subscribe;

    // Initial subscription
    subscribe();

    return () => {
      cleanup();
    };
  }, [createSubscription, updateStatus, scheduleReconnect, cleanup]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (statusRef.current === 'disconnected') {
        reconnectAttemptRef.current = 0;
        subscribeRef.current();
      }
    };

    const handleOffline = () => {
      updateStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateStatus]);

  return <>{children}</>;
}
