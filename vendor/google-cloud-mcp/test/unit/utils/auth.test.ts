/**
 * Tests for authentication utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import mocks first
import '../../../test/mocks/google-cloud-mocks.js';

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_CLOUD_PROJECT;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize Google Auth with lazy loading', async () => {
    process.env.LAZY_AUTH = 'true';
    
    const { initGoogleAuth } = await import('../../../src/utils/auth.js');
    const auth = await initGoogleAuth(false); // Don't require auth in test
    
    expect(auth).toBeDefined();
  });

  it('should get project ID from environment', async () => {
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project-env';
    
    const { getProjectId } = await import('../../../src/utils/auth.js');
    const projectId = await getProjectId();
    
    expect(projectId).toBe('test-project-env');
  });

  it('should get project ID from current environment or state', async () => {
    // The test environment might have a project ID set
    const { getProjectId } = await import('../../../src/utils/auth.js');
    
    const projectId = await getProjectId();
    expect(typeof projectId).toBe('string');
    expect(projectId.length).toBeGreaterThan(0);
  });

  it('should handle authentication errors', async () => {
    process.env.LAZY_AUTH = 'false';
    
    const { initGoogleAuth } = await import('../../../src/utils/auth.js');
    
    // Should not throw even if auth fails
    const auth = await initGoogleAuth(false);
    expect(auth).toBeDefined();
  });

  it('should validate authentication client', async () => {
    const { authClient } = await import('../../../src/utils/auth.js');
    
    expect(authClient).toBeDefined();
  });
});