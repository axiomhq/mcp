#!/usr/bin/env bun

import { createHash, randomBytes } from 'crypto';

const PORT = 3456;

// OAuth helper functions
function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateCodeVerifier(): string {
  return base64UrlEncode(randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  return base64UrlEncode(createHash('sha256').update(verifier).digest());
}

function generateState(): string {
  return base64UrlEncode(randomBytes(16));
}

// Store active sessions
const sessions = new Map<string, {
  codeVerifier: string;
  state: string;
  environment: string;
  clientId: string;
}>();

// HTML template
const getHTML = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Axiom MCP OAuth Tester</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    :root {
      --gray-1: hsl(0, 0%, 99.0%);
      --gray-2: hsl(0, 0%, 97.3%);
      --gray-3: hsl(0, 0%, 95.1%);
      --gray-6: hsl(0, 0%, 88.7%);
      --gray-11: hsl(0, 0%, 43.5%);
      --gray-12: hsl(0, 0%, 9.0%);
      --blue-9: hsl(206, 100%, 50.0%);
      --blue-10: hsl(208, 100%, 47.3%);
      --green-9: hsl(151, 55%, 41.5%);
      --red-9: hsl(358, 75%, 59%);
    }
    
    @media (prefers-color-scheme: dark) {
      :root {
        --gray-1: hsl(0, 0%, 8.5%);
        --gray-2: hsl(0, 0%, 11.0%);
        --gray-3: hsl(0, 0%, 13.6%);
        --gray-6: hsl(0, 0%, 20.5%);
        --gray-11: hsl(0, 0%, 62.8%);
        --gray-12: hsl(0, 0%, 93.0%);
        --blue-9: hsl(206, 100%, 50.0%);
        --blue-10: hsl(209, 100%, 60.6%);
        --green-9: hsl(151, 55%, 41.5%);
        --red-9: hsl(358, 65%, 48.7%);
      }
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: var(--gray-1);
      color: var(--gray-12);
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    
    .container {
      max-width: 600px;
      width: 100%;
      background: var(--gray-2);
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    h1 {
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .subtitle {
      color: var(--gray-11);
      margin-bottom: 2rem;
      font-size: 0.95rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      font-size: 0.9rem;
    }
    
    input, select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--gray-6);
      border-radius: 8px;
      background: var(--gray-1);
      color: var(--gray-12);
      font-size: 1rem;
    }
    
    select {
      cursor: pointer;
    }
    
    button {
      width: 100%;
      padding: 0.75rem;
      background: var(--blue-9);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    button:hover {
      background: var(--blue-10);
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .info-box {
      background: var(--gray-3);
      border-radius: 8px;
      padding: 1rem;
      margin: 1.5rem 0;
      font-family: monospace;
      font-size: 0.85rem;
      word-break: break-all;
    }
    
    .info-box strong {
      display: block;
      margin-bottom: 0.25rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    
    .success {
      background: hsl(151, 55%, 41.5%, 0.1);
      border: 1px solid var(--green-9);
      color: var(--green-9);
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
    }
    
    .error {
      background: hsl(358, 75%, 59%, 0.1);
      border: 1px solid var(--red-9);
      color: var(--red-9);
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
    }
    
    .token-display {
      background: var(--gray-1);
      border: 1px solid var(--gray-6);
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
      word-break: break-all;
      font-family: monospace;
      font-size: 0.85rem;
      max-height: 200px;
      overflow-y: auto;
    }
    
    .sse-log {
      background: var(--gray-1);
      border: 1px solid var(--gray-6);
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
      font-family: monospace;
      font-size: 0.85rem;
      height: 200px;
      overflow-y: auto;
    }
    
    .sse-log div {
      padding: 0.25rem 0;
      border-bottom: 1px solid var(--gray-3);
    }
    
    .back-link {
      display: inline-block;
      color: var(--blue-9);
      text-decoration: none;
      margin-top: 1rem;
    }
    
    .back-link:hover {
      text-decoration: underline;
    }
    
    #sseStatus {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
      margin-left: 0.5rem;
    }
    
    #sseStatus.connected {
      background: hsl(151, 55%, 41.5%, 0.1);
      color: var(--green-9);
    }
    
    #sseStatus.disconnected {
      background: hsl(358, 75%, 59%, 0.1);
      color: var(--red-9);
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
`;

// Main page
const getMainPage = () => getHTML(`
  <h1>🔐 Axiom MCP OAuth Tester</h1>
  <p class="subtitle">Test the OAuth flow for your MCP server</p>
  
  <form action="/start" method="POST">
    <div class="form-group">
      <label for="environment">Environment</label>
      <select name="environment" id="environment" onchange="updateBaseUrl()">
        <option value="http://localhost:8788">Local (localhost:8788)</option>
        <option value="https://mcp-staging.axiom.workers.dev">Staging</option>
        <option value="custom">Custom URL</option>
      </select>
    </div>
    
    <div class="form-group" id="customUrlGroup" style="display: none;">
      <label for="customUrl">Custom Base URL</label>
      <input type="url" name="customUrl" id="customUrl" placeholder="https://your-server.com">
    </div>
    
    <div class="form-group">
      <label for="clientId">Client ID</label>
      <input type="text" name="clientId" id="clientId" value="test-client" required>
    </div>
    
    <button type="submit">Start OAuth Flow</button>
  </form>
  
  <script>
    function updateBaseUrl() {
      const select = document.getElementById('environment');
      const customGroup = document.getElementById('customUrlGroup');
      const customInput = document.getElementById('customUrl');
      
      if (select.value === 'custom') {
        customGroup.style.display = 'block';
        customInput.required = true;
      } else {
        customGroup.style.display = 'none';
        customInput.required = false;
      }
    }
  </script>
`);

// Authorization page
const getAuthPage = (authUrl: string, sessionId: string, params: any) => getHTML(`
  <h1>🚀 Ready to Authorize</h1>
  <p class="subtitle">Click the button below to start the authorization flow</p>
  
  <div class="info-box">
    <strong>Session ID:</strong>
    ${sessionId}
  </div>
  
  <div class="info-box">
    <strong>OAuth Parameters:</strong>
    State: ${params.state}<br>
    Code Challenge: ${params.codeChallenge}<br>
    Client ID: ${params.clientId}
  </div>
  
  <a href="${authUrl}" style="text-decoration: none;">
    <button>Authorize with Axiom</button>
  </a>
  
  <a href="/" class="back-link">← Start over</a>
`);

// Callback handler
const getCallbackPage = (success: boolean, data: any) => {
  if (success) {
    return getHTML(`
      <h1>✅ Authorization Successful!</h1>
      <p class="subtitle">Your access token is ready</p>
      
      <div class="success">
        Successfully exchanged authorization code for access token
      </div>
      
      <div class="info-box">
        <strong>Access Token:</strong>
        <div class="token-display">${data.access_token}</div>
      </div>
      
      ${data.refresh_token ? `
      <div class="info-box">
        <strong>Refresh Token:</strong>
        <div class="token-display">${data.refresh_token}</div>
      </div>
      ` : ''}
      
      <div class="info-box">
        <strong>Token Details:</strong>
        Type: ${data.token_type}<br>
        Expires In: ${data.expires_in} seconds<br>
        Scope: ${data.scope || 'N/A'}
      </div>
      
      <h2 style="margin-top: 2rem;">🔌 SSE Connection Test</h2>
      <p class="subtitle">
        Testing real-time connection
        <span id="sseStatus" class="disconnected">Disconnected</span>
      </p>
      
      <div class="sse-log" id="sseLog">
        <div>Waiting for connection...</div>
      </div>
      
      <a href="/" class="back-link">← Start new test</a>
      
      <script>
        const token = '${data.access_token}';
        const baseUrl = '${data.baseUrl}';
        const log = document.getElementById('sseLog');
        const status = document.getElementById('sseStatus');
        
        function addLog(message) {
          const div = document.createElement('div');
          div.textContent = new Date().toLocaleTimeString() + ' - ' + message;
          log.appendChild(div);
          log.scrollTop = log.scrollHeight;
        }
        
        // Test SSE connection
        const eventSource = new EventSource(baseUrl + '/sse', {
          headers: {
            'Authorization': 'Bearer ' + token
          }
        });
        
        eventSource.onopen = () => {
          status.textContent = 'Connected';
          status.className = 'connected';
          addLog('SSE connection established');
        };
        
        eventSource.onmessage = (event) => {
          addLog('Message: ' + event.data);
        };
        
        eventSource.onerror = (error) => {
          status.textContent = 'Disconnected';
          status.className = 'disconnected';
          addLog('Connection error or closed');
          eventSource.close();
        };
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
          eventSource.close();
        });
      </script>
    `);
  } else {
    return getHTML(`
      <h1>❌ Authorization Failed</h1>
      <p class="subtitle">Something went wrong during authorization</p>
      
      <div class="error">
        ${data.error}: ${data.error_description || 'Unknown error'}
      </div>
      
      ${data.details ? `
      <div class="info-box">
        <strong>Details:</strong>
        <pre>${JSON.stringify(data.details, null, 2)}</pre>
      </div>
      ` : ''}
      
      <a href="/" class="back-link">← Try again</a>
    `);
  }
};

// Create server
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Main page
    if (url.pathname === '/' && req.method === 'GET') {
      return new Response(getMainPage(), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Start OAuth flow
    if (url.pathname === '/start' && req.method === 'POST') {
      const formData = await req.formData();
      const environment = formData.get('environment') as string;
      const customUrl = formData.get('customUrl') as string;
      const clientId = formData.get('clientId') as string;
      
      const baseUrl = environment === 'custom' ? customUrl : environment;
      const sessionId = generateState();
      const state = generateState();
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      
      // Store session
      sessions.set(sessionId, {
        codeVerifier,
        state,
        environment: baseUrl,
        clientId
      });
      
      // Build auth URL
      const authUrl = new URL(`${baseUrl}/authorize`);
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', `http://localhost:${PORT}/callback`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('scope', 'mcp:*');
      
      return new Response(getAuthPage(authUrl.toString(), sessionId, {
        state,
        codeChallenge,
        clientId
      }), {
        headers: { 
          'Content-Type': 'text/html',
          'Set-Cookie': `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax`
        }
      });
    }
    
    // OAuth callback
    if (url.pathname === '/callback' && req.method === 'GET') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');
      
      // Get session from cookie
      const cookie = req.headers.get('cookie');
      const sessionId = cookie?.match(/session=([^;]+)/)?.[1];
      
      if (!sessionId || !sessions.has(sessionId)) {
        return new Response(getCallbackPage(false, {
          error: 'Session expired',
          error_description: 'Please start over'
        }), {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      const session = sessions.get(sessionId)!;
      
      if (error) {
        return new Response(getCallbackPage(false, {
          error,
          error_description: errorDescription
        }), {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      if (state !== session.state) {
        return new Response(getCallbackPage(false, {
          error: 'State mismatch',
          error_description: 'Possible CSRF attack detected'
        }), {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      if (!code) {
        return new Response(getCallbackPage(false, {
          error: 'Missing code',
          error_description: 'No authorization code received'
        }), {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      // Exchange code for token
      try {
        const tokenUrl = `${session.environment}/token`;
        const tokenBody = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `http://localhost:${PORT}/callback`,
          client_id: session.clientId,
          code_verifier: session.codeVerifier,
        });
        
        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: tokenBody.toString(),
        });
        
        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
          return new Response(getCallbackPage(false, {
            error: 'Token exchange failed',
            error_description: tokenData.error_description || 'Failed to exchange code for token',
            details: tokenData
          }), {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        
        // Clean up session
        sessions.delete(sessionId);
        
        return new Response(getCallbackPage(true, {
          ...tokenData,
          baseUrl: session.environment
        }), {
          headers: { 
            'Content-Type': 'text/html',
            'Set-Cookie': 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
          }
        });
      } catch (error) {
        return new Response(getCallbackPage(false, {
          error: 'Network error',
          error_description: 'Failed to contact token endpoint',
          details: error
        }), {
          headers: { 'Content-Type': 'text/html' }
        });
      }
    }
    
    return new Response('Not found', { status: 404 });
  }
});

console.log(`
🚀 OAuth Test Server Running!
   
   Open in your browser:
   http://localhost:${PORT}
   
   This server will handle the OAuth flow and display your access token.
   Press Ctrl+C to stop.
`);