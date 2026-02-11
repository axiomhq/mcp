import { describe, expect, it } from 'vitest';
import { extractAccessToken } from '../src/utils';

describe('extractAccessToken', () => {
  it('should extract token from Bearer prefix', () => {
    expect(extractAccessToken('Bearer xapt-abc123')).toBe('xapt-abc123');
  });

  it('should return raw token when no Bearer prefix', () => {
    expect(extractAccessToken('xapt-abc123')).toBe('xapt-abc123');
  });

  it('should return null for null input', () => {
    expect(extractAccessToken(null)).toBeNull();
  });

  it('should not strip non-Bearer prefixes', () => {
    expect(extractAccessToken('Token xapt-abc123')).toBe('Token xapt-abc123');
  });

  it('should handle Bearer prefix case-sensitively', () => {
    expect(extractAccessToken('bearer xapt-abc123')).toBe('bearer xapt-abc123');
  });

  it('should treat empty string as no token', () => {
    expect(extractAccessToken('')).toBeNull();
  });

  it('should not strip "Bearer" without trailing space', () => {
    expect(extractAccessToken('Bearerxapt-abc123')).toBe('Bearerxapt-abc123');
  });
});
