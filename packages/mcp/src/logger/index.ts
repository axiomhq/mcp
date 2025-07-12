/**
 * Logger interface for the MCP package.
 * Allows consumers to provide their own logging implementation.
 */
export interface Logger {
  /**
   * Log a debug message. Usually only shown in development or when debug mode is enabled.
   */
  debug(message: string, ...args: unknown[]): void;

  /**
   * Log an informational message.
   */
  info(message: string, ...args: unknown[]): void;

  /**
   * Log a warning message.
   */
  warn(message: string, ...args: unknown[]): void;

  /**
   * Log an error message.
   */
  error(message: string, ...args: unknown[]): void;
}

/**
 * A no-op logger implementation that discards all log messages.
 * Useful for testing or when logging is not desired.
 */
export class NoopLogger implements Logger {
  debug(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  info(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  warn(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  error(_message: string, ..._args: unknown[]): void {
    // No-op
  }
}

/**
 * Default logger instance (no-op).
 * Can be overridden by consumers of the package.
 */
export const defaultLogger: Logger = new NoopLogger();
