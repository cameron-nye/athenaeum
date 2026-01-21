import { NextRequest, NextResponse } from 'next/server';
import { createDisplayServerClient } from '@/lib/supabase/display-server';

/**
 * POST /api/display/chores
 *
 * Creates a new chore from a display device.
 * Display must have write_enabled permission.
 * Body: { title, description?, icon?, points? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createDisplayServerClient();

  try {
    // Verify display can write (get_display_household_id_for_write returns null if not)
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
    const { title, description, icon, points } = body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data: chore, error: insertError } = await supabase
      .from('chores')
      .insert({
        household_id: householdCheck,
        title: title.trim(),
        description: description?.trim() || null,
        icon: icon || null,
        points: typeof points === 'number' ? points : 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating chore from display:', insertError);
      return NextResponse.json({ error: 'Failed to create chore' }, { status: 500 });
    }

    return NextResponse.json({ chore }, { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/display/chores:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/display/chores
 *
 * Fetches all chores for the display's household.
 */
export async function GET() {
  const supabase = await createDisplayServerClient();

  try {
    const { data: chores, error: choresError } = await supabase
      .from('chores')
      .select('*')
      .order('title', { ascending: true });

    if (choresError) {
      console.error('Error fetching chores for display:', choresError);
      return NextResponse.json({ error: 'Failed to fetch chores' }, { status: 500 });
    }

    return NextResponse.json({ chores: chores ?? [] });
  } catch (err) {
    console.error('Error in GET /api/display/chores:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
