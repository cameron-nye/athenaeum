/**
 * Photo Sources API route
 * REQ-4-025: Create Google Photos connection page (API support)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/photos/sources - List photo sources for the user's household
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: sources, error } = await supabase
    .from('photo_sources')
    .select('*')
    .order('album_name', { ascending: true });

  if (error) {
    console.error('Error fetching photo sources:', error);
    return NextResponse.json({ error: 'Failed to fetch photo sources' }, { status: 500 });
  }

  return NextResponse.json({ sources });
}

/**
 * PATCH /api/photos/sources - Update photo sources (enable/disable)
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { updates } = await request.json();

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Update each source
    const results = await Promise.all(
      updates.map(async (update: { id: string; enabled: boolean }) => {
        const { data, error } = await supabase
          .from('photo_sources')
          .update({ enabled: update.enabled })
          .eq('id', update.id)
          .select()
          .single();

        if (error) {
          console.error(`Error updating source ${update.id}:`, error);
          return { id: update.id, success: false, error: error.message };
        }
        return { id: update.id, success: true, data };
      })
    );

    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      return NextResponse.json(
        { error: 'Some updates failed', results },
        { status: 207 } // Multi-Status
      );
    }

    return NextResponse.json({ success: true, results });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
