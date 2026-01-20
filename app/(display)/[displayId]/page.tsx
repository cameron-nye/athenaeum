/**
 * Main Display Page
 * REQ-3-005: Primary display view showing calendar
 * REQ-3-010: Real-time event updates
 */

import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { DISPLAY_TOKEN_COOKIE } from '@/lib/supabase/display';
import { parseDisplaySettings } from '@/lib/display/types';
import { DisplayClient } from './DisplayClient';

interface DisplayPageProps {
  params: Promise<{ displayId: string }>;
}

async function getDisplayData(displayId: string, token: string) {
  const supabase = createAdminClient();

  // Verify display exists and token matches
  const { data: display, error: displayError } = await supabase
    .from('displays')
    .select('id, name, household_id, settings, last_seen_at')
    .eq('id', displayId)
    .eq('auth_token', token)
    .single();

  if (displayError || !display) {
    return null;
  }

  // Get household info
  const { data: household } = await supabase
    .from('households')
    .select('id, name')
    .eq('id', display.household_id)
    .single();

  // Get enabled calendar sources for the household
  const { data: calendarSources } = await supabase
    .from('calendar_sources')
    .select('id, name, color, provider, enabled')
    .eq('household_id', display.household_id)
    .eq('enabled', true);

  // Get today's events and next 7 days
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfRange = new Date(now);
  endOfRange.setDate(endOfRange.getDate() + 7);
  endOfRange.setHours(23, 59, 59, 999);

  const calendarSourceIds = (calendarSources || []).map((cs) => cs.id);

  let events: Array<{
    id: string;
    calendar_source_id: string;
    title: string;
    description: string | null;
    location: string | null;
    start_time: string;
    end_time: string;
    all_day: boolean;
    recurrence_rule: string | null;
  }> = [];

  if (calendarSourceIds.length > 0) {
    const { data: eventsData } = await supabase
      .from('events')
      .select(
        'id, calendar_source_id, title, description, location, start_time, end_time, all_day, recurrence_rule'
      )
      .in('calendar_source_id', calendarSourceIds)
      .gte('end_time', startOfToday.toISOString())
      .lte('start_time', endOfRange.toISOString())
      .order('start_time', { ascending: true });

    events = eventsData || [];
  }

  // Update last_seen_at
  await supabase
    .from('displays')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', display.id);

  return {
    display: {
      id: display.id,
      name: display.name,
      settings: parseDisplaySettings(display.settings as Record<string, unknown>),
    },
    household: household || { id: display.household_id, name: 'Home' },
    calendarSources: calendarSources || [],
    events,
  };
}

export default async function DisplayPage({ params }: DisplayPageProps) {
  const { displayId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(DISPLAY_TOKEN_COOKIE)?.value;

  if (!token) {
    notFound();
  }

  const data = await getDisplayData(displayId, token);

  if (!data) {
    notFound();
  }

  return (
    <DisplayClient
      displayId={data.display.id}
      initialEvents={data.events}
      initialCalendarSources={data.calendarSources}
      initialSettings={data.display.settings}
      householdId={data.household.id}
      householdName={data.household.name}
    />
  );
}
