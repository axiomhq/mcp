```

                  ███╗   ███╗ ██████╗██████╗
                  ████╗ ████║██╔════╝██╔══██╗
                  ██╔████╔██║██║     ██████╔╝
                  ██║╚██╔╝██║██║     ██╔═══╝
                  ██║ ╚═╝ ██║╚██████╗██║
                  ╚═╝     ╚═╝ ╚═════╝╚═╝
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model Context Protocol Server ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Axiom, Inc.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

# axiom-mcp
The Axiom MCP Server connects AI assistants to your Axiom observability data using the Model Context Protocol (MCP). This repository contains:

- A Cloudflare Workers app that hosts the MCP server (`apps/mcp`).
- A TypeScript package with core MCP utilities and tools (`packages/mcp`).

For installation, setup, supported tools, authentication, and client-specific instructions (Claude, Cursor, VS Code, etc.), please see the official documentation:

https://axiom.co/docs/console/intelligence/mcp-server#axiom-mcp-server

Issues and contributions are welcome. See AGENTS.md for contributor guidelines.
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
4. Try clearing and re-authenticating your client

### Authentication Errors

- **OAuth**: Ensure you're logged into Axiom in your browser

OR
- **Personal Token**: Verify your token starts with `xapt-` and hasn't expired
- **Organization ID**: Must match the organization that issued the token

## Support

- [Documentation](https://axiom.co/docs)
- [GitHub Issues](https://github.com/axiomhq/mcp/issues)
- [Community Discord](https://axiom.co/discord)

## License

MIT License - see [LICENSE](LICENSE) file for details.
