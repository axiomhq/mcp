import { describe, expect, it } from 'vitest';
import { ensureAcceptHeader } from '../src/utils';

describe('ensureAcceptHeader', () => {
  const url = 'https://mcp.axiom.co/mcp';

  it('should inject Accept header when none is present', () => {
    const request = new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = ensureAcceptHeader(request);

    expect(result.headers.get('accept')).toBe(
      'application/json, text/event-stream'
    );
  });

  it('should return the original request when Accept header is already correct', () => {
    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
    });

    const result = ensureAcceptHeader(request);

    expect(result).toBe(request);
  });

  it('should inject Accept header when only application/json is present', () => {
    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const result = ensureAcceptHeader(request);

    expect(result).not.toBe(request);
    expect(result.headers.get('accept')).toBe(
      'application/json, text/event-stream'
    );
  });

  it('should inject Accept header when only text/event-stream is present', () => {
    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
    });

    const result = ensureAcceptHeader(request);

    expect(result).not.toBe(request);
    expect(result.headers.get('accept')).toBe(
      'application/json, text/event-stream'
    );
  });

  it('should preserve other headers when injecting Accept', () => {
    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer xapt-test-token',
      },
    });

    const result = ensureAcceptHeader(request);

    expect(result.headers.get('accept')).toBe(
      'application/json, text/event-stream'
    );
    expect(result.headers.get('authorization')).toBe(
      'Bearer xapt-test-token'
    );
    expect(result.headers.get('content-type')).toBe('application/json');
  });

  it('should handle Accept header with extra media types that include both required types', () => {
    const request = new Request(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream, text/html',
      },
    });

    const result = ensureAcceptHeader(request);

    expect(result).toBe(request);
  });

  it('should inject when Accept is an unrelated media type', () => {
    const request = new Request(url, {
      method: 'POST',
      headers: {
        Accept: 'text/html',
      },
    });

    const result = ensureAcceptHeader(request);

    expect(result).not.toBe(request);
    expect(result.headers.get('accept')).toBe(
      'application/json, text/event-stream'
    );
  });
});
