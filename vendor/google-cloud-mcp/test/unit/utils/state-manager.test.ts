/**
 * Tests for state manager utilities
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('State Manager', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset any environment variables
    delete process.env.GOOGLE_CLOUD_PROJECT;
    
    // Clear the singleton state by setting a clean project ID
    const { stateManager } = await import('../../../src/utils/state-manager.js');
    await stateManager.setCurrentProjectId('test-project-env'); // Reset to known state
  });

  describe('stateManager', () => {
    it('should initialize state manager correctly', async () => {
      const { stateManager } = await import('../../../src/utils/state-manager.js');
      
      expect(stateManager).toBeDefined();
      expect(typeof stateManager.getCurrentProjectId).toBe('function');
      expect(typeof stateManager.setCurrentProjectId).toBe('function');
    });

    it('should get and set project ID', async () => {
      const { stateManager } = await import('../../../src/utils/state-manager.js');
      
      const testProjectId = 'test-state-project-unique';
      await stateManager.setCurrentProjectId(testProjectId);
      
      const retrievedProjectId = stateManager.getCurrentProjectId();
      expect(retrievedProjectId).toBe(testProjectId);
    });

    it('should handle empty project ID', async () => {
      const { stateManager } = await import('../../../src/utils/state-manager.js');
      
      // Empty project ID should throw an error
      try {
        await stateManager.setCurrentProjectId('');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should store and retrieve project ID correctly', async () => {
      const { stateManager } = await import('../../../src/utils/state-manager.js');
      
      const projectId = 'state-test-project-specific';
      await stateManager.setCurrentProjectId(projectId);
      
      const retrievedProjectId = stateManager.getCurrentProjectId();
      expect(retrievedProjectId).toBe(projectId);
      
      // Also check that environment variable is set
      expect(process.env.GOOGLE_CLOUD_PROJECT).toBe(projectId);
    });

    it('should track auth initialization state', async () => {
      const { stateManager } = await import('../../../src/utils/state-manager.js');
      
      expect(stateManager.isAuthInitialized()).toBeDefined();
      
      stateManager.setAuthInitialized(true);
      expect(stateManager.isAuthInitialized()).toBe(true);
      
      stateManager.setAuthInitialized(false);
      expect(stateManager.isAuthInitialized()).toBe(false);
    });
  });
});