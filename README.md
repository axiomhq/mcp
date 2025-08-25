# Axiom MCP Server

Connect AI assistants to your Axiom observability data through the Model Context Protocol (MCP).

## Quick Start

The Axiom MCP server provides a secure, standardized interface for AI models to access your monitoring and observability data. Connect using OAuth authentication or Personal API tokens.

**Server URLs**:
- Production: `https://mcp.axiom.co/sse` (legacy) or `https://mcp.axiom.co/mcp` (current)
- Test Environment: `https://mcp.axiomtestlabs.co/sse` or `https://mcp.axiomtestlabs.co/mcp`

Both `/sse` (legacy) and `/mcp` (current) endpoints are supported for backward compatibility.

## Setup Instructions

### Claude

#### Claude.ai (Team, Enterprise)

1. Navigate to **Settings** → **Integrations** → **Add more**
2. Enter the following:
   - Integration name: `Axiom`
   - Integration URL: `https://mcp.axiom.co/sse`
3. Enable the tools in any new chats

#### Claude Desktop (Free, Pro)

Claude Desktop requires the `mcp-remote` bridge. Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "axiom": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.axiom.co/sse"]
    }
  }
}
```

Restart Claude Desktop after making changes.

### Cursor

Cursor supports remote servers natively. Install from the [MCP tools directory](https://www.cursor.com/settings) or add manually in settings.

### Visual Studio Code

Use the `mcp-remote` bridge:

1. Press `Cmd/Ctrl + P` and search for **MCP: Add Server**
2. Select **Command (stdio)**
3. Enter: `npx -y mcp-remote https://mcp.axiom.co/sse`
4. Name it **Axiom**

### Windsurf

Add to your Windsurf configuration:

```json
{
  "mcpServers": {
    "axiom": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.axiom.co/sse"]
    }
  }
}
```

### Zed

Add to your Zed settings:

```json
{
  "context_servers": {
    "axiom": {
      "command": {
        "path": "npx",
        "args": ["-y", "mcp-remote", "https://mcp.axiom.co/sse"],
        "env": {}
      }
    }
  }
}
```

## Authentication Methods

### OAuth (Recommended)

The default authentication method. When you first connect, you'll be redirected to Axiom to authorize access. This works seamlessly with the configurations above.

### Personal API Token

For automation or environments where OAuth isn't suitable, use a Personal API token:

1. Generate a Personal API token in Axiom (starts with `xapt-`)
2. Find your Organization ID in Axiom settings
3. Configure your MCP client with environment variables:

```json
{
  "mcpServers": {
    "axiom": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.axiom.co/sse"],
      "env": {
        "AXIOM_BEARER_TOKEN": "xapt-your_token_here",
        "AXIOM_ORG_ID": "your-organization-id"
      }
    }
  }
}
```

The server automatically detects and uses bearer token authentication when these environment variables are present.

## Available Tools

The Axiom MCP server provides intelligent tools that go beyond simple API wrapping:

### Core Tools

- **`listDatasets`** - Discover available datasets with type classification
- **`getDatasetFields`** - Explore dataset schemas with field analysis
- **`queryDataset`** - Execute APL queries with 140+ built-in examples
- **`checkMonitors`** - View monitor health and alert states
- **`getMonitorHistory`** - Analyze historical monitor checks

## Development

### Project Structure

This is a monorepo with two main components:

```
mcp/
├── packages/mcp/     # Core MCP implementation
│   ├── src/
│   │   └── core/     # Dataset and monitor tools
│   └── package.json
└── apps/mcp/         # Cloudflare Workers application
    ├── src/
    │   ├── index.ts  # Worker entry point
    │   ├── mcp.ts    # MCP server implementation
    │   └── auth.tsx  # OAuth handler
    └── wrangler.toml
```

#### packages/mcp

The core MCP implementation provides:
- **Intelligent query assistance** with 140+ APL examples
- **Smart data processing** with adaptive formatting
- **Built-in best practices** for observability workflows
- **Platform-agnostic** design for any JavaScript environment

#### apps/mcp

The Cloudflare Workers application handles:
- **OAuth orchestration** (dual-role implementation)
- **State management** via Durable Objects

- **Edge deployment** for global low-latency access

## Deployment & Development

For detailed setup, deployment, and development instructions, see the [apps/mcp README](apps/mcp/README.md). This includes:

- Local development setup with prerequisites and configuration
- Production deployment to Cloudflare Workers

- Testing with MCP Inspector
- Debugging tips and troubleshooting

## Design Philosophy

Unlike basic MCP servers that merely wrap APIs, the Axiom implementation provides:

- **Intelligent Query Assistance**: 140+ APL query examples embedded in tool descriptions
- **Guided Workflows**: Pre-built protocols for incident investigation and performance analysis
- **Smart Formatting**: Adaptive result presentation based on data characteristics
- **Statistical Analysis**: Built-in anomaly detection using z-scores
- **Domain Expertise**: Encodes observability best practices directly in tool behavior
- **Error Prevention**: Validates inputs and guides users away from common mistakes
- **Token Usage Optimization**: Minimizes AI token consumption through:
  - CSV formatting for tabular data instead of verbose JSON
  - Automatic `maxBinAutoGroups` for time-series aggregations
  - Intelligent result shaping that prioritizes important fields
  - Adaptive truncation based on data volume

## Troubleshooting

### Connection Issues

Remote MCP connections are still early. If you experience issues:
1. Try restarting your client
2. Disable and re-enable the Axiom MCP server
3. Check your authentication credentials
4. Verify network connectivity to `https://mcp.axiom.co`
5. Try the test environment at `https://mcp.axiomtestlabs.co` if experiencing production issues

### Authentication Errors

- **OAuth**: Ensure you're logged into Axiom in your browser
- **Personal Token**: Verify your token starts with `xapt-` and hasn't expired
- **Organization ID**: Must match the organization that issued the token

## Support

- [Documentation](https://axiom.co/docs)
- [GitHub Issues](https://github.com/axiomhq/mcp/issues)
- [Community Discord](https://axiom.co/discord)

## License

MIT License - see [LICENSE](LICENSE) file for details.
