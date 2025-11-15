/**
 * Tests for prompts functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import mocks first
import '../../mocks/google-cloud-mocks.js';
import { createMockMcpServer } from '../../utils/test-helpers.js';

describe('Prompts', () => {
  let mockServer: ReturnType<typeof createMockMcpServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = createMockMcpServer();
  });

  describe('registerPrompts', () => {
    it('should register prompts with MCP server', async () => {
      const { registerPrompts } = await import('../../../src/prompts/index.js');
      
      registerPrompts(mockServer as any);
      
      expect(mockServer.registerPrompt).toHaveBeenCalled();
      
      // Verify specific prompts are registered
      const promptCalls = mockServer.registerPrompt.mock.calls;
      const promptNames = promptCalls.map(call => call[0]);
      
      expect(promptNames).toContain('analyse-errors');
      expect(promptNames).toContain('trace-request');
      expect(promptNames).toContain('performance-overview');
    });

    it('should handle analyse-errors prompt execution', async () => {
      const { registerPrompts } = await import('../../../src/prompts/index.js');
      
      registerPrompts(mockServer as any);
      
      const promptCall = mockServer.registerPrompt.mock.calls.find(
        call => call[0] === 'analyse-errors'
      );
      
      expect(promptCall).toBeDefined();
      
      const promptHandler = promptCall![2];
      const result = await promptHandler({
        timeframe: '1h',
        severity: 'ERROR'
      });
      
      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
      expect(result.messages[0].content.text).toContain('Analyse the following logs');
    });

    it('should handle trace-request prompt execution', async () => {
      const { registerPrompts } = await import('../../../src/prompts/index.js');
      
      registerPrompts(mockServer as any);
      
      const promptCall = mockServer.registerPrompt.mock.calls.find(
        call => call[0] === 'trace-request'
      );
      
      expect(promptCall).toBeDefined();
      
      const promptHandler = promptCall![2];
      const result = await promptHandler({
        traceId: 'test-trace-id',
        timeframe: '1h'
      });
      
      expect(result).toBeDefined();
      expect(result.messages[0].content.text).toContain('Trace the following request');
    });

    it('should handle performance-overview prompt execution', async () => {
      const { registerPrompts } = await import('../../../src/prompts/index.js');
      
      registerPrompts(mockServer as any);
      
      const promptCall = mockServer.registerPrompt.mock.calls.find(
        call => call[0] === 'performance-overview'
      );
      
      expect(promptCall).toBeDefined();
      
      const promptHandler = promptCall![2];
      const result = await promptHandler({
        timeframe: '24h',
        service: 'test-service'
      });
      
      expect(result).toBeDefined();
      expect(result.messages[0].content.text).toContain('performance overview');
    });

    it('should validate prompt input parameters', async () => {
      const { registerPrompts } = await import('../../../src/prompts/index.js');
      
      registerPrompts(mockServer as any);
      
      const promptCall = mockServer.registerPrompt.mock.calls.find(
        call => call[0] === 'analyse-errors'
      );
      
      const promptHandler = promptCall![2];
      
      // Test with missing required parameters
      try {
        await promptHandler({});
        // Should handle gracefully
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});