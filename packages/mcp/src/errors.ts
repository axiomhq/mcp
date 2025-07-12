import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// Simple ApiError class for error handling
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const ErrDatasetEmpty = newToolError(
  'Dataset is empty. Use the listdatasets() tool to list available datasets.'
);
export const ErrDatasetNotFound = newToolError(
  'Dataset not found. Use the listdatasets() tool to list available datasets.'
);

/**
 * Creates an error result for MCP tool responses.
 *
 * @param message - The error message to return
 * @returns A CallToolResult with error flag set to true
 *
 * @example
 * ```ts
 * if (!dataset) {
 *   return newToolError('Dataset not found');
 * }
 * ```
 */
export function newToolError(message: string): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
    isError: true,
  };
}

/**
 * Creates an error result with detailed error information.
 * Handles different error types including ApiError and generic Error objects.
 *
 * @param prefix - A descriptive prefix for the error message
 * @param error - The error object to extract details from
 * @returns A CallToolResult with formatted error message
 *
 * @example
 * ```ts
 * try {
 *   await apiCall();
 * } catch (error) {
 *   return newToolErrorWithReason('Failed to fetch data', error);
 * }
 * ```
 */
export function newToolErrorWithReason(
  prefix: string,
  error: unknown
): CallToolResult {
  let message: string;

  if (error instanceof ApiError) {
    message = `${prefix}: ${error.message} (status: ${error.status})`;
  } else if (error instanceof Error) {
    message = `${prefix}: ${error.message}`;
  } else {
    message = `${prefix}: ${String(error)}`;
  }

  return newToolError(message);
}
