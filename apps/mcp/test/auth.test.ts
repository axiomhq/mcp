import { beforeEach, describe, expect, it } from 'vitest';
import { sha256 } from '../src/utils';

describe('Auth Utilities', () => {
  describe('sha256', () => {
    it('should generate consistent hash for same input', async () => {
      const input = 'test-string';
      const hash1 = await sha256(input);
      const hash2 = await sha256(input);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', async () => {
      const hash1 = await sha256('input1');
      const hash2 = await sha256('input2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return base64url encoded string', async () => {
      const hash = await sha256('test');
      // Base64url uses only A-Z, a-z, 0-9, -, _
      expect(hash).toMatch(/^[A-Za-z0-9\-_]+$/);
    });
  });
});
