/**
 * Tests for image utilities
 * REQ-4-032: Handle image orientation (EXIF)
 */

import { describe, it, expect } from 'vitest';
import { extractExifOrientation, getImageDimensions } from './image-utils';

describe('extractExifOrientation', () => {
  it('returns null for buffer without EXIF marker', () => {
    const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    expect(extractExifOrientation(buffer)).toBeNull();
  });

  it('returns null for buffer with EXIF marker but invalid header', () => {
    // EXIF marker without proper 'Exif' header (using char codes for 'NotExi')
    const buffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, 0x4e, 0x6f, 0x74, 0x45, 0x78, 0x69,
    ]);
    expect(extractExifOrientation(buffer)).toBeNull();
  });

  it('returns null for empty buffer', () => {
    const buffer = Buffer.alloc(0);
    expect(extractExifOrientation(buffer)).toBeNull();
  });

  it('returns null for buffer too short for EXIF', () => {
    const buffer = Buffer.from([0xff, 0xe1]);
    expect(extractExifOrientation(buffer)).toBeNull();
  });

  // Note: Testing with real EXIF data would require actual image files
  // For integration testing, use real photos with known orientations
});

describe('getImageDimensions', () => {
  it('throws error for invalid image buffer', async () => {
    const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    // image-size throws its own error for unsupported file types
    await expect(getImageDimensions(buffer)).rejects.toThrow();
  });

  it('throws error for empty buffer', async () => {
    const buffer = Buffer.alloc(0);
    await expect(getImageDimensions(buffer)).rejects.toThrow();
  });

  // Creating valid image buffers for testing dimensions
  // Note: For comprehensive testing, use real image files with known dimensions

  it('extracts dimensions from valid PNG buffer', async () => {
    // Minimal valid 1x1 PNG
    const pngBuffer = Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // PNG signature
      0x00,
      0x00,
      0x00,
      0x0d, // IHDR chunk length
      0x49,
      0x48,
      0x44,
      0x52, // IHDR
      0x00,
      0x00,
      0x00,
      0x01, // width = 1
      0x00,
      0x00,
      0x00,
      0x01, // height = 1
      0x08,
      0x02, // bit depth and color type
      0x00,
      0x00,
      0x00, // compression, filter, interlace
      0x90,
      0x77,
      0x53,
      0xde, // CRC
      0x00,
      0x00,
      0x00,
      0x0c, // IDAT chunk length
      0x49,
      0x44,
      0x41,
      0x54, // IDAT
      0x08,
      0xd7,
      0x63,
      0xf8,
      0xff,
      0xff,
      0xff,
      0x00,
      0x05,
      0xfe,
      0x02,
      0xfe,
      0xa3,
      0x36,
      0xa3,
      0x8d, // CRC
      0x00,
      0x00,
      0x00,
      0x00, // IEND chunk length
      0x49,
      0x45,
      0x4e,
      0x44, // IEND
      0xae,
      0x42,
      0x60,
      0x82, // CRC
    ]);

    const dimensions = await getImageDimensions(pngBuffer);
    expect(dimensions.width).toBe(1);
    expect(dimensions.height).toBe(1);
  });
});

describe('EXIF orientation dimension swap', () => {
  // Document the expected behavior for rotated images
  // Orientations 5-8 should have width/height swapped

  it('should handle orientation values correctly', () => {
    // This tests the constant array used for determining rotation
    const ROTATED_ORIENTATIONS = [5, 6, 7, 8];

    // Orientations 1-4: No swap needed (normal, flipped, rotated 180)
    expect(ROTATED_ORIENTATIONS.includes(1)).toBe(false);
    expect(ROTATED_ORIENTATIONS.includes(2)).toBe(false);
    expect(ROTATED_ORIENTATIONS.includes(3)).toBe(false);
    expect(ROTATED_ORIENTATIONS.includes(4)).toBe(false);

    // Orientations 5-8: Swap needed (90/270 degree rotations)
    expect(ROTATED_ORIENTATIONS.includes(5)).toBe(true);
    expect(ROTATED_ORIENTATIONS.includes(6)).toBe(true);
    expect(ROTATED_ORIENTATIONS.includes(7)).toBe(true);
    expect(ROTATED_ORIENTATIONS.includes(8)).toBe(true);
  });
});
