/**
 * Tests for configuration utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Configuration Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.TEST_CONFIG_VALUE;
    delete process.env.GOOGLE_CLOUD_PROJECT;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ConfigManager', () => {
    it('should create config manager instance', async () => {
      const { ConfigManager } = await import('../../../src/utils/config.js');
      
      const configManager = new ConfigManager();
      expect(configManager).toBeDefined();
      expect(typeof configManager.getDefaultProjectId).toBe('function');
      expect(typeof configManager.setDefaultProjectId).toBe('function');
    });

    it('should handle project ID configuration', async () => {
      const { ConfigManager } = await import('../../../src/utils/config.js');
      
      const configManager = new ConfigManager();
      
      await configManager.setDefaultProjectId('test-project-config');
      const projectId = configManager.getDefaultProjectId();
      expect(projectId).toBe('test-project-config');
    });

    it('should manage recent project IDs', async () => {
      const { ConfigManager } = await import('../../../src/utils/config.js');
      
      const configManager = new ConfigManager();
      
      await configManager.addToRecentProjects('project-1');
      await configManager.addToRecentProjects('project-2');
      
      const recentProjects = configManager.getRecentProjectIds();
      expect(recentProjects).toContain('project-1');
      expect(recentProjects).toContain('project-2');
      // Should be in reverse order (newest first)
      expect(recentProjects[0]).toBe('project-2');
    });
  });

  describe('configuration instance', () => {
    it('should handle config persistence', async () => {
      const { ConfigManager } = await import('../../../src/utils/config.js');
      
      const configManager = new ConfigManager();
      
      // Test basic functionality
      expect(() => configManager.getDefaultProjectId()).not.toThrow();
      expect(async () => await configManager.setDefaultProjectId('test')).not.toThrow();
    });
  });
});