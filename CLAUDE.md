# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Remote Model Context Protocol (MCP) Server deployed on Cloudflare Workers with OAuth authentication. The server enables AI clients (Claude Desktop, Cursor, etc.) to connect remotely and access tools through a secure authentication flow.

## Development Commands

```bash
# Start local development server (port 8788)
npm run dev

# Deploy to Cloudflare Workers
npm run deploy

# Type checking
npm run type-check

# Generate TypeScript types from Wrangler
npm run gen:types
```

## Architecture

### OAuth Dual-Role Implementation
The server acts as both:
- An OAuth **server** for MCP clients
- An OAuth **client** to the upstream OAuth provider (Axiom)

### Core Components

1. **src/index.ts**: Main entry point defining the MCP server and tools
   - Configures the MCP server with available tools
   - Sets up Durable Object binding for state management
   - Implements the SSE endpoint for MCP connections

2. **src/auth-handler.ts**: OAuth authorization flow handler
   - Manages OAuth authorization code flow
   - Handles user authentication and token exchange
   - Interfaces with Axiom OAuth endpoints

3. **Durable Object (MyMCP)**: Persistent state management
   - Stores authenticated user context
   - Provides access to user data via `this.props`
   - Maintains session state between requests

### MCP Tools
Tools are defined in `src/index.ts` and exposed to MCP clients:
- `add`: Simple addition tool (demonstration)
- `userInfoOctokit`: Fetches GitHub user info
- `generateImage`: AI image generation using Cloudflare AI

## Configuration

### Environment Variables
Required in `.dev.vars` for local development:
```
COOKIE_ENCRYPTION_KEY=
ATLAS_API_URL=
AXIOM_OAUTH_CLIENT_ID=
AXIOM_OAUTH_CLIENT_SECRET=
AXIOM_LOGIN_BASE_URL=
```

### Production Secrets
```bash
wrangler secret put AXIOM_OAUTH_CLIENT_ID
wrangler secret put AXIOM_OAUTH_CLIENT_SECRET
wrangler secret put COOKIE_ENCRYPTION_KEY
```

## Testing

Test the MCP server using the MCP Inspector:
```bash
npx @modelcontextprotocol/inspector@latest
```

Connect with URL: `http://localhost:8788/sse`

## Important Notes

- The project is transitioning from GitHub OAuth to Axiom OAuth
- KV namespace `OAUTH_KV` is used for OAuth state storage
- The server uses Cloudflare's AI binding for image generation
- All OAuth endpoints are at the root level: `/authorize`, `/token`, `/callback`, `/register`