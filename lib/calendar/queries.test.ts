import { describe, it, expect, vi } from 'vitest';
import {
  fetchEventsForDateRange,
  fetchEnabledCalendarSources,
  fetchAllCalendarSources,
  type CalendarViewEvent,
  type CalendarSourceInfo,
} from './queries';

// Mock Supabase client
function createMockSupabase(mockData: unknown, mockError: Error | null = null) {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockImplementation(() => {
      return Promise.resolve({ data: mockData, error: mockError });
    }),
  };

  // Make `in` also chainable to `order`
  mockQuery.in.mockImplementation(() => {
    return {
      ...mockQuery,
      order: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
    };
  });

  return {
    from: vi.fn().mockReturnValue(mockQuery),
    _mockQuery: mockQuery,
  };
}

describe('fetchEventsForDateRange', () => {
  it('should fetch events within date range with calendar source info', async () => {
    const mockEventData = [
      {
        id: 'event-1',
        calendar_source_id: 'cal-1',
        external_id: 'ext-1',
        title: 'Meeting',
        description: 'Team standup',
        location: 'Room 101',
        start_time: '2024-01-15T09:00:00Z',
        end_time: '2024-01-15T10:00:00Z',
        all_day: false,
        recurrence_rule: null,
        calendar_sources: {
          id: 'cal-1',
          name: 'Work Calendar',
          color: '#4285F4',
          provider: 'google',
          enabled: true,
        },
      },
    ];

    const mockSupabase = createMockSupabase(mockEventData);

    const result = await fetchEventsForDateRange(mockSupabase as never, {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-31T23:59:59Z',
    });

    expect(result.error).toBeNull();
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toEqual({
      id: 'event-1',
      calendar_source_id: 'cal-1',
      external_id: 'ext-1',
      title: 'Meeting',
      description: 'Team standup',
      location: 'Room 101',
      start_time: '2024-01-15T09:00:00Z',
      end_time: '2024-01-15T10:00:00Z',
      all_day: false,
      recurrence_rule: null,
      calendar_source: {
        id: 'cal-1',
        name: 'Work Calendar',
        color: '#4285F4',
        provider: 'google',
      },
    } satisfies CalendarViewEvent);
  });

  it('should filter by calendar source IDs when provided', async () => {
    // Track calls separately for this test
    const inCalls: [string, string[]][] = [];

    // Create a thenable object that also has .in() method
    // This simulates how Supabase query builder works
    const createThenable = (data: unknown) => {
      const thenable = {
        then: (resolve: (value: { data: unknown; error: null }) => void) => {
          resolve({ data, error: null });
        },
        in: vi.fn().mockImplementation((col: string, vals: string[]) => {
          inCalls.push([col, vals]);
          return createThenable(data);
        }),
      };
      return thenable;
    };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockImplementation((col: string, vals: string[]) => {
        inCalls.push([col, vals]);
        return mockQuery;
      }),
      order: vi.fn().mockReturnValue(createThenable([])),
    };

    const mockSupabase = {
      from: vi.fn().mockReturnValue(mockQuery),
    };

    await fetchEventsForDateRange(mockSupabase as never, {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-31T23:59:59Z',
      calendarSourceIds: ['cal-1', 'cal-2'],
    });

    expect(inCalls).toContainEqual(['calendar_source_id', ['cal-1', 'cal-2']]);
  });

  it('should handle database errors', async () => {
    const mockSupabase = createMockSupabase(null, { message: 'Database error' } as Error);

    const result = await fetchEventsForDateRange(mockSupabase as never, {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-31T23:59:59Z',
    });

    expect(result.events).toEqual([]);
    expect(result.error).toBe('Database error');
  });

  it('should return empty array when no events found', async () => {
    const mockSupabase = createMockSupabase([]);

    const result = await fetchEventsForDateRange(mockSupabase as never, {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-31T23:59:59Z',
    });

    expect(result.error).toBeNull();
    expect(result.events).toEqual([]);
  });

  it('should call correct query methods for date range filtering', async () => {
    const mockSupabase = createMockSupabase([]);

    await fetchEventsForDateRange(mockSupabase as never, {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-31T23:59:59Z',
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('events');
    expect(mockSupabase._mockQuery.lt).toHaveBeenCalledWith('start_time', '2024-01-31T23:59:59Z');
    expect(mockSupabase._mockQuery.gt).toHaveBeenCalledWith('end_time', '2024-01-01T00:00:00Z');
    expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith('calendar_sources.enabled', true);
    expect(mockSupabase._mockQuery.order).toHaveBeenCalledWith('start_time', { ascending: true });
  });

  it('should handle all-day events', async () => {
    const mockEventData = [
      {
        id: 'event-2',
        calendar_source_id: 'cal-1',
        external_id: 'ext-2',
        title: 'Holiday',
        description: null,
        location: null,
        start_time: '2024-01-15T00:00:00Z',
        end_time: '2024-01-16T00:00:00Z',
        all_day: true,
        recurrence_rule: null,
        calendar_sources: {
          id: 'cal-1',
          name: 'Work Calendar',
          color: null,
          provider: 'google',
          enabled: true,
        },
      },
    ];

    const mockSupabase = createMockSupabase(mockEventData);

    const result = await fetchEventsForDateRange(mockSupabase as never, {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-31T23:59:59Z',
    });

    expect(result.events[0].all_day).toBe(true);
    expect(result.events[0].calendar_source.color).toBeNull();
  });
});

describe('fetchEnabledCalendarSources', () => {
  it('should fetch enabled calendar sources', async () => {
    const mockSourceData = [
      {
        id: 'cal-1',
        name: 'Work Calendar',
        color: '#4285F4',
        provider: 'google',
      },
      {
        id: 'cal-2',
        name: 'Personal',
        color: '#34A853',
        provider: 'google',
      },
    ];

    const mockSupabase = createMockSupabase(mockSourceData);

    const result = await fetchEnabledCalendarSources(mockSupabase as never);

    expect(result.error).toBeNull();
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0]).toEqual({
      id: 'cal-1',
      name: 'Work Calendar',
      color: '#4285F4',
      provider: 'google',
    } satisfies CalendarSourceInfo);
  });

  it('should only query enabled calendars', async () => {
    const mockSupabase = createMockSupabase([]);

    await fetchEnabledCalendarSources(mockSupabase as never);

    expect(mockSupabase.from).toHaveBeenCalledWith('calendar_sources');
    expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith('enabled', true);
  });

  it('should handle database errors', async () => {
    const mockSupabase = createMockSupabase(null, { message: 'Access denied' } as Error);

    const result = await fetchEnabledCalendarSources(mockSupabase as never);

    expect(result.sources).toEqual([]);
    expect(result.error).toBe('Access denied');
  });
});

