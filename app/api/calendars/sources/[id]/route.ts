import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DELETE /api/calendars/sources/[id]
 *
 * Deletes a calendar source and all its associated events.
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
