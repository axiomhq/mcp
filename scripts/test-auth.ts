#!/usr/bin/env bun

import { createHash, randomBytes } from 'crypto';
import { parse } from 'url';
import readline from 'readline';

// Configuration
const ENVIRONMENTS = {
  local: {
    name: 'Local',
    baseUrl: 'http://localhost:8788',
    clientId: 'test-client',
    redirectUri: 'http://localhost:3000/callback',
  },
  staging: {
    name: 'Staging',
    baseUrl: 'https://mcp-staging.axiom.workers.dev',
    clientId: 'test-client',
    redirectUri: 'http://localhost:3000/callback',
  },
};

// OAuth 2.0 PKCE helper functions
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

// User input helper
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Main flow
async function main() {
  console.log('🔐 Axiom MCP OAuth Test Tool\n');

  // Select environment
  console.log('Select environment:');
  console.log('1. Local (localhost:8788)');
  console.log('2. Staging (mcp-staging.axiom.workers.dev)\n');

  const envChoice = await question('Enter choice (1 or 2): ');
  const environment = envChoice === '2' ? ENVIRONMENTS.staging : ENVIRONMENTS.local;

  console.log(`\n✅ Using ${environment.name} environment\n`);

  // Allow custom client ID
  const customClientId = await question(
    `Client ID (press Enter for default: ${environment.clientId}): `
  );
  if (customClientId) {
    environment.clientId = customClientId;
  }

  // Allow custom redirect URI
  const customRedirectUri = await question(
    `Redirect URI (press Enter for default: ${environment.redirectUri}): `
  );
  if (customRedirectUri) {
    environment.redirectUri = customRedirectUri;
  }

  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  console.log('\n📝 OAuth Parameters:');
  console.log('─'.repeat(50));
  console.log(`Client ID:        ${environment.clientId}`);
  console.log(`Redirect URI:     ${environment.redirectUri}`);
  console.log(`Code Verifier:    ${codeVerifier}`);
  console.log(`Code Challenge:   ${codeChallenge}`);
  console.log(`State:            ${state}`);
  console.log('─'.repeat(50));

  // Build authorization URL
  const authUrl = new URL(`${environment.baseUrl}/authorize`);
  authUrl.searchParams.set('client_id', environment.clientId);
  authUrl.searchParams.set('redirect_uri', environment.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('scope', 'mcp:*');

  console.log('\n🌐 Authorization URL:');
  console.log(authUrl.toString());
  console.log('\n👆 Open this URL in your browser to start the OAuth flow');

  console.log('\n⏳ After authorization, you\'ll be redirected to your callback URL.');
  console.log('   Copy the FULL redirect URL and paste it here.\n');

  const callbackUrl = await question('Paste redirect URL: ');

  // Parse the callback URL
  const parsedUrl = new URL(callbackUrl);
  const code = parsedUrl.searchParams.get('code');
  const returnedState = parsedUrl.searchParams.get('state');
  const error = parsedUrl.searchParams.get('error');
  const errorDescription = parsedUrl.searchParams.get('error_description');

  if (error) {
    console.error(`\n❌ Authorization failed: ${error}`);
    if (errorDescription) {
      console.error(`   ${errorDescription}`);
    }
    rl.close();
    process.exit(1);
  }

  if (returnedState !== state) {
    console.error('\n❌ State mismatch! Possible CSRF attack.');
    console.error(`   Expected: ${state}`);
    console.error(`   Received: ${returnedState}`);
    rl.close();
    process.exit(1);
  }

  if (!code) {
    console.error('\n❌ No authorization code received');
    rl.close();
    process.exit(1);
  }

  console.log('\n✅ Authorization successful!');
  console.log(`   Code: ${code}`);

  // Exchange code for token
  console.log('\n🔄 Exchanging code for access token...');

  const tokenUrl = `${environment.baseUrl}/token`;
  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: environment.redirectUri,
    client_id: environment.clientId,
    code_verifier: codeVerifier,
  });

  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('\n❌ Token exchange failed:');
      console.error(JSON.stringify(tokenData, null, 2));
      rl.close();
      process.exit(1);
    }

    console.log('\n🎉 Token exchange successful!');
    console.log('─'.repeat(50));
    console.log('Access Token:');
    console.log(tokenData.access_token);
    console.log('─'.repeat(50));

    if (tokenData.refresh_token) {
      console.log('Refresh Token:');
      console.log(tokenData.refresh_token);
      console.log('─'.repeat(50));
    }

    console.log(`Token Type:    ${tokenData.token_type}`);
    console.log(`Expires In:    ${tokenData.expires_in} seconds`);
    console.log(`Scope:         ${tokenData.scope || 'N/A'}`);

    // Test SSE connection
    console.log('\n🔌 Testing SSE connection...');
    console.log('   (Press Ctrl+C to exit)\n');

    const sseUrl = `${environment.baseUrl}/sse`;
    const eventSource = new EventSource(sseUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    } as any);

    eventSource.onopen = () => {
      console.log('✅ SSE connection established');
    };

    eventSource.onmessage = (event) => {
      console.log('📨 Message:', event.data);
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE error:', error);
      eventSource.close();
      rl.close();
      process.exit(1);
    };
  } catch (error) {
    console.error('\n❌ Error during token exchange:', error);
    rl.close();
    process.exit(1);
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

// Run the script
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  rl.close();
  process.exit(1);
});