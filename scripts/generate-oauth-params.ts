#!/usr/bin/env bun

import { createHash, randomBytes } from 'crypto';

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

// Main
const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);
const state = generateState();

const clientId = process.argv[2] || 'test-client';
const redirectUri = process.argv[3] || 'http://localhost:3000/callback';
const baseUrl = process.argv[4] || 'http://localhost:8788';

console.log('🔐 OAuth 2.0 PKCE Parameters\n');
console.log('─'.repeat(60));
console.log(`Client ID:        ${clientId}`);
console.log(`Redirect URI:     ${redirectUri}`);
console.log(`Base URL:         ${baseUrl}`);
console.log('─'.repeat(60));
console.log(`State:            ${state}`);
console.log(`Code Verifier:    ${codeVerifier}`);
console.log(`Code Challenge:   ${codeChallenge}`);
console.log('─'.repeat(60));

const authUrl = new URL(`${baseUrl}/authorize`);
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');
authUrl.searchParams.set('scope', 'mcp:*');

console.log('\n🌐 Authorization URL:');
console.log(authUrl.toString());

console.log('\n📋 cURL command for token exchange (after getting code):');
console.log(`
curl -X POST ${baseUrl}/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=authorization_code" \\
  -d "code=YOUR_AUTH_CODE" \\
  -d "redirect_uri=${encodeURIComponent(redirectUri)}" \\
  -d "client_id=${encodeURIComponent(clientId)}" \\
  -d "code_verifier=${codeVerifier}"
`.trim());

console.log('\n💡 Usage: bun generate-oauth-params.ts [client_id] [redirect_uri] [base_url]');