/**
 * Display Heartbeat API
 * REQ-3-029: Periodic heartbeat to update last_seen_at
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { DISPLAY_TOKEN_COOKIE } from '@/lib/supabase/display';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { displayId } = body;

    if (!displayId) {
      return NextResponse.json({ error: 'Display ID is required' }, { status: 400 });
    }

    // Get token from cookie
    const token = request.cookies.get(DISPLAY_TOKEN_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: 'Display token required' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Update last_seen_at only if token matches
    const { error } = await supabase
      .from('displays')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', displayId)
      .eq('auth_token', token);

    if (error) {
      return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
