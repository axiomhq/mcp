import { describe, expect, it } from 'vitest';
import { clientAcceptsSSE, convertSseToJson } from '../src/utils';

describe('clientAcceptsSSE', () => {
  const url = 'https://mcp.axiom.co/mcp';

  it('returns true when Accept includes text/event-stream', () => {
    const request = new Request(url, {
      headers: { Accept: 'application/json, text/event-stream' },
    });
    expect(clientAcceptsSSE(request)).toBe(true);
  });

  it('returns true when Accept is only text/event-stream', () => {
    const request = new Request(url, {
      headers: { Accept: 'text/event-stream' },
    });
    expect(clientAcceptsSSE(request)).toBe(true);
  });

  it('returns false when Accept is application/json only', () => {
    const request = new Request(url, {
      headers: { Accept: 'application/json' },
    });
    expect(clientAcceptsSSE(request)).toBe(false);
  });

  it('returns false when no Accept header is present', () => {
    const request = new Request(url);
    expect(clientAcceptsSSE(request)).toBe(false);
  });
});

describe('convertSseToJson', () => {
  function makeSseResponse(
    body: string,
    headers?: Record<string, string>
  ): Response {
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        ...headers,
      },
    });
  }

  it('extracts a single JSON-RPC message from SSE and returns it as JSON', async () => {
    const sseBody = [
      'event: message',
      'data: {"jsonrpc":"2.0","id":1,"result":{"tools":[]}}',
      '',
      '',
    ].join('\n');

    const response = await convertSseToJson(makeSseResponse(sseBody));

    expect(response.headers.get('content-type')).toBe('application/json');
    const json = await response.json();
    expect(json).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: { tools: [] },
    });
  });

  it('returns an array when multiple JSON-RPC messages are present', async () => {
    const sseBody = [
      'event: message',
      'data: {"jsonrpc":"2.0","id":1,"result":"first"}',
      '',
      'event: message',
      'data: {"jsonrpc":"2.0","id":2,"result":"second"}',
      '',
      '',
    ].join('\n');

    const response = await convertSseToJson(makeSseResponse(sseBody));
    const json = (await response.json()) as Array<{ id: number; result: string }>;

    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(2);
    expect(json[0].id).toBe(1);
    expect(json[1].id).toBe(2);
  });

  it('preserves mcp-session-id header', async () => {
    const sseBody = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{}}\n\n';
    const response = await convertSseToJson(
      makeSseResponse(sseBody, { 'mcp-session-id': 'abc123' })
    );

    expect(response.headers.get('mcp-session-id')).toBe('abc123');
  });

  it('preserves CORS headers', async () => {
    const sseBody = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{}}\n\n';
    const response = await convertSseToJson(
      makeSseResponse(sseBody, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      })
    );

    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-headers')).toBe(
      'Content-Type'
    );
  });

  it('preserves the original status code', async () => {
    const sseResponse = new Response(
      'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{}}\n\n',
      {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }
    );

    const response = await convertSseToJson(sseResponse);
    expect(response.status).toBe(200);
  });

  it('skips malformed data lines', async () => {
    const sseBody = [
      'event: message',
      'data: not-valid-json',
      '',
      'event: message',
      'data: {"jsonrpc":"2.0","id":1,"result":"valid"}',
      '',
      '',
    ].join('\n');

    const response = await convertSseToJson(makeSseResponse(sseBody));
    const json = await response.json();

    // Only the valid message should be returned (single, not array)
    expect(json).toEqual({ jsonrpc: '2.0', id: 1, result: 'valid' });
  });

  it('returns empty array for SSE with no data lines', async () => {
    const sseBody = 'event: ping\n\n';
    const response = await convertSseToJson(makeSseResponse(sseBody));
    const json = await response.json();
    expect(json).toEqual([]);
  });
});
