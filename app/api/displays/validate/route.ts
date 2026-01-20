/**
 * Display Token Validation API
 * REQ-3-004: Validates display token and returns display ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Use admin client to bypass RLS for token validation
    const supabase = createAdminClient();

    const { data: display, error } = await supabase
      .from('displays')
      .select('id, name, household_id')
      .eq('auth_token', token)
      .single();

    if (error || !display) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    // Update last_seen_at to mark the display as connected
    await supabase
      .from('displays')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', display.id);

    return NextResponse.json({
      displayId: display.id,
      name: display.name,
      householdId: display.household_id,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
