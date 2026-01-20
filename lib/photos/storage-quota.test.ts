/**
 * Tests for storage quota management
 * REQ-4-028: Handle photo storage quota
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_QUOTA_BYTES,
  WARNING_THRESHOLD_PERCENT,
  wouldExceedQuota,
  formatBytes,
  getStorageStatusMessage,
  StorageUsage,
} from './storage-quota';

describe('storage quota constants', () => {
  it('has reasonable default quota', () => {
    // Default quota should be 500MB
    expect(DEFAULT_QUOTA_BYTES).toBe(500 * 1024 * 1024);
  });

  it('has reasonable warning threshold', () => {
    // Should warn at 80%
    expect(WARNING_THRESHOLD_PERCENT).toBe(80);
  });
});

describe('wouldExceedQuota', () => {
  it('returns false when file fits within remaining space', () => {
    const usage: StorageUsage = {
      usedBytes: 100 * 1024 * 1024, // 100 MB used
      quotaBytes: 500 * 1024 * 1024, // 500 MB quota
      usedPercent: 20,
      remainingBytes: 400 * 1024 * 1024,
      photoCount: 50,
      isOverQuota: false,
      isNearQuota: false,
    };

    // 10 MB file should fit
    expect(wouldExceedQuota(usage, 10 * 1024 * 1024)).toBe(false);
  });

  it('returns true when file would exceed quota', () => {
    const usage: StorageUsage = {
      usedBytes: 495 * 1024 * 1024, // 495 MB used
      quotaBytes: 500 * 1024 * 1024, // 500 MB quota
      usedPercent: 99,
      remainingBytes: 5 * 1024 * 1024,
      photoCount: 200,
      isOverQuota: false,
      isNearQuota: true,
    };

    // 10 MB file would exceed quota
    expect(wouldExceedQuota(usage, 10 * 1024 * 1024)).toBe(true);
  });

  it('returns true when exactly at quota', () => {
    const usage: StorageUsage = {
      usedBytes: 500 * 1024 * 1024, // Exactly at quota
      quotaBytes: 500 * 1024 * 1024,
      usedPercent: 100,
      remainingBytes: 0,
      photoCount: 200,
      isOverQuota: true,
      isNearQuota: true,
    };

    // Any file would exceed
    expect(wouldExceedQuota(usage, 1)).toBe(true);
  });

  it('returns false when file exactly fills remaining space', () => {
    const usage: StorageUsage = {
      usedBytes: 490 * 1024 * 1024,
      quotaBytes: 500 * 1024 * 1024,
      usedPercent: 98,
      remainingBytes: 10 * 1024 * 1024,
      photoCount: 190,
      isOverQuota: false,
      isNearQuota: true,
    };

    // 10 MB file exactly fills remaining space
    expect(wouldExceedQuota(usage, 10 * 1024 * 1024)).toBe(false);
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(5.5 * 1024 * 1024)).toBe('5.5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
  });
});

describe('getStorageStatusMessage', () => {
  it('returns full message when over quota', () => {
    const usage: StorageUsage = {
      usedBytes: 510 * 1024 * 1024,
      quotaBytes: 500 * 1024 * 1024,
      usedPercent: 102,
      remainingBytes: 0,
      photoCount: 200,
      isOverQuota: true,
      isNearQuota: true,
    };

    const message = getStorageStatusMessage(usage);
    expect(message).toContain('Storage full');
    expect(message).toContain('Delete some photos');
  });

  it('returns warning when near quota', () => {
    const usage: StorageUsage = {
      usedBytes: 420 * 1024 * 1024,
      quotaBytes: 500 * 1024 * 1024,
      usedPercent: 84,
      remainingBytes: 80 * 1024 * 1024,
      photoCount: 150,
      isOverQuota: false,
      isNearQuota: true,
    };

    const message = getStorageStatusMessage(usage);
    expect(message).toContain('almost full');
    expect(message).toContain('84%');
  });

  it('returns normal usage message when under threshold', () => {
    const usage: StorageUsage = {
      usedBytes: 100 * 1024 * 1024,
      quotaBytes: 500 * 1024 * 1024,
      usedPercent: 20,
      remainingBytes: 400 * 1024 * 1024,
      photoCount: 50,
      isOverQuota: false,
      isNearQuota: false,
    };

    const message = getStorageStatusMessage(usage);
    expect(message).toContain('100.0 MB');
    expect(message).toContain('500.0 MB');
    expect(message).toContain('used');
  });
});
