import { NextResponse } from 'next/server';
import { createDisplayServerClient } from '@/lib/supabase/display-server';

/**
 * GET /api/display/household/members
 *
 * Fetches all members of the display's household.
 * Used for chore completion "Who did this?" selection.
 */
export async function GET() {
  const supabase = await createDisplayServerClient();

  try {
    // Get household_id from display token
    const { data: householdId, error: householdError } = await supabase.rpc(
      'get_display_household_id'
    );

    if (householdError || !householdId) {
      return NextResponse.json({ error: 'Display not authenticated' }, { status: 401 });
    }

    // Get all members in this household
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('id, display_name, avatar_url')
      .eq('household_id', householdId)
      .order('display_name', { ascending: true });

    if (membersError) {
      console.error('Error fetching household members for display:', membersError);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    return NextResponse.json({ members: members ?? [] });
  } catch (err) {
    console.error('Error in GET /api/display/household/members:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
