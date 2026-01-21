import { NextRequest, NextResponse } from 'next/server';
import { createDisplayServerClient } from '@/lib/supabase/display-server';

/**
 * GET /api/display/chores/assignments
 *
 * Fetches chore assignments for the display's household.
 * Query params:
 *   - from: filter from date (YYYY-MM-DD)
 *   - to: filter to date (YYYY-MM-DD)
 *   - status: 'pending' | 'completed' | 'all'
 *   - user_id: filter by assigned user
 */
export async function GET(request: NextRequest) {
  const supabase = await createDisplayServerClient();
  const { searchParams } = new URL(request.url);

  try {
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const status = searchParams.get('status') || 'pending';
    const userId = searchParams.get('user_id');

    let query = supabase.from('chore_assignments').select(
      `
        id,
        chore_id,
        due_date,
        assigned_to,
        recurrence_rule,
        completed_at,
        completed_by,
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
        ),
        completer:completed_by (
          id,
          display_name,
          avatar_url
        )
      `
    );

    // Filter by user if specified
    if (userId) {
      if (userId === 'unassigned') {
        query = query.is('assigned_to', null);
      } else {
        query = query.eq('assigned_to', userId);
      }
    }

    // Filter by date range
    if (fromDate) {
      query = query.gte('due_date', fromDate);
    }
    if (toDate) {
      query = query.lte('due_date', toDate);
    }

    // Filter by completion status
    if (status === 'pending') {
      query = query.is('completed_at', null);
    } else if (status === 'completed') {
      query = query.not('completed_at', 'is', null);
    }

    query = query.order('due_date', { ascending: true });

    const { data: assignments, error: assignmentsError } = await query;

    if (assignmentsError) {
      console.error('Error fetching assignments for display:', assignmentsError);
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }

    return NextResponse.json({ assignments: assignments ?? [] });
  } catch (err) {
    console.error('Error in GET /api/display/chores/assignments:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/display/chores/assignments
 *
 * Creates a new chore assignment from a display device.
 * Body: { chore_id, assigned_to?, due_date, recurrence_rule? }
 */
export async function POST(request: NextRequest) {
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
    const { chore_id, assigned_to, due_date, recurrence_rule } = body;

    if (!chore_id) {
      return NextResponse.json({ error: 'chore_id is required' }, { status: 400 });
    }

    if (!due_date) {
      return NextResponse.json({ error: 'due_date is required' }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
      return NextResponse.json({ error: 'due_date must be in YYYY-MM-DD format' }, { status: 400 });
    }

    // Verify chore exists (RLS will handle household check)
    const { data: chore, error: choreError } = await supabase
      .from('chores')
      .select('id')
      .eq('id', chore_id)
      .single();

    if (choreError || !chore) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    const { data: assignment, error: insertError } = await supabase
      .from('chore_assignments')
      .insert({
        chore_id,
        assigned_to: assigned_to || null,
        due_date,
        recurrence_rule: recurrence_rule || null,
      })
      .select(
        `
        id,
        chore_id,
        due_date,
        assigned_to,
        recurrence_rule,
        completed_at,
        completed_by,
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

    if (insertError) {
      console.error('Error creating assignment from display:', insertError);
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
    }

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/display/chores/assignments:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
