import type { FC } from 'hono/jsx';
import { LandingPage } from './ui';
import { metadata } from './metadata';

/**
 * Handler for serving the landing page
 * Returns an HTML response with the MCP server documentation and installation instructions
 */
export function serveLandingPage(request: Request): Response {
  const url = new URL(request.url);

  // Render the landing page with metadata
  const html = (
    <LandingPage
      tools={metadata.tools}
      prompts={metadata.prompts}
      serverUrl={url.origin}
    />
  );

  // Convert JSX to string and return as HTML response
  return new Response(html.toString(), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}
