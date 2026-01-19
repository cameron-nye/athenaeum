import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Credentials } from 'google-auth-library';
import { checkTokenStatus, TokenRevocationError } from './auth';

describe('google/auth', () => {
  const originalEnv = process.env;
  const mockEnv = {
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:3000/api/google/callback',
  };

  beforeEach(() => {
    process.env = { ...originalEnv, ...mockEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('checkTokenStatus', () => {
    it('returns not expired when token has future expiry', () => {
      const tokens: Credentials = {
        access_token: 'token',
        refresh_token: 'refresh',
        expiry_date: Date.now() + 3600000, // 1 hour from now
      };

      const result = checkTokenStatus(tokens);

      expect(result.isExpired).toBe(false);
      expect(result.canRefresh).toBe(true);
    });

    it('returns expired when token expiry is in the past', () => {
      const tokens: Credentials = {
        access_token: 'token',
        refresh_token: 'refresh',
        expiry_date: Date.now() - 1000, // 1 second ago
      };

      const result = checkTokenStatus(tokens);

      expect(result.isExpired).toBe(true);
      expect(result.canRefresh).toBe(true);
    });

    it('returns expired when within 5 minute buffer', () => {
      const tokens: Credentials = {
        access_token: 'token',
        refresh_token: 'refresh',
        expiry_date: Date.now() + 60000, // 1 minute from now (within 5 min buffer)
      };

      const result = checkTokenStatus(tokens);

      expect(result.isExpired).toBe(true);
      expect(result.canRefresh).toBe(true);
    });

    it('returns not expired when just outside 5 minute buffer', () => {
      const tokens: Credentials = {
        access_token: 'token',
        refresh_token: 'refresh',
        expiry_date: Date.now() + 6 * 60 * 1000, // 6 minutes from now
      };

      const result = checkTokenStatus(tokens);

      expect(result.isExpired).toBe(false);
      expect(result.canRefresh).toBe(true);
    });

    it('returns expired when no expiry_date', () => {
      const tokens: Credentials = {
        access_token: 'token',
        refresh_token: 'refresh',
      };

      const result = checkTokenStatus(tokens);

      expect(result.isExpired).toBe(true);
      expect(result.canRefresh).toBe(true);
    });

    it('returns cannot refresh when no refresh_token', () => {
      const tokens: Credentials = {
        access_token: 'token',
        expiry_date: Date.now() - 1000,
      };

      const result = checkTokenStatus(tokens);

      expect(result.isExpired).toBe(true);
      expect(result.canRefresh).toBe(false);
    });

    it('returns cannot refresh and not expired when token is valid without refresh_token', () => {
      const tokens: Credentials = {
        access_token: 'token',
        expiry_date: Date.now() + 3600000,
      };

      const result = checkTokenStatus(tokens);

      expect(result.isExpired).toBe(false);
      expect(result.canRefresh).toBe(false);
    });
  });

  describe('createOAuth2Client', () => {
    it('throws when GOOGLE_CLIENT_ID is missing', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      const { createOAuth2Client } = await import('./auth');
      expect(() => createOAuth2Client()).toThrow('Missing Google OAuth environment variables');
    });

    it('throws when GOOGLE_CLIENT_SECRET is missing', async () => {
      delete process.env.GOOGLE_CLIENT_SECRET;
      const { createOAuth2Client } = await import('./auth');
      expect(() => createOAuth2Client()).toThrow('Missing Google OAuth environment variables');
    });

    it('throws when GOOGLE_REDIRECT_URI is missing', async () => {
      delete process.env.GOOGLE_REDIRECT_URI;
      const { createOAuth2Client } = await import('./auth');
      expect(() => createOAuth2Client()).toThrow('Missing Google OAuth environment variables');
    });

    it('creates client when all env vars are present', async () => {
      const { createOAuth2Client } = await import('./auth');
      const client = createOAuth2Client();
      expect(client).toBeDefined();
    });
  });

  describe('createOAuth2ClientWithTokens', () => {
    it('creates client and sets credentials', async () => {
      const { createOAuth2ClientWithTokens } = await import('./auth');

      const tokens: Credentials = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
      };

      const client = createOAuth2ClientWithTokens(tokens);
      expect(client).toBeDefined();
      // The client should have credentials set internally
      expect(client.credentials).toEqual(tokens);
    });
  });

  describe('generateAuthUrl', () => {
    it('generates auth URL with default scopes', async () => {
      const { generateAuthUrl } = await import('./auth');
      const url = generateAuthUrl('csrf-state');

      expect(url).toContain('https://accounts.google.com');
      expect(url).toContain('state=csrf-state');
      expect(url).toContain('calendar.readonly');
      expect(url).toContain('access_type=offline');
    });

    it('generates auth URL with custom scopes', async () => {
      const { generateAuthUrl } = await import('./auth');
      const customScopes = ['https://www.googleapis.com/auth/calendar'];
      const url = generateAuthUrl('state', customScopes);

      expect(url).toContain('calendar');
      expect(url).not.toContain('calendar.readonly');
    });
  });

  describe('getValidOAuth2Client', () => {
    it('returns client without refresh when token is valid', async () => {
      const { getValidOAuth2Client } = await import('./auth');

      const tokens: Credentials = {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      const client = await getValidOAuth2Client(tokens);
      expect(client).toBeDefined();
      expect(client.credentials.access_token).toBe('valid-token');
    });

    it('throws when expired and no refresh token', async () => {
      const { getValidOAuth2Client } = await import('./auth');

      const tokens: Credentials = {
        access_token: 'expired-token',
        expiry_date: Date.now() - 1000,
      };

      await expect(getValidOAuth2Client(tokens)).rejects.toThrow(
        'Access token expired and no refresh token available'
      );
    });
  });

  describe('TokenRevocationError', () => {
    it('has correct name property', () => {
      const error = new TokenRevocationError('Token revoked');
      expect(error.name).toBe('TokenRevocationError');
      expect(error.message).toBe('Token revoked');
    });

    it('is instance of Error', () => {
      const error = new TokenRevocationError('Token revoked');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TokenRevocationError);
    });
  });
});
