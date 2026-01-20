import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Chore with optional next assignment info
 */
interface ChoreWithAssignment {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  icon: string | null;
  points: number;
  created_at: string;
  next_assignment?: {
    id: string;
    due_date: string;
    assigned_to: string | null;
    assignee_name?: string;
    completed_at: string | null;
  } | null;
}

/**
 * Assignment row from Supabase query
 * Note: users is an array due to Supabase join behavior
 */
interface AssignmentRow {
  id: string;
  chore_id: string;
  due_date: string;
  assigned_to: string | null;
  completed_at: string | null;
  users: { display_name: string | null }[] | null;
}

/**
 * GET /api/chores
 *
 * Fetches all chores for the current user's household.
 * Includes next upcoming assignment info for each chore.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all chores (RLS handles household scoping)
    const { data: chores, error: choresError } = await supabase
      .from('chores')
      .select('*')
      .order('title', { ascending: true });

    if (choresError) {
      console.error('Error fetching chores:', choresError);
      return NextResponse.json({ error: 'Failed to fetch chores' }, { status: 500 });
    }

    if (!chores || chores.length === 0) {
      return NextResponse.json({ chores: [] });
    }

    // Get all assignments for these chores
    const choreIds = chores.map((c) => c.id);
    const today = new Date().toISOString().split('T')[0];

    const { data: assignments, error: assignmentsError } = await supabase
      .from('chore_assignments')
      .select(
        `
        id,
        chore_id,
        due_date,
        assigned_to,
        completed_at,
        users:assigned_to (
          display_name
        )
      `
      )
      .in('chore_id', choreIds)
      .gte('due_date', today)
      .is('completed_at', null)
      .order('due_date', { ascending: true });

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      // Continue without assignments rather than failing
    }

    // Map assignments to chores (first upcoming per chore)
    const assignmentsByChore = new Map<string, AssignmentRow>();
    if (assignments) {
      for (const a of assignments as AssignmentRow[]) {
        if (!assignmentsByChore.has(a.chore_id)) {
          assignmentsByChore.set(a.chore_id, a);
        }
      }
    }

    const choresWithAssignments: ChoreWithAssignment[] = chores.map((c) => {
      const assignment = assignmentsByChore.get(c.id);
      return {
        ...c,
        next_assignment: assignment
          ? {
              id: assignment.id,
              due_date: assignment.due_date,
              assigned_to: assignment.assigned_to,
              assignee_name: assignment.users?.[0]?.display_name ?? undefined,
              completed_at: assignment.completed_at,
            }
          : null,
      };
    });

    return NextResponse.json({ chores: choresWithAssignments });
  } catch (err) {
    console.error('Error in GET /api/chores:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/chores
 *
 * Creates a new chore.
 * Body: { title, description?, icon?, points? }
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
    const { title, description, icon, points } = body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Get user's household_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.household_id) {
      console.error('Error fetching user household:', userError);
      return NextResponse.json({ error: 'User not in a household' }, { status: 400 });
    }

    const { data: chore, error: insertError } = await supabase
      .from('chores')
      .insert({
        household_id: userData.household_id,
        title: title.trim(),
        description: description?.trim() || null,
        icon: icon || null,
        points: typeof points === 'number' ? points : 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating chore:', insertError);
      return NextResponse.json({ error: 'Failed to create chore' }, { status: 500 });
    }

    return NextResponse.json({ chore }, { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/chores:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
