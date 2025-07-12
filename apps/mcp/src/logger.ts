import type { Logger } from '@axiom/mcp';

/**
 * Console-based logger implementation for the MCP app.
 * Outputs log messages to the console with timestamps and log levels.
 */
export class ConsoleLogger implements Logger {
  private readonly prefix: string;

  constructor(prefix = 'MCP') {
    this.prefix = prefix;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${this.prefix}] [${level}] ${message}`;
  }

  private formatArgs(args: unknown[]): string {
    if (args.length === 0) {
      return '';
    }

    return (
      ' ' +
      args
        .map((arg) => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' ')
    );
  }

  debug(message: string, ...args: unknown[]): void {
    const formattedMessage =
      this.formatMessage('DEBUG', message) + this.formatArgs(args);
    // biome-ignore lint/suspicious/noConsole: this is a console logger
    console.debug(formattedMessage);
  }

  info(message: string, ...args: unknown[]): void {
    const formattedMessage =
      this.formatMessage('INFO', message) + this.formatArgs(args);
    // biome-ignore lint/suspicious/noConsole: this is a console logger
    console.info(formattedMessage);
  }

  warn(message: string, ...args: unknown[]): void {
    const formattedMessage =
      this.formatMessage('WARN', message) + this.formatArgs(args);
    // biome-ignore lint/suspicious/noConsole: this is a console logger
    console.warn(formattedMessage);
  }

  error(message: string, ...args: unknown[]): void {
    const formattedMessage =
      this.formatMessage('ERROR', message) + this.formatArgs(args);
    // biome-ignore lint/suspicious/noConsole: this is a console logger
    console.error(formattedMessage);
  }
}

/**
 * Default logger instance for the MCP app
 */
export const logger = new ConsoleLogger();
