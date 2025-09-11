import type { FC } from 'hono/jsx';
import { H1, H2, H3, Link, Text } from '../base';
import { LandingLayout } from './landing-layout';

interface ToolMetadata {
  name: string;
  description: string;
  category: string;
}

interface PromptMetadata {
  name: string;
  description: string;
  category: string;
}

interface LandingPageProps {
  tools?: ToolMetadata[];
  prompts?: PromptMetadata[];
  serverUrl?: string;
  showInstallation?: boolean;
  showTools?: boolean;
  showPrompts?: boolean;
}

const CodeBlock: FC<{ children: string; language?: string }> = ({
  children,
}) => {
  const id = `code-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-gray-100 text-sm dark:bg-gray-950">
        <code id={id}>{children}</code>
      </pre>
      <button
        className="absolute top-2 right-2 rounded bg-gray-800 px-2 py-1 text-gray-300 text-xs transition-colors hover:bg-gray-700 hover:text-white"
        onclick={`
          const el = document.getElementById('${id}');
          const text = el.textContent || '';
          navigator.clipboard.writeText(text).then(() => {
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            btn.classList.add('text-green-400');
            setTimeout(() => {
              btn.textContent = originalText;
              btn.classList.remove('text-green-400');
            }, 2000);
          });
        `}
        type="button"
      >
        Copy
      </button>
    </div>
  );
};

// biome-ignore lint: _
const TabButton: FC<{ active: boolean; onclick: string; children: any }> = ({
  active,
  onclick,
  children,
}) => (
  <button
    className={`px-4 py-2 font-medium text-sm transition-colors ${
      active
        ? 'border-gray-900 border-b-2 text-gray-900 dark:border-gray-100 dark:text-gray-100'
        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
    }`}
    onclick={onclick}
    type="button"
  >
    {children}
  </button>
);

export const LandingPage: FC<LandingPageProps> = ({
  tools = [],
  prompts = [],
  serverUrl = 'https://mcp.axiom.co',
  showInstallation = false,
  showTools = false,
  showPrompts = false,
}) => {
  // Group tools by category
  const toolsByCategory = tools.reduce(
    (acc, tool) => {
      if (!acc[tool.category]) {
        acc[tool.category] = [];
      }
      acc[tool.category].push(tool);
      return acc;
    },
    {} as Record<string, ToolMetadata[]>
  );

  // Group prompts by category
  const promptsByCategory = prompts.reduce(
    (acc, prompt) => {
      if (!acc[prompt.category]) {
        acc[prompt.category] = [];
      }
      acc[prompt.category].push(prompt);
      return acc;
    },
    {} as Record<string, PromptMetadata[]>
  );

  const claudeConfig = `{
  "mcpServers": {
    "axiom": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${serverUrl}/mcp"]
    }
  }
}`;

  const cursorConfig = `{
  "mcpServers": {
    "axiom": {
      "url": "${serverUrl}/mcp"
    }
  }
}`;

  return (
    <LandingLayout title="Axiom MCP Server">
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="rounded-lg bg-white p-8 text-center shadow-sm md:p-12 dark:bg-gray-900">
          <div className="mb-4 flex justify-center">
            <svg
              aria-label="Axiom logomark"
              className="mx-auto"
              fill="none"
              height="64"
              role="img"
              viewBox="0 0 32 32"
              width="64"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clip-path="url(#clip0_366_3390)">
                <path
                  className="fill-gray-900 dark:fill-gray-100"
                  d="M26.8391 20.2575L22.1395 12.4016C21.9241 12.0406 21.3931 11.7452 20.9595 11.7452H18.0255C17.3436 11.7452 17.064 11.2811 17.4042 10.7139L19.0131 8.03132C19.1408 7.81839 19.1406 7.55632 19.0124 7.34365C18.8842 7.13099 18.6477 7 18.3917 7H14.2988C13.8652 7 13.333 7.29476 13.1161 7.65498L5.1628 20.8625C4.94587 21.2227 4.94571 21.8123 5.16248 22.1726L7.20891 25.5745C7.54988 26.1413 8.10908 26.1419 8.45149 25.576L10.0506 22.9331C10.393 22.3671 10.9522 22.3678 11.2932 22.9346L12.7429 25.3444C12.9596 25.7048 13.4917 25.9995 13.9252 25.9995H23.3832C23.8167 25.9995 24.3488 25.7048 24.5656 25.3444L26.8367 21.5692C27.0535 21.2088 27.0545 20.6186 26.8391 20.2575ZM20.4924 19.8794C20.8312 20.4474 20.5505 20.9121 19.8685 20.9121H12.5119C11.8299 20.9121 11.5509 20.4483 11.8919 19.8815L15.5732 13.7623C15.9141 13.1955 16.4721 13.1955 16.813 13.7624L20.4924 19.8794Z"
                />
              </g>
              <defs>
                <clipPath id="clip0_366_3390">
                  <rect
                    fill="white"
                    height="19"
                    transform="translate(5 7)"
                    width="22"
                  />
                </clipPath>
              </defs>
            </svg>
          </div>
          <H1 className="mb-2">Axiom MCP Server</H1>
          <Text className="text-lg">
            Connect AI assistants to Axiom's observability platform
          </Text>
          <Text className="mt-2" variant="muted">
            Query datasets, analyze traces, monitor alerts, and explore your
            data using natural language
          </Text>
        </div>

        {/* Installation Instructions */}
        {showInstallation && (
          <div className="rounded-lg bg-white p-6 shadow-sm md:p-8 dark:bg-gray-900">
            <H2 className="mb-4">Installation</H2>

            <div className="space-y-6">
              {/* Tabs for different clients */}
              <div>
                <div className="mb-4 border-gray-200 border-b dark:border-gray-700">
                  <div className="flex space-x-4" id="client-tabs">
                    <TabButton
                      active={true}
                      onclick="
                        document.querySelectorAll('.client-content').forEach(el => el.style.display = 'none');
                        document.getElementById('claude-desktop-content').style.display = 'block';
                        document.querySelectorAll('#client-tabs button').forEach(btn => {
                          btn.classList.remove('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                          btn.classList.add('text-gray-500', 'dark:text-gray-400');
                        });
                        event.target.classList.add('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                        event.target.classList.remove('text-gray-500', 'dark:text-gray-400');
                      "
                    >
                      Claude Desktop
                    </TabButton>
                    <TabButton
                      active={false}
                      onclick="
                        document.querySelectorAll('.client-content').forEach(el => el.style.display = 'none');
                        document.getElementById('claude-ai-content').style.display = 'block';
                        document.querySelectorAll('#client-tabs button').forEach(btn => {
                          btn.classList.remove('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                          btn.classList.add('text-gray-500', 'dark:text-gray-400');
                        });
                        event.target.classList.add('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                        event.target.classList.remove('text-gray-500', 'dark:text-gray-400');
                      "
                    >
                      Claude.ai
                    </TabButton>
                    <TabButton
                      active={false}
                      onclick="
                        document.querySelectorAll('.client-content').forEach(el => el.style.display = 'none');
                        document.getElementById('cursor-content').style.display = 'block';
                        document.querySelectorAll('#client-tabs button').forEach(btn => {
                          btn.classList.remove('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                          btn.classList.add('text-gray-500', 'dark:text-gray-400');
                        });
                        event.target.classList.add('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                        event.target.classList.remove('text-gray-500', 'dark:text-gray-400');
                      "
                    >
                      Cursor
                    </TabButton>
                    <TabButton
                      active={false}
                      onclick="
                        document.querySelectorAll('.client-content').forEach(el => el.style.display = 'none');
                        document.getElementById('other-content').style.display = 'block';
                        document.querySelectorAll('#client-tabs button').forEach(btn => {
                          btn.classList.remove('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                          btn.classList.add('text-gray-500', 'dark:text-gray-400');
                        });
                        event.target.classList.add('border-b-2', 'border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
                        event.target.classList.remove('text-gray-500', 'dark:text-gray-400');
                      "
                    >
                      Other Clients
                    </TabButton>
                  </div>
                </div>

                {/* Claude Desktop Content */}
                <div
                  className="client-content space-y-4"
                  id="claude-desktop-content"
                >
                  <div>
                    <H3 className="mb-2">1. Install Claude Desktop</H3>
                    <Text variant="muted">
                      Download and install{' '}
                      <Link
                        href="https://claude.ai/download"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Claude Desktop
                      </Link>{' '}
                      (version 0.7.0 or later) for your platform.
                    </Text>
                  </div>

                  <div>
                    <H3 className="mb-2">2. Add Axiom MCP Server</H3>
                    <Text className="mb-2" variant="muted">
                      Open Claude Desktop and navigate to:
                    </Text>
                    <Text className="mb-2 text-sm" variant="muted">
                      <strong>Settings → Developer → MCP Servers</strong>
                    </Text>
                    <Text className="mb-3" variant="muted">
                      Click "Add Server" and enter:
                    </Text>
                    <div className="mb-3 space-y-2">
                      <Text className="text-sm" variant="muted">
                        <strong>Name:</strong>{' '}
                        <code className="rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-800">
                          Axiom
                        </code>
                      </Text>
                      <Text className="text-sm" variant="muted">
                        <strong>URL:</strong>{' '}
                        <code className="rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-800">
                          {serverUrl}/mcp
                        </code>
                      </Text>
                    </div>

                    <details className="mt-4">
                      <summary className="cursor-pointer text-gray-600 text-sm hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                        Manual configuration (advanced users)
                      </summary>
                      <div className="mt-3 space-y-2">
                        <Text className="text-sm" variant="muted">
                          Edit your Claude Desktop configuration file:
                        </Text>
                        <Text className="text-xs" variant="muted">
                          • macOS:{' '}
                          <code className="rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-800">
                            ~/Library/Application
                            Support/Claude/claude_desktop_config.json
                          </code>
                        </Text>
                        <Text className="mb-3 text-xs" variant="muted">
                          • Windows:{' '}
                          <code className="rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-800">
                            %APPDATA%\Claude\claude_desktop_config.json
                          </code>
                        </Text>
                        <CodeBlock>{claudeConfig}</CodeBlock>
                      </div>
                    </details>
                  </div>

                  <div>
                    <H3 className="mb-2">3. Connect and Authenticate</H3>
                    <Text variant="muted">
                      Click "Connect" to activate the server (or restart Claude
                      Desktop if you used manual configuration). You'll be
                      prompted to authenticate with Axiom on first use.
                    </Text>
                  </div>
                </div>

                {/* Claude.ai Content */}
                <div
                  className="client-content space-y-4"
                  id="claude-ai-content"
                  style="display: none;"
                >
                  <div>
                    <H3 className="mb-2">1. Access Claude.ai</H3>
                    <Text variant="muted">
                      Navigate to{' '}
                      <Link
                        href="https://claude.ai"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        claude.ai
                      </Link>{' '}
                      and sign in to your account.
                    </Text>
                  </div>

                  <div>
                    <H3 className="mb-2">2. Enable MCP Features</H3>
                    <Text className="mb-2" variant="muted">
                      Ensure you have MCP features enabled in your Claude.ai
                      account (available for Pro users).
                    </Text>
                  </div>

                  <div>
                    <H3 className="mb-2">3. Add MCP Server</H3>
                    <Text className="mb-2" variant="muted">
                      Click on your profile icon and navigate to:
                    </Text>
                    <Text className="mb-2 text-sm" variant="muted">
                      <strong>Settings → Connected Apps</strong>
                    </Text>
                    <Text className="mb-3" variant="muted">
                      Click "Connect New App" and add the Axiom MCP server:
                    </Text>
                    <div className="mb-3 space-y-2">
                      <Text className="text-sm" variant="muted">
                        <strong>Server URL:</strong>{' '}
                        <code className="rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-800">
                          {serverUrl}/mcp
                        </code>
                      </Text>
                    </div>
                  </div>

                  <div>
                    <H3 className="mb-2">4. Authenticate</H3>
                    <Text variant="muted">
                      Complete the OAuth flow to authenticate with Axiom. The
                      server will then be available in your Claude
                      conversations.
                    </Text>
                  </div>
                </div>

                {/* Cursor Content */}
                <div
                  className="client-content space-y-4"
                  id="cursor-content"
                  style="display: none;"
                >
                  <div>
                    <H3 className="mb-2">1. Install Cursor</H3>
                    <Text variant="muted">
                      Download and install{' '}
                      <Link
                        href="https://cursor.sh"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Cursor
                      </Link>{' '}
                      for your platform.
                    </Text>
                  </div>

                  <div>
                    <H3 className="mb-2">2. Configure MCP Server</H3>
                    <Text className="mb-2" variant="muted">
                      Add the Axiom MCP server to your Cursor settings:
                    </Text>
                    <CodeBlock>{cursorConfig}</CodeBlock>
                  </div>

                  <div>
                    <H3 className="mb-2">3. Restart Cursor</H3>
                    <Text variant="muted">
                      Restart Cursor to load the Axiom MCP server. You'll be
                      prompted to authenticate with Axiom on first use.
                    </Text>
                  </div>
                </div>

                {/* Other Clients Content */}
                <div
                  className="client-content space-y-4"
                  id="other-content"
                  style="display: none;"
                >
                  <div>
                    <H3 className="mb-2">MCP Server URLs</H3>
                    <Text className="mb-2" variant="muted">
                      The Axiom MCP server supports two endpoints:
                    </Text>
                    <div className="space-y-3">
                      <div>
                        <Text
                          className="mb-1 font-semibold text-sm"
                          variant="muted"
                        >
                          Standard MCP Protocol (recommended):
                        </Text>
                        <CodeBlock>{`${serverUrl}/mcp`}</CodeBlock>
                        <Text className="mt-1 text-xs" variant="muted">
                          Use this for Claude Desktop 0.7.0+, Claude.ai, and
                          other modern MCP clients
                        </Text>
                      </div>
                      <div>
                        <Text
                          className="mb-1 font-semibold text-sm"
                          variant="muted"
                        >
                          SSE Protocol (legacy):
                        </Text>
                        <CodeBlock>{`${serverUrl}/sse`}</CodeBlock>
                        <Text className="mt-1 text-xs" variant="muted">
                          Use this for older MCP clients or those that require
                          Server-Sent Events
                        </Text>
                      </div>
                    </div>
                  </div>

                  <div>
                    <H3 className="mb-2">Authentication</H3>
                    <Text variant="muted">
                      The server uses OAuth 2.0 for authentication. Your client
                      will be redirected to Axiom for authorization on first
                      connection.
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Available Tools */}
        {showTools && tools.length > 0 && (
          <div className="rounded-lg bg-white p-6 shadow-sm md:p-8 dark:bg-gray-900">
            <H2 className="mb-4">Available Tools</H2>
            <Text className="mb-4" variant="muted">
              These tools are available to query and interact with your Axiom
              data:
            </Text>

            <div className="space-y-8">
              {Object.entries(toolsByCategory).map(
                ([category, categoryTools]) => (
                  <div key={category}>
                    <H3 className="mb-4 font-semibold text-lg">{category}</H3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {categoryTools.map((tool) => (
                        <div
                          className="border-gray-200 border-l-2 py-2 pl-4 dark:border-gray-700"
                          key={tool.name}
                        >
                          <div className="mb-1 font-mono font-semibold text-gray-900 text-sm dark:text-gray-100">
                            {tool.name}
                          </div>
                          <Text
                            className="text-xs leading-relaxed"
                            variant="muted"
                          >
                            {tool.description}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Available Prompts */}
        {showPrompts && prompts.length > 0 && (
          <div className="rounded-lg bg-white p-6 shadow-sm md:p-8 dark:bg-gray-900">
            <H2 className="mb-4">Available Prompts</H2>
            <Text className="mb-4" variant="muted">
              Pre-configured prompts to help you get started:
            </Text>

            <div className="space-y-8">
              {Object.entries(promptsByCategory).map(
                ([category, categoryPrompts]) => (
                  <div key={category}>
                    <H3 className="mb-4 font-semibold text-lg">{category}</H3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {categoryPrompts.map((prompt) => (
                        <div
                          className="border-gray-200 border-l-2 py-2 pl-4 dark:border-gray-700"
                          key={prompt.name}
                        >
                          <div className="mb-1 font-mono font-semibold text-gray-900 text-sm dark:text-gray-100">
                            {prompt.name}
                          </div>
                          <Text
                            className="text-xs leading-relaxed"
                            variant="muted"
                          >
                            {prompt.description}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Documentation Links */}
        <div className="rounded-lg bg-white p-6 shadow-sm md:p-8 dark:bg-gray-900">
          <H2 className="mb-4">Get Started</H2>
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800"
              href="https://axiom.co/docs/llms/mcp-server#axiom-mcp-server"
              rel="noopener noreferrer"
              target="_blank"
            >
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                Axiom Documentation
              </div>
              <Text className="mt-1 text-xs" variant="muted">
                Learn how to configure your client to interact with the Axiom
                MCP server
              </Text>
            </Link>
            <Link
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800"
              href="https://modelcontextprotocol.io"
              rel="noopener noreferrer"
              target="_blank"
            >
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                MCP Documentation
              </div>
              <Text className="mt-1 text-xs" variant="muted">
                Learn about the Model Context Protocol
              </Text>
            </Link>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
};
