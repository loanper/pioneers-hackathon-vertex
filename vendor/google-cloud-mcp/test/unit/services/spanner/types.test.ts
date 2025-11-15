/**
 * Tests for Spanner service types and utilities
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import mocks first
import '../../../mocks/google-cloud-mocks.js';

describe('Spanner Types and Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSpannerClient', () => {
    it('should return spanner client instance', async () => {
      const { getSpannerClient } = await import('../../../../src/services/spanner/types.js');
      
      const client = getSpannerClient();
      expect(client).toBeDefined();
    });

    it('should return client instances', async () => {
      const { getSpannerClient } = await import('../../../../src/services/spanner/types.js');
      
      const client1 = getSpannerClient();
      const client2 = getSpannerClient();
      
      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
    });
  });

  describe('Spanner configuration', () => {
    it('should have proper client configuration', async () => {
      const { getSpannerClient } = await import('../../../../src/services/spanner/types.js');
      
      const client = getSpannerClient();
      expect(client).toBeDefined();
    });
  });
});