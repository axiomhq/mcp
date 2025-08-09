# OAuth Testing Scripts

Scripts to help test the OAuth flow for the Axiom MCP server.

## oauth-test-server.ts (Web UI)

A web-based OAuth testing tool with a user-friendly interface:

```bash
# Start the web server
bun scripts/oauth-test-server.ts

# Open in browser
# http://localhost:3456
```

Features:
- 🌐 Web UI for the complete OAuth flow
- 🎯 Support for local, staging, or custom environments  
- 🔐 Automatic PKCE parameter generation
- ✅ Shows access token after successful authorization
- 🔌 Live SSE connection testing
- 📋 Copy-friendly token display

## test-auth.ts

Interactive script that walks you through the complete OAuth flow:

```bash
# Run the interactive auth tester
bun scripts/test-auth.ts
```

Features:
- Choose between local and staging environments
- Generates PKCE parameters automatically
- Guides you through the authorization flow
- Exchanges auth code for access token
- Tests SSE connection with the token

## generate-oauth-params.ts

Quick script to generate OAuth parameters for manual testing:

```bash
# Generate params for localhost (default)
bun scripts/generate-oauth-params.ts

# Custom parameters
bun scripts/generate-oauth-params.ts my-client-id http://localhost:3000/callback http://localhost:8788

# For staging
bun scripts/generate-oauth-params.ts test-client http://localhost:3000/callback https://mcp-staging.axiom.workers.dev
```

Outputs:
- State, code verifier, and code challenge
- Complete authorization URL
- cURL command template for token exchange

## Manual Testing Flow

1. Generate OAuth parameters:
   ```bash
   bun scripts/generate-oauth-params.ts
   ```

2. Open the authorization URL in your browser

3. Complete the authorization flow (approve the client, login to Axiom, select org)

4. Copy the authorization code from the redirect URL

5. Exchange the code for a token using the provided cURL command

## Testing with MCP Inspector

```bash
# Start local dev server
npm run dev

# In another terminal, run the auth flow
bun scripts/test-auth.ts

# Use the access token with MCP Inspector
npx @modelcontextprotocol/inspector@latest

# Connect to: http://localhost:8788/sse
# Add Authorization header: Bearer YOUR_ACCESS_TOKEN
```