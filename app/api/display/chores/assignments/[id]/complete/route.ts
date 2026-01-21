import { NextRequest, NextResponse } from 'next/server';
import { createDisplayServerClient } from '@/lib/supabase/display-server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/display/chores/assignments/[id]/complete
 *
 * Marks a chore assignment as complete from a display device.
 * Body: { completed_by: uuid } - who actually completed the chore
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createDisplayServerClient();

  try {
    // Verify display can write
    const { data: householdCheck, error: checkError } = await supabase.rpc(
      'get_display_household_id_for_write'
    );

    if (checkError || !householdCheck) {
      return NextResponse.json(
        { error: 'Display not authorized for write operations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { completed_by } = body;

    if (!completed_by) {
      return NextResponse.json({ error: 'completed_by is required' }, { status: 400 });
    }

    // Update the assignment
    const { data: assignment, error: updateError } = await supabase
      .from('chore_assignments')
      .update({
        completed_at: new Date().toISOString(),
        completed_by,
      })
      .eq('id', id)
      .select(
        `
        id,
        chore_id,
        due_date,
        assigned_to,
        completed_at,
        completed_by,
        chores:chore_id (
          id,
          title,
          icon,
          points
        ),
        users:assigned_to (
          id,
          display_name,
          avatar_url
        ),
        completer:completed_by (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .single();

    if (updateError) {
      console.error('Error completing assignment from display:', updateError);
      return NextResponse.json({ error: 'Failed to complete assignment' }, { status: 500 });
    }

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({ assignment });
  } catch (err) {
    console.error('Error in PATCH /api/display/chores/assignments/[id]/complete:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
