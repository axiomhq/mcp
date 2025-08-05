# Axiom MCP Header Authentication Example

This example demonstrates how to connect to the Axiom MCP server using header-based authentication (API token) instead of the OAuth flow. This is ideal for headless clients, CI/CD pipelines, and programmatic access.

## Prerequisites

1. An Axiom API token (starts with `xapt-`)
2. (Optional) Your Axiom organization ID
3. The MCP server running (locally or deployed)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set your environment variables:
```bash
export AXIOM_API_TOKEN="xapt-your-actual-token-here"
export AXIOM_ORG_ID="your-org-id"  # Optional
export MCP_SERVER_URL="http://localhost:8788"  # Or your deployed URL
```

## Running the Example

```bash
# With environment variables
node index.js

# Or inline
AXIOM_API_TOKEN=xapt-abc123 node index.js

# With all options
AXIOM_API_TOKEN=xapt-abc123 AXIOM_ORG_ID=my-org MCP_SERVER_URL=https://mcp.axiom.co node index.js
```

## What This Example Does

1. **Connects to the MCP server** using header authentication
2. **Lists available tools** that your token has access to
3. **Demonstrates listing datasets** using the `listDatasets` tool
4. **Shows how to make queries** (commented out by default)
5. **Keeps the connection alive** for interactive testing

## Authentication Flow

Unlike the OAuth flow which requires user interaction through a browser, header authentication:

1. Sends your API token in the `Authorization: Bearer <token>` header
2. Optionally includes your org ID in the `x-axiom-org-id` header
3. The server validates the token and creates a session
4. All subsequent MCP operations use this authenticated session

## Example Output

```
🚀 Axiom MCP Header Auth Example

📋 Configuration:
   Server URL: http://localhost:8788
   API Token: xapt-abc12...
   Org ID: my-org

🔌 Connecting to MCP server...
✅ Connected successfully!

📡 Server Information:
   Name: Axiom MCP Server
   Version: 0.1.3

🛠️  Available Tools:
   - listDatasets: List all available datasets
   - getDatasetFields: Get schema for a dataset
   - queryDataset: Query datasets using APL
   ...

📊 Listing datasets...
Datasets: [
  {
    "name": "logs",
    "description": "Application logs"
  },
  ...
]

🎯 Client connected. Press Ctrl+C to exit.
```

## Troubleshooting

### Invalid Token Error
```
❌ Error: Invalid token or insufficient permissions
```
- Ensure your API token is valid and starts with `xapt-`
- Check that the token has the necessary permissions

### Connection Failed
```
❌ Error: fetch failed
```
- Verify the MCP server is running
- Check the server URL is correct
- Ensure no firewall/proxy is blocking the connection

### No Tools Available
If you see "No tools available", your token might not have sufficient permissions or there might be no integrations configured for your organization.

## Advanced Usage

### Custom Tool Calls

You can call any available tool by modifying the example:

```javascript
// Query OpenTelemetry data
const result = await client.callTool({
  name: 'otel-listServices',
  arguments: {
    datasetName: 'otel-traces',
    startTime: 'now-1h',
    endTime: 'now'
  }
});

// Get monitor status
const monitors = await client.callTool({
  name: 'checkMonitors',
  arguments: {}
});
```

### Error Handling

The example includes basic error handling, but in production you should handle:
- Token expiration
- Network failures
- Rate limiting
- Permission errors

## Security Notes

- Never commit your API token to version control
- Use environment variables or secure secret management
- Rotate tokens regularly
- Use the minimal permissions necessary for your use case