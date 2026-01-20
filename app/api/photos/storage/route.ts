/**
 * Storage usage API route
 * REQ-4-028: Handle photo storage quota
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getHouseholdStorageUsage,
  DEFAULT_QUOTA_BYTES,
  formatBytes,
} from '@/lib/photos/storage-quota';

/**
 * GET /api/photos/storage - Get storage usage for user's household
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's household
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (userError || !userData?.household_id) {
    return NextResponse.json({ error: 'User not in a household' }, { status: 400 });
  }

  const householdId = userData.household_id;

  try {
    const usage = await getHouseholdStorageUsage(supabase, householdId, DEFAULT_QUOTA_BYTES);

    return NextResponse.json({
      usage: {
        ...usage,
        usedFormatted: formatBytes(usage.usedBytes),
        quotaFormatted: formatBytes(usage.quotaBytes),
        remainingFormatted: formatBytes(usage.remainingBytes),
      },
    });
  } catch (error) {
    console.error('Error getting storage usage:', error);
    return NextResponse.json({ error: 'Failed to get storage usage' }, { status: 500 });
  }
}
