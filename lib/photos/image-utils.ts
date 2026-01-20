/**
 * Image utilities for photo processing
 * REQ-4-007: Extract image dimensions
 * REQ-4-032: Handle image orientation (EXIF)
 */

import { imageSize } from 'image-size';

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * EXIF orientation values that indicate the image needs dimension swap
 * Orientations 5-8 mean the image was rotated 90 or 270 degrees,
 * which means width and height should be swapped
 */
const ROTATED_ORIENTATIONS = [5, 6, 7, 8];

/**
 * Extract EXIF orientation from image buffer
 * Returns orientation value (1-8) or null if not found
 * Reference: https://www.exif.org/Exif2-2.PDF
 */
export function extractExifOrientation(buffer: Buffer): number | null {
  try {
    // Look for EXIF data in JPEG
    // EXIF starts with 0xFFE1 marker
    const exifMarker = Buffer.from([0xff, 0xe1]);
    const markerIndex = buffer.indexOf(exifMarker);

    if (markerIndex === -1) {
      return null;
    }

    // Skip marker and length bytes
    const exifStart = markerIndex + 4;

    // Look for 'Exif\0\0' header
    const exifHeader = buffer.slice(exifStart, exifStart + 6).toString('ascii');
    if (!exifHeader.startsWith('Exif')) {
      return null;
    }

    // Skip to TIFF header (after Exif\0\0)
    const tiffStart = exifStart + 6;

    // Check byte order (II = little endian, MM = big endian)
    const byteOrder = buffer.slice(tiffStart, tiffStart + 2).toString('ascii');
    const littleEndian = byteOrder === 'II';

    const readUint16 = (offset: number) => {
      return littleEndian
        ? buffer.readUInt16LE(tiffStart + offset)
        : buffer.readUInt16BE(tiffStart + offset);
    };

    const readUint32 = (offset: number) => {
      return littleEndian
        ? buffer.readUInt32LE(tiffStart + offset)
        : buffer.readUInt32BE(tiffStart + offset);
    };

    // IFD0 offset is at byte 4
    const ifd0Offset = readUint32(4);

    // Read number of entries in IFD0
    const numEntries = readUint16(ifd0Offset);

    // Look for Orientation tag (0x0112)
    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifd0Offset + 2 + i * 12;
      const tag = readUint16(entryOffset);

      if (tag === 0x0112) {
        // Orientation tag found - value is at offset +8 for SHORT type
        const orientation = readUint16(entryOffset + 8);
        if (orientation >= 1 && orientation <= 8) {
          return orientation;
        }
        break;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract image dimensions from a buffer, accounting for EXIF orientation
 * REQ-4-032: Correctly handle rotated images
 */
export async function getImageDimensions(buffer: Buffer): Promise<ImageDimensions> {
  const result = imageSize(buffer);

  if (!result.width || !result.height) {
    throw new Error('Could not determine image dimensions');
  }

  let { width, height } = result;

  // Check EXIF orientation to determine if dimensions should be swapped
  const orientation = extractExifOrientation(buffer);
  if (orientation && ROTATED_ORIENTATIONS.includes(orientation)) {
    // Image is rotated 90 or 270 degrees, swap width and height
    [width, height] = [height, width];
  }

  return { width, height };
}

/**
 * Extract EXIF date (DateTimeOriginal or DateTimeDigitized) from image buffer
 * Returns ISO date string or null if not available
 */
export async function extractExifDate(buffer: Buffer): Promise<string | null> {
  try {
    // Look for EXIF data in JPEG
    // EXIF starts with 0xFFE1 marker
    const exifMarker = Buffer.from([0xff, 0xe1]);
    const markerIndex = buffer.indexOf(exifMarker);

    if (markerIndex === -1) {
      return null;
    }

    // Skip marker and length bytes
    const exifStart = markerIndex + 4;

    // Look for 'Exif\0\0' header
    const exifHeader = buffer.slice(exifStart, exifStart + 6).toString('ascii');
    if (!exifHeader.startsWith('Exif')) {
      return null;
    }

    // Skip to TIFF header (after Exif\0\0)
    const tiffStart = exifStart + 6;

    // Check byte order (II = little endian, MM = big endian)
    const byteOrder = buffer.slice(tiffStart, tiffStart + 2).toString('ascii');
    const littleEndian = byteOrder === 'II';

    // Read IFD0 offset
    const readUint16 = (offset: number) => {
      return littleEndian
        ? buffer.readUInt16LE(tiffStart + offset)
        : buffer.readUInt16BE(tiffStart + offset);
    };

    const readUint32 = (offset: number) => {
      return littleEndian
        ? buffer.readUInt32LE(tiffStart + offset)
        : buffer.readUInt32BE(tiffStart + offset);
    };

    // IFD0 offset is at byte 4
    const ifd0Offset = readUint32(4);

    // Read number of entries in IFD0
    const numEntries = readUint16(ifd0Offset);

    // Look for ExifIFDPointer (0x8769)
    let exifIfdOffset: number | null = null;

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifd0Offset + 2 + i * 12;
      const tag = readUint16(entryOffset);

      if (tag === 0x8769) {
        // ExifIFDPointer
        exifIfdOffset = readUint32(entryOffset + 8);
        break;
      }
    }

    if (!exifIfdOffset) {
      return null;
    }

    // Read Exif IFD
    const exifNumEntries = readUint16(exifIfdOffset);

    // Look for DateTimeOriginal (0x9003) or DateTimeDigitized (0x9004)
    for (let i = 0; i < exifNumEntries; i++) {
      const entryOffset = exifIfdOffset + 2 + i * 12;
      const tag = readUint16(entryOffset);

      if (tag === 0x9003 || tag === 0x9004) {
        // Date/time tag found
        const valueOffset = readUint32(entryOffset + 8);
        const dateString = buffer
          .slice(tiffStart + valueOffset, tiffStart + valueOffset + 19)
          .toString('ascii');

        // Format: "2024:01:15 14:30:00" -> "2024-01-15T14:30:00"
        const match = dateString.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
        if (match) {
          const [, year, month, day, hour, minute, second] = match;
          return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        }
      }
    }

    return null;
  } catch {
    // EXIF parsing failed, return null
    return null;
  }
}
