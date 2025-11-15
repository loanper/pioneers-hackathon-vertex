/**
 * Tests for logger utility
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../../../src/utils/logger.js';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should format log messages correctly', () => {
    const testMessage = 'Test log message';
    
    // These shouldn't throw errors
    expect(() => logger.info(testMessage)).not.toThrow();
    expect(() => logger.error(testMessage)).not.toThrow();
    expect(() => logger.warn(testMessage)).not.toThrow();
    expect(() => logger.debug(testMessage)).not.toThrow();
  });

  it('should handle error objects', () => {
    const error = new Error('Test error');
    expect(() => logger.error(error)).not.toThrow();
    expect(() => logger.error('Error occurred')).not.toThrow();
  });
});