import { describe, expect, it } from 'vitest';
import { isInitializeRequest } from '../src/utils';

describe('isInitializeRequest', () => {
  it('returns true for a single initialize request', () => {
    expect(isInitializeRequest({ jsonrpc: '2.0', method: 'initialize', id: 1 })).toBe(true);
  });

  it('returns true for a batch containing an initialize request', () => {
    expect(isInitializeRequest([
      { jsonrpc: '2.0', method: 'initialize', id: 1 },
      { jsonrpc: '2.0', method: 'tools/list', id: 2 },
    ])).toBe(true);
  });

  it('returns false for non-init requests', () => {
    expect(isInitializeRequest({ jsonrpc: '2.0', method: 'tools/list', id: 1 })).toBe(false);
    expect(isInitializeRequest([
      { jsonrpc: '2.0', method: 'tools/list', id: 1 },
      { jsonrpc: '2.0', method: 'tools/call', id: 2 },
    ])).toBe(false);
  });

  it('returns false for non-object values', () => {
    expect(isInitializeRequest(null)).toBe(false);
    expect(isInitializeRequest(undefined)).toBe(false);
    expect(isInitializeRequest(42)).toBe(false);
    expect(isInitializeRequest('initialize')).toBe(false);
    expect(isInitializeRequest([])).toBe(false);
  });
});
