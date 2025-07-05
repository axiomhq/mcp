import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Type alias for MCP tool results.
 * This provides a cleaner API for tool implementations.
 */
export type ToolResult = CallToolResult;

/**
 * Creates a successful text result for MCP tool responses.
 *
 * @param result - The text content to return
 * @returns A CallToolResult with text content
 *
 * @example
 * ```ts
 * return stringResult('Operation completed successfully');
 * ```
 */
export function stringResult(result: string): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: result,
      },
    ],
  };
}

/**
 * Creates a successful JSON result for MCP tool responses.
 *
 * @param data - The data to serialize as JSON
 * @returns A CallToolResult with JSON text content
 *
 * @example
 * ```ts
 * return jsonResult({ users: ['alice', 'bob'], count: 2 });
 * ```
 */
export function jsonResult(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Creates an empty result for MCP tool responses.
 * Useful when a tool performs an action but has no meaningful output.
 *
 * @returns A CallToolResult with empty content
 *
 * @example
 * ```ts
 * await deleteFile(path);
 * return emptyResult();
 * ```
 */
export function emptyResult(): CallToolResult {
  return {
    content: [],
  };
}
