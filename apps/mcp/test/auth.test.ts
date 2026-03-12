import { describe, expect, it, vi } from 'vitest';
import { AxiomHandler } from '../src/auth';
import { sha256 } from '../src/utils';

vi.mock('cloudflare:workers', () => ({
  env: {
    COOKIE_ENCRYPTION_KEY: 'test-cookie-secret-key-32-chars-long!!',
  },
}));

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

describe('GET /authorize', () => {
  it('returns 400 when client_id is missing', async () => {
    const parseAuthRequest = vi.fn().mockResolvedValue({
      clientId: undefined,
      redirectUri: 'http://localhost/callback',
      scope: '',
    });
    const env = {
      OAUTH_PROVIDER: { parseAuthRequest },
    };
    const res = await AxiomHandler.request(
      'http://localhost/authorize',
      { method: 'GET' },
      env
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Invalid request: missing client_id');
    expect(parseAuthRequest).toHaveBeenCalledTimes(1);
  });

  it('returns 200 with approval dialog HTML when client_id is present and not already approved', async () => {
    const parseAuthRequest = vi.fn().mockResolvedValue({
      clientId: 'test-client-id',
      redirectUri: 'https://example.com/callback',
      scope: 'read',
    });
    const env = {
      OAUTH_PROVIDER: { parseAuthRequest },
    };
    const res = await AxiomHandler.request(
      'http://localhost/authorize',
      { method: 'GET' },
      env
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Example'); // client name derived from example.com
    expect(html).toContain('requesting access');
    expect(html).toContain('action="/authorize"');
    expect(html).toContain('https://example.com/callback');
    expect(parseAuthRequest).toHaveBeenCalledTimes(1);
  });

  it('returns rejects redirect uri with javascript:alert(1)', async () => {
    const parseAuthRequest = vi.fn().mockResolvedValue({
      clientId: 'test-client-id',
      redirectUri: "javascript:alert(1)",
      scope: 'read',
    });
    const env = {
      OAUTH_PROVIDER: { parseAuthRequest },
    };
    const res = await AxiomHandler.request(
      'http://localhost/authorize',
      { method: 'GET' },
      env
    );
    expect(res.status).toBe(400);
  });

  it('returns rejects redirect uri with scripts)', async () => {
    const parseAuthRequest = vi.fn().mockResolvedValue({
      clientId: 'test-client-id',
      redirectUri: "data:text/html,<script>alert(1)</script>",
      scope: 'read',
    });
    const env = {
      OAUTH_PROVIDER: { parseAuthRequest },
    };
    const res = await AxiomHandler.request(
      'http://localhost/authorize',
      { method: 'GET' },
      env
    );
    expect(res.status).toBe(400);
  });


});
