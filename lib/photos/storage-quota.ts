/**
 * Storage quota management for photo uploads
 * REQ-4-028: Handle photo storage quota
 */

import { SupabaseClient } from '@supabase/supabase-js';

// Default storage limits (in bytes)
export const DEFAULT_QUOTA_BYTES = 500 * 1024 * 1024; // 500 MB per household
export const WARNING_THRESHOLD_PERCENT = 80; // Warn at 80% usage

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  usedPercent: number;
  remainingBytes: number;
  photoCount: number;
  isOverQuota: boolean;
  isNearQuota: boolean;
}

/**
 * Calculate storage usage for a household
 * Uses Supabase Storage API to list files and sum sizes
 */
export async function getHouseholdStorageUsage(
  supabase: SupabaseClient,
  householdId: string,
  quotaBytes: number = DEFAULT_QUOTA_BYTES
): Promise<StorageUsage> {
  let usedBytes = 0;
  let photoCount = 0;

  // List all files in the household's folder
  // Supabase storage list returns batches of 100 by default
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data: files, error } = await supabase.storage.from('photos').list(householdId, {
      limit,
      offset,
    });

    if (error) {
      console.error('Error listing storage files:', error);
      break;
    }

    if (!files || files.length === 0) {
      break;
    }

    // Sum up file sizes
    for (const file of files) {
      if (file.metadata?.size) {
        usedBytes += file.metadata.size as number;
        photoCount++;
      }
    }

    // If we got less than limit, we've reached the end
    if (files.length < limit) {
      break;
    }

    offset += limit;
  }

  const usedPercent = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;
  const remainingBytes = Math.max(0, quotaBytes - usedBytes);
  const isOverQuota = usedBytes >= quotaBytes;
  const isNearQuota = usedPercent >= WARNING_THRESHOLD_PERCENT;

  return {
    usedBytes,
    quotaBytes,
    usedPercent,
    remainingBytes,
    photoCount,
    isOverQuota,
    isNearQuota,
  };
}

/**
 * Check if a file upload would exceed quota
 */
export function wouldExceedQuota(usage: StorageUsage, fileSizeBytes: number): boolean {
  return usage.usedBytes + fileSizeBytes > usage.quotaBytes;
}

/**
 * Format bytes for human-readable display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Get storage usage message for UI
 */
export function getStorageStatusMessage(usage: StorageUsage): string {
  const used = formatBytes(usage.usedBytes);
  const quota = formatBytes(usage.quotaBytes);

  if (usage.isOverQuota) {
    return `Storage full: ${used} / ${quota}. Delete some photos to upload more.`;
  }

  if (usage.isNearQuota) {
    return `Storage almost full: ${used} / ${quota} (${usage.usedPercent.toFixed(0)}%)`;
  }

  return `${used} / ${quota} used`;
}
