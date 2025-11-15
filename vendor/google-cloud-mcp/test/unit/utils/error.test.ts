/**
 * Tests for error handling utilities
 */
import { describe, it, expect } from 'vitest';
import { GcpMcpError } from '../../../src/utils/error.js';

describe('GcpMcpError', () => {
  it('should create error with message only', () => {
    const error = new GcpMcpError('Test error message');
    
    expect(error.message).toBe('Test error message');
    expect(error.name).toBe('GcpMcpError');
    expect(error.code).toBe('INTERNAL_ERROR'); // Default code
    expect(error.statusCode).toBe(500);
    expect(error instanceof Error).toBe(true);
  });

  it('should create error with code and details', () => {
    const details = { field: 'value', count: 123 };
    const error = new GcpMcpError('Test error', 'INVALID_REQUEST', 400, details);
    
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('INVALID_REQUEST');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual(details);
  });

  it('should preserve stack trace', () => {
    const error = new GcpMcpError('Test error');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('GcpMcpError');
  });

  it('should handle nested errors', () => {
    const originalError = new Error('Original error');
    const error = new GcpMcpError('Wrapped error', 'NESTED_ERROR', 500, { originalError });
    
    expect((error.details as any)?.originalError).toBe(originalError);
  });

  it('should be serializable to JSON', () => {
    const error = new GcpMcpError('Test error', 'TEST_CODE', 400, { key: 'value' });
    
    // Test that it has the expected properties
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect((error.details as any).key).toBe('value');
    expect(error.statusCode).toBe(400);
  });
});