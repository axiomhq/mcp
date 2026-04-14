import { describe, expect, it } from 'vitest';
import {
  clientAcceptsSSE,
  convertSseToJsonResponse,
  maybeConvertSseResponse,
} from '../src/utils';

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

describe('convertSseToJsonResponse', () => {
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

  it('extracts the JSON-RPC response from SSE', async () => {
    const sseBody = [
      'event: message',
      'data: {"jsonrpc":"2.0","id":1,"result":{"tools":[]}}',
      '',
      '',
    ].join('\n');

    const response = await convertSseToJsonResponse(makeSseResponse(sseBody));

    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.json()).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: { tools: [] },
    });
  });

  it('returns only the JSON-RPC response, dropping notifications', async () => {
    const sseBody = [
      'event: message',
      'data: {"jsonrpc":"2.0","method":"notifications/progress","params":{}}',
      '',
      'event: message',
      'data: {"jsonrpc":"2.0","id":1,"result":"done"}',
      '',
      '',
    ].join('\n');

    const response = await convertSseToJsonResponse(makeSseResponse(sseBody));
    const json = await response.json();

    expect(json).toEqual({ jsonrpc: '2.0', id: 1, result: 'done' });
  });

  it('handles multiline data fields per SSE spec', async () => {
    const sseBody = [
      'event: message',
      'data: {"jsonrpc":"2.0","id":1,',
      'data: "result":"multi-line"}',
      '',
      '',
    ].join('\n');

    const response = await convertSseToJsonResponse(makeSseResponse(sseBody));
    const json = await response.json();

    expect(json).toEqual({ jsonrpc: '2.0', id: 1, result: 'multi-line' });
  });

  it('preserves mcp-session-id header', async () => {
    const sseBody =
      'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{}}\n\n';
    const response = await convertSseToJsonResponse(
      makeSseResponse(sseBody, { 'mcp-session-id': 'abc123' })
    );
    expect(response.headers.get('mcp-session-id')).toBe('abc123');
  });

  it('preserves CORS headers', async () => {
    const sseBody =
      'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{}}\n\n';
    const response = await convertSseToJsonResponse(
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
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
    );
    const response = await convertSseToJsonResponse(sseResponse);
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

    const response = await convertSseToJsonResponse(makeSseResponse(sseBody));
    expect(await response.json()).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: 'valid',
    });
  });

  it('returns empty object for SSE with no response messages', async () => {
    const sseBody = 'event: ping\n\n';
    const response = await convertSseToJsonResponse(makeSseResponse(sseBody));
    expect(await response.json()).toEqual({});
  });
});

describe('maybeConvertSseResponse', () => {
  it('converts SSE when client did not request it', async () => {
    const request = new Request('https://mcp.axiom.co/mcp', {
      headers: { Accept: 'application/json' },
    });
    const sseResponse = new Response(
      'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{}}\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } }
    );

    const response = await maybeConvertSseResponse(request, sseResponse);
    expect(response.headers.get('content-type')).toBe('application/json');
  });

  it('passes through SSE when client requested it', async () => {
    const request = new Request('https://mcp.axiom.co/mcp', {
      headers: { Accept: 'application/json, text/event-stream' },
    });
    const sseResponse = new Response('event: message\ndata: {}\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    });

    const response = await maybeConvertSseResponse(request, sseResponse);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
  });

  it('passes through non-SSE responses unchanged', async () => {
    const request = new Request('https://mcp.axiom.co/mcp');
    const jsonResponse = new Response('{}', {
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await maybeConvertSseResponse(request, jsonResponse);
    expect(response.headers.get('content-type')).toBe('application/json');
  });
});
