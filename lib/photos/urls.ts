/**
 * Photo URL utilities for generating transformed image URLs
 * REQ-4-008: Create photo thumbnail generation
 * REQ-4-015: Create display-optimized image URLs
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

interface TransformOptions {
  width?: number;
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
  quality?: number;
  format?: 'origin' | 'avif' | 'webp';
}

/**
 * Generate a Supabase Storage URL with image transforms
 */
export function getTransformedPhotoUrl(
  storagePath: string,
  options: TransformOptions = {}
): string {
  const { width, height, resize = 'cover', quality = 80, format } = options;

  const params = new URLSearchParams();

  if (width) params.set('width', String(width));
  if (height) params.set('height', String(height));
  params.set('resize', resize);
  if (quality !== 80) params.set('quality', String(quality));
  if (format) params.set('format', format);

  const queryString = params.toString();
  const baseUrl = `${SUPABASE_URL}/storage/v1/render/image/photos/${storagePath}`;

  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Generate thumbnail URL for grid display (300x300)
 */
export function getThumbnailUrl(storagePath: string): string {
  return getTransformedPhotoUrl(storagePath, {
    width: 300,
    height: 300,
    resize: 'cover',
    quality: 75,
    format: 'webp',
  });
}

/**
 * Generate medium-sized URL for detail view (800x800)
 */
export function getMediumUrl(storagePath: string): string {
  return getTransformedPhotoUrl(storagePath, {
    width: 800,
    height: 800,
    resize: 'contain',
    quality: 85,
    format: 'webp',
  });
}

/**
 * Generate display-optimized URL for slideshow (1920x1080)
 */
export function getDisplayUrl(storagePath: string): string {
  return getTransformedPhotoUrl(storagePath, {
    width: 1920,
    height: 1080,
    resize: 'contain',
    quality: 85,
    format: 'webp',
  });
}

/**
 * Generate full-resolution URL (original image)
 */
export function getFullUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/photos/${storagePath}`;
}

/**
 * Generate signed URL for private access (if needed)
 * Note: This requires server-side execution with Supabase client
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  // This function should be called from a server context
  // For client-side, use the transform URLs which handle auth via cookies
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from('photos')
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error('Failed to create signed URL:', error);
    return null;
  }

  return data.signedUrl;
}
