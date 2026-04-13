import { describe, expect, it } from 'vitest';
import { isInitializeRequest } from '../src/utils';

describe('isInitializeRequest', () => {
  it('should return true for a single initialize request', () => {
    expect(
      isInitializeRequest({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
        id: 1,
      })
    ).toBe(true);
  });

  it('should return true for a batch containing an initialize request', () => {
    expect(
      isInitializeRequest([
        {
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0' },
          },
          id: 1,
        },
        { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 2 },
      ])
    ).toBe(true);
  });

  it('should return false for a single non-init request', () => {
    expect(
      isInitializeRequest({
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 1,
      })
    ).toBe(false);
  });

  it('should return false for a batch without initialize', () => {
    expect(
      isInitializeRequest([
        { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 1 },
        { jsonrpc: '2.0', method: 'tools/call', params: {}, id: 2 },
      ])
    ).toBe(false);
  });

  it('should return false for an empty array', () => {
    expect(isInitializeRequest([])).toBe(false);
  });

  it('should return false for null', () => {
    expect(isInitializeRequest(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isInitializeRequest(undefined)).toBe(false);
  });

  it('should return false for a non-object primitive', () => {
    expect(isInitializeRequest(42)).toBe(false);
    expect(isInitializeRequest('initialize')).toBe(false);
  });

  it('should return false for an object without a method field', () => {
    expect(isInitializeRequest({ jsonrpc: '2.0', id: 1 })).toBe(false);
  });

  it('should return false for an array containing non-objects', () => {
    expect(isInitializeRequest([42, 'initialize', null])).toBe(false);
  });

  it('should return false for a notification (no id) that is not initialize', () => {
    expect(
      isInitializeRequest({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      })
    ).toBe(false);
  });
});
