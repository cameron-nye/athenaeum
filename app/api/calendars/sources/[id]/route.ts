import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stopAllWebhookChannels } from '@/lib/google/calendar';

/**
 * DELETE /api/calendars/sources/[id]
 *
 * Deletes a calendar source and all its associated events.
 * Also stops any active webhook channels for the calendar.
 * The cascade delete is handled by database foreign key constraint.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ error: 'Calendar ID is required' }, { status: 400 });
  }

  try {
    // First, fetch the calendar source to get tokens for webhook cleanup
    const { data: calendarSource, error: fetchError } = await supabase
      .from('calendar_sources')
      .select('id, external_id, access_token_encrypted, refresh_token_encrypted, sync_token')
      .eq('id', id)
      .single();

    // Stop webhook channels if we have the calendar source (with valid tokens)
    if (!fetchError && calendarSource?.refresh_token_encrypted) {
      try {
        await stopAllWebhookChannels(supabase, calendarSource);
      } catch (webhookError) {
        // Log but don't fail - webhook cleanup is best-effort
        console.warn('Failed to stop webhook channels:', webhookError);
      }
    }

    // RLS policies ensure user can only delete their household's calendars
    const { error } = await supabase.from('calendar_sources').delete().eq('id', id);

    if (error) {
      console.error('Error deleting calendar source:', error);
      return NextResponse.json({ error: 'Failed to delete calendar' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/calendars/sources/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
