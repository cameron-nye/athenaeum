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
 * Extract image dimensions from a buffer
 */
export async function getImageDimensions(buffer: Buffer): Promise<ImageDimensions> {
  const result = imageSize(buffer);

  if (!result.width || !result.height) {
    throw new Error('Could not determine image dimensions');
  }

  return {
    width: result.width,
    height: result.height,
  };
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
