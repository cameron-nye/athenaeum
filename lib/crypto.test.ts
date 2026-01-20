import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt } from './crypto';

describe('crypto', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ENCRYPTION_KEY: 'test-encryption-key-32' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('encrypt', () => {
    it('returns a base64 string', () => {
      const result = encrypt('test-token');
      expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('produces different output for same input (due to random IV/salt)', () => {
      const result1 = encrypt('same-token');
      const result2 = encrypt('same-token');
      expect(result1).not.toBe(result2);
    });

    it('throws when ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });
  });

  describe('decrypt', () => {
    it('decrypts encrypted data back to original', () => {
      const original = 'my-secret-oauth-token-12345';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('handles empty strings', () => {
      const original = '';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('handles unicode characters', () => {
      const original = 'token-with-émojis-🔐-and-日本語';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('handles long tokens', () => {
      const original = 'x'.repeat(10000);
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('throws when ENCRYPTION_KEY is not set', () => {
      const encrypted = encrypt('test');
      delete process.env.ENCRYPTION_KEY;
      expect(() => decrypt(encrypted)).toThrow('ENCRYPTION_KEY environment variable is not set');
    });

    it('fails with wrong encryption key', () => {
      const encrypted = encrypt('secret');
      process.env.ENCRYPTION_KEY = 'different-key';
      expect(() => decrypt(encrypted)).toThrow();
    });

    it('fails with tampered ciphertext', () => {
      const encrypted = encrypt('secret');
      const tampered = encrypted.slice(0, -5) + 'XXXXX';
      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe('roundtrip', () => {
    it('preserves JSON data through encrypt/decrypt', () => {
      const data = {
        access_token: 'ya29.test-access-token',
        refresh_token: '1//test-refresh-token',
        expiry_date: 1234567890,
      };
      const original = JSON.stringify(data);
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(JSON.parse(decrypted)).toEqual(data);
    });
  });
});
