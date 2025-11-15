/**
 * Tests for Trace service types and utilities
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import mocks first
import '../../../mocks/google-cloud-mocks.js';

describe('Trace Types and Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatTraceData', () => {
    it('should format trace data correctly', async () => {
      const { formatTraceData } = await import('../../../../src/services/trace/types.js');
      
      const mockTraceData = {
        traceId: 'trace-123',
        projectId: 'test-project',
        rootSpans: [{
          spanId: 'span-456',
          displayName: 'test-operation',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 1000).toISOString(),
          kind: 'INTERNAL',
          status: 'OK' as any,
          attributes: {
            'http.method': 'GET',
            'http.url': 'https://example.com/api'
          },
          childSpans: []
        }],
        allSpans: [{
          spanId: 'span-456',
          displayName: 'test-operation',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 1000).toISOString(),
          kind: 'INTERNAL',
          status: 'OK' as any,
          attributes: {
            'http.method': 'GET',
            'http.url': 'https://example.com/api'
          },
          childSpans: []
        }]
      };
      
      const formatted = formatTraceData(mockTraceData);
      
      expect(formatted).toContain('Trace Details');
      expect(formatted).toContain('trace-123');
      expect(formatted).toContain('test-operation');
      expect(formatted).toContain('GET');
    });

    it('should handle empty trace data', async () => {
      const { formatTraceData } = await import('../../../../src/services/trace/types.js');
      
      const emptyTraceData = {
        traceId: 'empty-trace',
        projectId: 'test-project',
        rootSpans: [],
        allSpans: []
      };
      
      const formatted = formatTraceData(emptyTraceData);
      
      expect(formatted).toContain('empty-trace');
      expect(formatted).toContain('- **Total Spans**: 0');
    });
  });

  describe('getTraceClient', () => {
    it('should return trace client instance', async () => {
      const { getTraceClient } = await import('../../../../src/services/trace/types.js');
      
      const client = getTraceClient();
      expect(client).toBeDefined();
    });
  });

  describe('TraceData interface', () => {
    it('should handle trace data structure', async () => {
      const { formatTraceData } = await import('../../../../src/services/trace/types.js');
      
      const traceData = {
        traceId: 'test-trace',
        projectId: 'test-project',
        rootSpans: [],
        allSpans: []
      };
      
      // Should not throw when formatting valid structure
      expect(() => formatTraceData(traceData)).not.toThrow();
    });
  });
});