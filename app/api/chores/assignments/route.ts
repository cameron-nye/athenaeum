import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/chores/assignments
 *
 * Fetches all chore assignments for the current user's household.
 * Query params:
 *   - user_id: filter by assigned user
 *   - from: filter from date (YYYY-MM-DD)
 *   - to: filter to date (YYYY-MM-DD)
 *   - status: 'pending' | 'completed' | 'all'
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = searchParams.get('user_id');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const status = searchParams.get('status') || 'pending';

    // Build query for assignments with chore and user info
    // RLS on chore_assignments joins through chores to check household
    let query = supabase.from('chore_assignments').select(
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
    );

    // Filter by user if specified
    if (userId) {
      if (userId === 'me') {
        query = query.eq('assigned_to', user.id);
      } else if (userId === 'unassigned') {
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
    // 'all' = no filter

    // Order by due date
    query = query.order('due_date', { ascending: true });

    const { data: assignments, error: assignmentsError } = await query;

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }

    return NextResponse.json({ assignments: assignments ?? [] });
  } catch (err) {
    console.error('Error in GET /api/chores/assignments:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/chores/assignments
 *
 * Creates a new chore assignment.
 * Body: { chore_id, assigned_to?, due_date, recurrence_rule? }
 */
export async function POST(request: NextRequest) {
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
    const { chore_id, assigned_to, due_date, recurrence_rule } = body;

    // Validate required fields
    if (!chore_id) {
      return NextResponse.json({ error: 'chore_id is required' }, { status: 400 });
    }

    if (!due_date) {
      return NextResponse.json({ error: 'due_date is required' }, { status: 400 });
    }

    // Validate due_date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
      return NextResponse.json({ error: 'due_date must be in YYYY-MM-DD format' }, { status: 400 });
    }

    // Verify chore exists and belongs to user's household (via RLS)
    const { data: chore, error: choreError } = await supabase
      .from('chores')
      .select('id')
      .eq('id', chore_id)
      .single();

    if (choreError || !chore) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    // Create assignment
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
      console.error('Error creating assignment:', insertError);
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
    }

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/chores/assignments:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
