import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chores/[id]
 *
 * Fetches a single chore with its assignments.
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
    // Get chore (RLS handles household scoping)
    const { data: chore, error: choreError } = await supabase
      .from('chores')
      .select('*')
      .eq('id', id)
      .single();

    if (choreError) {
      if (choreError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
      }
      console.error('Error fetching chore:', choreError);
      return NextResponse.json({ error: 'Failed to fetch chore' }, { status: 500 });
    }

    // Get assignments for this chore
    const { data: assignments, error: assignmentsError } = await supabase
      .from('chore_assignments')
      .select(
        `
        id,
        due_date,
        assigned_to,
        recurrence_rule,
        completed_at,
        created_at,
        users:assigned_to (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .eq('chore_id', id)
      .order('due_date', { ascending: true });

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      // Continue without assignments
    }

    return NextResponse.json({
      chore,
      assignments: assignments ?? [],
    });
  } catch (err) {
    console.error('Error in GET /api/chores/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/chores/[id]
 *
 * Updates a chore.
 * Body: { title?, description?, icon?, points? }
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
    const { title, description, icon, points } = body;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (icon !== undefined) {
      updates.icon = icon || null;
    }

    if (points !== undefined) {
      if (typeof points !== 'number' || points < 0) {
        return NextResponse.json(
          { error: 'Points must be a non-negative number' },
          { status: 400 }
        );
      }
      updates.points = points;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Update chore (RLS handles household scoping)
    const { data: chore, error: updateError } = await supabase
      .from('chores')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
      }
      console.error('Error updating chore:', updateError);
      return NextResponse.json({ error: 'Failed to update chore' }, { status: 500 });
    }

    return NextResponse.json({ chore });
  } catch (err) {
    console.error('Error in PATCH /api/chores/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/chores/[id]
 *
 * Deletes a chore and all its assignments (cascade).
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
    // Delete chore (RLS handles household scoping, cascade deletes assignments)
    const { error: deleteError } = await supabase.from('chores').delete().eq('id', id);

    if (deleteError) {
      console.error('Error deleting chore:', deleteError);
      return NextResponse.json({ error: 'Failed to delete chore' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/chores/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
