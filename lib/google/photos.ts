/**
 * Google Photos API utilities
 * REQ-4-023: Create Google Photos album list fetch
 * REQ-4-024: Create Google Photos album sync
 */

import { OAuth2Client } from 'google-auth-library';
import { getValidOAuth2Client, TokenRevocationError } from './auth';
import type { Credentials } from 'google-auth-library';

// Google Photos Library API base URL
const PHOTOS_API_BASE = 'https://photoslibrary.googleapis.com/v1';

/**
 * Album from Google Photos API
 */
export interface GooglePhotosAlbum {
  id: string;
  title: string;
  productUrl: string;
  mediaItemsCount?: string;
  coverPhotoBaseUrl?: string;
  coverPhotoMediaItemId?: string;
}

/**
 * Media item (photo) from Google Photos API
 */
export interface GooglePhotosMediaItem {
  id: string;
  description?: string;
  productUrl: string;
  baseUrl: string;
  mimeType: string;
  mediaMetadata?: {
    creationTime?: string;
    width?: string;
    height?: string;
    photo?: {
      cameraMake?: string;
      cameraModel?: string;
      focalLength?: number;
      apertureFNumber?: number;
      isoEquivalent?: number;
    };
  };
  filename: string;
}

/**
 * Response from albums.list endpoint
 */
interface AlbumsListResponse {
  albums?: GooglePhotosAlbum[];
  nextPageToken?: string;
}

/**
 * Response from mediaItems.search endpoint
 */
interface MediaItemsSearchResponse {
  mediaItems?: GooglePhotosMediaItem[];
  nextPageToken?: string;
}

/**
 * Error types for Google Photos API failures
 */
export type GooglePhotosErrorType =
  | 'auth'
  | 'not_found'
  | 'rate_limit'
  | 'server_error'
  | 'network'
  | 'unknown';

/**
 * Categorize Google Photos API errors
 */
export function categorizePhotosApiError(error: unknown): GooglePhotosErrorType {
  if (error instanceof TokenRevocationError) {
    return 'auth';
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('401') || message.includes('unauthenticated')) {
      return 'auth';
    }
    if (message.includes('404') || message.includes('not found')) {
      return 'not_found';
    }
    if (message.includes('429') || message.includes('rate limit') || message.includes('quota')) {
      return 'rate_limit';
    }
    if (message.includes('500') || message.includes('503') || message.includes('server error')) {
      return 'server_error';
    }
    if (
      message.includes('enotfound') ||
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('network')
    ) {
      return 'network';
    }
  }

  return 'unknown';
}

/**
 * Make authenticated request to Google Photos API
 */
async function makePhotosApiRequest<T>(
  client: OAuth2Client,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = client.credentials.access_token;
  if (!accessToken) {
    throw new Error('No access token available');
  }

  const url = `${PHOTOS_API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Photos API error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Fetch all albums from user's Google Photos library
 * REQ-4-023: Create Google Photos album list fetch
 *
 * @param tokens - OAuth credentials
 * @param onTokenRefresh - Callback when tokens are refreshed
 * @returns Array of albums
 */
export async function fetchGooglePhotosAlbums(
  tokens: Credentials,
  onTokenRefresh?: (newTokens: Credentials) => Promise<void>
): Promise<GooglePhotosAlbum[]> {
  const client = await getValidOAuth2Client(tokens, onTokenRefresh);
  const albums: GooglePhotosAlbum[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      pageSize: '50',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await makePhotosApiRequest<AlbumsListResponse>(
      client,
      `/albums?${params.toString()}`
    );

    if (response.albums) {
      albums.push(...response.albums);
    }

    pageToken = response.nextPageToken;
  } while (pageToken);

  return albums;
}

/**
 * Fetch photos from a specific album
 * REQ-4-024: Create Google Photos album sync
 *
 * @param albumId - The album ID to fetch photos from
 * @param tokens - OAuth credentials
 * @param onTokenRefresh - Callback when tokens are refreshed
 * @param pageToken - Optional page token for pagination
 * @returns Object with photos and nextPageToken
 */
export async function fetchPhotosFromAlbum(
  albumId: string,
  tokens: Credentials,
  onTokenRefresh?: (newTokens: Credentials) => Promise<void>,
  pageToken?: string
): Promise<{ photos: GooglePhotosMediaItem[]; nextPageToken?: string }> {
  const client = await getValidOAuth2Client(tokens, onTokenRefresh);

  const body: Record<string, string | number> = {
    albumId,
    pageSize: 100,
  };
  if (pageToken) {
    body.pageToken = pageToken;
  }

  const response = await makePhotosApiRequest<MediaItemsSearchResponse>(
    client,
    '/mediaItems:search',
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );

  return {
    photos: response.mediaItems ?? [],
    nextPageToken: response.nextPageToken,
  };
}

/**
 * Fetch all photos from an album (handles pagination)
 *
 * @param albumId - The album ID to fetch photos from
 * @param tokens - OAuth credentials
 * @param onTokenRefresh - Callback when tokens are refreshed
 * @returns Array of all photos in the album
 */
export async function fetchAllPhotosFromAlbum(
  albumId: string,
  tokens: Credentials,
  onTokenRefresh?: (newTokens: Credentials) => Promise<void>
): Promise<GooglePhotosMediaItem[]> {
  const allPhotos: GooglePhotosMediaItem[] = [];
  let pageToken: string | undefined;

  do {
    const result = await fetchPhotosFromAlbum(albumId, tokens, onTokenRefresh, pageToken);
    allPhotos.push(...result.photos);
    pageToken = result.nextPageToken;
  } while (pageToken);

  return allPhotos;
}

/**
 * Generate download URL for a photo with specific dimensions
 * Google Photos base URLs expire after 60 minutes and require w/h parameters
 *
 * @param baseUrl - The baseUrl from Google Photos API
 * @param width - Desired width
 * @param height - Desired height
 * @returns URL with dimension parameters
 */
export function getPhotoDownloadUrl(baseUrl: string, width: number, height: number): string {
  return `${baseUrl}=w${width}-h${height}`;
}

/**
 * Download a photo from Google Photos and return as buffer
 *
 * @param mediaItem - The media item to download
 * @param maxWidth - Maximum width (default 1920)
 * @param maxHeight - Maximum height (default 1080)
 * @returns Buffer containing the image data
 */
export async function downloadPhoto(
  mediaItem: GooglePhotosMediaItem,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<Buffer> {
  const url = getPhotoDownloadUrl(mediaItem.baseUrl, maxWidth, maxHeight);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download photo: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
