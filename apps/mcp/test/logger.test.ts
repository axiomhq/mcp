import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsoleLogger } from '../src/logger';

describe('ConsoleLogger', () => {
  let logger: ConsoleLogger;
  let consoleDebugSpy: any;
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    logger = new ConsoleLogger('TEST');
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log formatting', () => {
    it('should format debug messages with timestamp and level', () => {
      logger.debug('Test debug message');

      expect(consoleDebugSpy).toHaveBeenCalledOnce();
      const message = consoleDebugSpy.mock.calls[0][0];
      expect(message).toContain('[TEST]');
      expect(message).toContain('[DEBUG]');
      expect(message).toContain('Test debug message');
    });

    it('should format info messages correctly', () => {
      logger.info('Test info message');

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const message = consoleInfoSpy.mock.calls[0][0];
      expect(message).toContain('[TEST]');
      expect(message).toContain('[INFO]');
      expect(message).toContain('Test info message');
    });

    it('should format warn messages correctly', () => {
      logger.warn('Test warning');

      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      const message = consoleWarnSpy.mock.calls[0][0];
      expect(message).toContain('[TEST]');
      expect(message).toContain('[WARN]');
      expect(message).toContain('Test warning');
    });

    it('should format error messages correctly', () => {
      logger.error('Test error');

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const message = consoleErrorSpy.mock.calls[0][0];
      expect(message).toContain('[TEST]');
      expect(message).toContain('[ERROR]');
      expect(message).toContain('Test error');
    });
  });

  describe('argument handling', () => {
    it('should stringify objects in arguments', () => {
      const testObj = { key: 'value', nested: { prop: 123 } };
      logger.info('Message with object', testObj);

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const message = consoleInfoSpy.mock.calls[0][0];
      expect(message).toContain('Message with object');
      expect(message).toContain('"key": "value"');
      expect(message).toContain('"nested"');
    });

    it('should handle multiple arguments', () => {
      logger.info('Multiple args', 'arg1', 42, { key: 'value' });

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const message = consoleInfoSpy.mock.calls[0][0];
      expect(message).toContain('Multiple args');
      expect(message).toContain('arg1');
      expect(message).toContain('42');
      expect(message).toContain('"key": "value"');
    });

    it('should handle circular references gracefully', () => {
      const circular: any = { prop: 'value' };
      circular.self = circular;

      logger.info('Circular reference', circular);

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const message = consoleInfoSpy.mock.calls[0][0];
      expect(message).toContain('Circular reference');
      expect(message).toContain('[object Object]');
    });

    it('should handle null and undefined', () => {
      logger.info('Null and undefined', null, undefined);

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const message = consoleInfoSpy.mock.calls[0][0];
      expect(message).toContain('null');
      expect(message).toContain('undefined');
    });
  });

  describe('custom prefix', () => {
    it('should use custom prefix when provided', () => {
      const customLogger = new ConsoleLogger('CUSTOM');
      customLogger.info('Test message');

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const message = consoleInfoSpy.mock.calls[0][0];
      expect(message).toContain('[CUSTOM]');
    });

    it('should use default prefix when not provided', () => {
      const defaultLogger = new ConsoleLogger();
      defaultLogger.info('Test message');

      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const message = consoleInfoSpy.mock.calls[0][0];
      expect(message).toContain('[MCP]');
    });
  });
});
