/**
 * API route to fetch calendar events for a date range.
 * Used by the calendar view page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchEventsForDateRange } from '@/lib/calendar/queries';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const calendarSourceIds = searchParams.get('calendarSourceIds');

  // Validate required parameters
  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
  }

  // Validate date formats
  const startDateParsed = new Date(startDate);
  const endDateParsed = new Date(endDate);

  if (isNaN(startDateParsed.getTime()) || isNaN(endDateParsed.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date format. Use ISO 8601 format.' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse optional calendar source IDs
    const calendarIds = calendarSourceIds
      ? calendarSourceIds.split(',').filter(Boolean)
      : undefined;

    // Fetch events
    const { events, error } = await fetchEventsForDateRange(supabase, {
      startDate,
      endDate,
      calendarSourceIds: calendarIds,
    });

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json({ events });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
