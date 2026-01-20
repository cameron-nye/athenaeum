import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNextOccurrence } from '@/lib/chores/recurrence';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chores/assignments/[id]
 *
 * Fetches a single assignment with chore and user info.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // RLS on chore_assignments joins through chores to check household
    const { data: assignment, error: assignmentError } = await supabase
      .from('chore_assignments')
      .select(
        `
        id,
        chore_id,
        due_date,
        assigned_to,
        recurrence_rule,
        completed_at,
        created_at,
        chores:chore_id (
          id,
          title,
          description,
          icon,
          points
        ),
        users:assigned_to (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('id', id)
      .single();

    if (assignmentError) {
      if (assignmentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }
      console.error('Error fetching assignment:', assignmentError);
      return NextResponse.json({ error: 'Failed to fetch assignment' }, { status: 500 });
    }

    return NextResponse.json({ assignment });
  } catch (err) {
    console.error('Error in GET /api/chores/assignments/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/chores/assignments/[id]
 *
 * Updates an assignment.
 * Body: { assigned_to?, due_date?, recurrence_rule?, completed_at? }
 *
 * When completed_at is set and recurrence_rule exists, automatically creates
 * the next occurrence.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { assigned_to, due_date, recurrence_rule, completed_at } = body;

    // Build update object
    const updates: Record<string, unknown> = {};

    if (assigned_to !== undefined) {
      updates.assigned_to = assigned_to || null;
    }

    if (due_date !== undefined) {
      if (due_date && !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
        return NextResponse.json(
          { error: 'due_date must be in YYYY-MM-DD format' },
          { status: 400 }
        );
      }
      updates.due_date = due_date;
    }

    if (recurrence_rule !== undefined) {
      updates.recurrence_rule = recurrence_rule || null;
    }

    if (completed_at !== undefined) {
      // completed_at can be a timestamp or null (to un-complete)
      updates.completed_at = completed_at;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // First get current assignment to check for recurring
    const { data: currentAssignment, error: fetchError } = await supabase
      .from('chore_assignments')
      .select('chore_id, assigned_to, recurrence_rule, completed_at')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }
      console.error('Error fetching assignment:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch assignment' }, { status: 500 });
    }

    // Update assignment
    const { data: assignment, error: updateError } = await supabase
      .from('chore_assignments')
      .update(updates)
      .eq('id', id)
      .select(
        `
        id,
        chore_id,
        due_date,
        assigned_to,
        recurrence_rule,
        completed_at,
        created_at,
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
        )
      `
      )
      .single();

    if (updateError) {
      console.error('Error updating assignment:', updateError);
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
    }

    // REQ-5-024: If completing a recurring assignment, create next occurrence
    let nextAssignment = null;
    const rrule = updates.recurrence_rule ?? currentAssignment.recurrence_rule;
    const wasCompleted = currentAssignment.completed_at === null;
    const nowCompleted = updates.completed_at !== undefined && updates.completed_at !== null;

    if (wasCompleted && nowCompleted && rrule) {
      const completedDate = new Date(updates.completed_at as string);
      const nextDate = getNextOccurrence(rrule, completedDate);

      if (nextDate) {
        const nextDueDate = nextDate.toISOString().split('T')[0];

        const { data: newAssignment, error: insertError } = await supabase
          .from('chore_assignments')
          .insert({
            chore_id: currentAssignment.chore_id,
            assigned_to: updates.assigned_to ?? currentAssignment.assigned_to,
            due_date: nextDueDate,
            recurrence_rule: rrule,
          })
          .select(
            `
            id,
            chore_id,
            due_date,
            assigned_to,
            recurrence_rule,
            completed_at,
            created_at
          `
          )
          .single();

        if (insertError) {
          console.error('Error creating next occurrence:', insertError);
          // Don't fail the whole request, just log it
        } else {
          nextAssignment = newAssignment;
        }
      }
    }

    return NextResponse.json({
      assignment,
      nextAssignment,
    });
  } catch (err) {
    console.error('Error in PATCH /api/chores/assignments/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/chores/assignments/[id]
 *
 * Deletes an assignment.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // RLS handles household check via chores table
    const { error: deleteError } = await supabase.from('chore_assignments').delete().eq('id', id);

    if (deleteError) {
      console.error('Error deleting assignment:', deleteError);
      return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/chores/assignments/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