describe('fetchAllCalendarSources', () => {
  it('should fetch all calendar sources including disabled', async () => {
    const mockSourceData = [
      {
        id: 'cal-1',
        name: 'Work Calendar',
        color: '#4285F4',
        provider: 'google',
        enabled: true,
        last_synced_at: '2024-01-15T10:00:00Z',
      },
      {
        id: 'cal-2',
        name: 'Old Calendar',
        color: null,
        provider: 'ical',
        enabled: false,
        last_synced_at: null,
      },
    ];

    const mockSupabase = createMockSupabase(mockSourceData);

    const result = await fetchAllCalendarSources(mockSupabase as never);

    expect(result.error).toBeNull();
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0].enabled).toBe(true);
    expect(result.sources[0].last_synced_at).toBe('2024-01-15T10:00:00Z');
    expect(result.sources[1].enabled).toBe(false);
    expect(result.sources[1].last_synced_at).toBeNull();
  });

  it('should not filter by enabled status', async () => {
    const mockSupabase = createMockSupabase([]);

    await fetchAllCalendarSources(mockSupabase as never);

    // Should NOT call eq('enabled', true) - it fetches all calendars
    expect(mockSupabase._mockQuery.eq).not.toHaveBeenCalled();
  });

  it('should sort by name', async () => {
    const mockSupabase = createMockSupabase([]);

    await fetchAllCalendarSources(mockSupabase as never);

    expect(mockSupabase._mockQuery.order).toHaveBeenCalledWith('name', { ascending: true });
  });

  it('should handle database errors', async () => {
    const mockSupabase = createMockSupabase(null, { message: 'Connection failed' } as Error);

    const result = await fetchAllCalendarSources(mockSupabase as never);

    expect(result.sources).toEqual([]);
    expect(result.error).toBe('Connection failed');
  });
});
