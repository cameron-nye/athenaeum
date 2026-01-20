/**
 * Tests for Google Photos API utilities
 * REQ-4-023: Create Google Photos album list fetch
 */

import { describe, it, expect } from 'vitest';
import {
  categorizePhotosApiError,
  getPhotoDownloadUrl,
  type GooglePhotosErrorType,
} from './photos';
import { TokenRevocationError } from './auth';

describe('categorizePhotosApiError', () => {
  it('categorizes TokenRevocationError as auth', () => {
    const error = new TokenRevocationError('Token revoked');
    expect(categorizePhotosApiError(error)).toBe('auth');
  });

  it('categorizes 401 errors as auth', () => {
    const error = new Error('401 Unauthenticated');
    expect(categorizePhotosApiError(error)).toBe('auth');
  });

  it('categorizes 404 errors as not_found', () => {
    const error = new Error('404 Not Found');
    expect(categorizePhotosApiError(error)).toBe('not_found');
  });

  it('categorizes 429 errors as rate_limit', () => {
    const error = new Error('429 Rate limit exceeded');
    expect(categorizePhotosApiError(error)).toBe('rate_limit');
  });

  it('categorizes quota errors as rate_limit', () => {
    const error = new Error('Quota exceeded for this project');
    expect(categorizePhotosApiError(error)).toBe('rate_limit');
  });

  it('categorizes 500 errors as server_error', () => {
    const error = new Error('500 Internal Server Error');
    expect(categorizePhotosApiError(error)).toBe('server_error');
  });

  it('categorizes 503 errors as server_error', () => {
    const error = new Error('503 Service Unavailable');
    expect(categorizePhotosApiError(error)).toBe('server_error');
  });

  it('categorizes network errors', () => {
    const errors: [Error, GooglePhotosErrorType][] = [
      [new Error('ENOTFOUND'), 'network'],
      [new Error('ECONNREFUSED'), 'network'],
      [new Error('ETIMEDOUT'), 'network'],
      [new Error('network error'), 'network'],
    ];

    for (const [error, expectedType] of errors) {
      expect(categorizePhotosApiError(error)).toBe(expectedType);
    }
  });

  it('returns unknown for unrecognized errors', () => {
    const error = new Error('Some random error');
    expect(categorizePhotosApiError(error)).toBe('unknown');
  });

  it('returns unknown for non-Error values', () => {
    expect(categorizePhotosApiError('string error')).toBe('unknown');
    expect(categorizePhotosApiError(123)).toBe('unknown');
    expect(categorizePhotosApiError(null)).toBe('unknown');
  });
});

describe('getPhotoDownloadUrl', () => {
  it('appends width and height parameters', () => {
    const baseUrl = 'https://lh3.googleusercontent.com/photo/ABC123';
    const url = getPhotoDownloadUrl(baseUrl, 1920, 1080);
    expect(url).toBe('https://lh3.googleusercontent.com/photo/ABC123=w1920-h1080');
  });

  it('handles different dimensions', () => {
    const baseUrl = 'https://example.com/photo';
    expect(getPhotoDownloadUrl(baseUrl, 300, 300)).toBe('https://example.com/photo=w300-h300');
    expect(getPhotoDownloadUrl(baseUrl, 800, 600)).toBe('https://example.com/photo=w800-h600');
  });
});
