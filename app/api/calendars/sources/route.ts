import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/calendars/sources
 *
 * Fetches all calendar sources for the current user's household.
 * Returns calendars with their enabled status for selection UI.
 */
export async function GET() {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // RLS policies handle household scoping
    const { data, error } = await supabase
      .from('calendar_sources')
      .select('id, name, color, provider, enabled')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching calendar sources:', error);
      return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 500 });
    }

    return NextResponse.json({ sources: data ?? [] });
  } catch (err) {
    console.error('Error in GET /api/calendars/sources:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/calendars/sources
 *
 * Updates which calendars are enabled/disabled.
 * Body: { enabledIds: string[] } - IDs of calendars to enable (all others disabled)
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { enabledIds } = body;

    if (!Array.isArray(enabledIds)) {
      return NextResponse.json({ error: 'enabledIds must be an array' }, { status: 400 });
    }

    // First, get all calendar IDs for this user's household (RLS handles scoping)
    const { data: allCalendars, error: fetchError } = await supabase
      .from('calendar_sources')
      .select('id');

    if (fetchError) {
      console.error('Error fetching calendars:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 500 });
    }

    const allIds = (allCalendars ?? []).map((c) => c.id);
    const enabledSet = new Set(enabledIds);

    // Disable all calendars not in enabledIds
    const toDisable = allIds.filter((id) => !enabledSet.has(id));
    if (toDisable.length > 0) {
      const { error: disableError } = await supabase
        .from('calendar_sources')
        .update({ enabled: false })
        .in('id', toDisable);

      if (disableError) {
        console.error('Error disabling calendars:', disableError);
        return NextResponse.json({ error: 'Failed to update calendars' }, { status: 500 });
      }
    }

    // Enable calendars in enabledIds
    const toEnable = enabledIds.filter((id: string) => allIds.includes(id));
    if (toEnable.length > 0) {
      const { error: enableError } = await supabase
        .from('calendar_sources')
        .update({ enabled: true })
        .in('id', toEnable);

      if (enableError) {
        console.error('Error enabling calendars:', enableError);
        return NextResponse.json({ error: 'Failed to update calendars' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in PATCH /api/calendars/sources:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
