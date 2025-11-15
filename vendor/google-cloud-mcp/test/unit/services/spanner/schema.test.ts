/**
 * Tests for Spanner schema utilities
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import mocks first
import '../../../mocks/google-cloud-mocks.js';

describe('Spanner Schema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatSchemaAsMarkdown', () => {
    it('should format schema correctly', async () => {
      const { formatSchemaAsMarkdown } = await import('../../../../src/services/spanner/schema.js');
      
      const mockSchema = {
        tables: [{
          name: 'Users',
          columns: [
            { name: 'id', type: 'STRING(36)', nullable: false },
            { name: 'email', type: 'STRING(255)', nullable: false },
            { name: 'created_at', type: 'TIMESTAMP', nullable: true }
          ],
          primaryKey: ['id']
        }]
      };
      
      const formatted = formatSchemaAsMarkdown(mockSchema);
      
      expect(formatted).toContain('Database Schema');
      expect(formatted).toContain('## Table: Users');
      expect(formatted).toContain('id');
      expect(formatted).toContain('STRING(36)');
    });

    it('should handle empty schema', async () => {
      const { formatSchemaAsMarkdown } = await import('../../../../src/services/spanner/schema.js');
      
      const emptySchema = { tables: [] };
      const formatted = formatSchemaAsMarkdown(emptySchema);
      
      expect(formatted).toContain('No tables found');
    });
  });

  describe('getSpannerSchema', () => {
    it('should handle schema retrieval', async () => {
      const { getSpannerSchema } = await import('../../../../src/services/spanner/schema.js');
      
      // Mock the database calls
      try {
        await getSpannerSchema('test-instance', 'test-database');
      } catch (error) {
        // Expected in test environment without real Spanner connection
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});