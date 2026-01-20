import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/household/members
 *
 * Fetches all members of the current user's household.
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
    // Get user's household_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.household_id) {
      return NextResponse.json({ error: 'User not in a household' }, { status: 400 });
    }

    // Get all members in this household
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, email')
      .eq('household_id', userData.household_id)
      .order('display_name', { ascending: true });

    if (membersError) {
      console.error('Error fetching household members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    return NextResponse.json({
      members: members ?? [],
      current_user_id: user.id,
    });
  } catch (err) {
    console.error('Error in GET /api/household/members:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
