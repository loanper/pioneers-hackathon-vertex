/**
 * Tests for IAM service types and utilities
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  formatIamPolicy,
  getDeploymentPermissionSet,
  getAllDeploymentPermissionSets,
  DEPLOYMENT_PERMISSION_SETS
} from '../../../../src/services/iam/types.js';
import { createMockIamPolicy } from '../../../utils/test-helpers.js';

describe('IAM Types and Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatIamPolicy', () => {
    it('should format IAM policy correctly', () => {
      const mockPolicy = createMockIamPolicy();
      const formatted = formatIamPolicy(mockPolicy);
      
      expect(formatted).toContain('## IAM Policy');
      expect(formatted).toContain('**Policy Bindings:**');
      expect(formatted).toContain('roles/owner');
      expect(formatted).toContain('roles/viewer');
      expect(formatted).toContain('user:test@example.com');
    });

    it('should handle empty policy', () => {
      const emptyPolicy = { bindings: [], etag: 'empty', version: 1 };
      const formatted = formatIamPolicy(emptyPolicy);
      
      expect(formatted).toContain('## IAM Policy');
      expect(formatted).not.toContain('**Policy Bindings:**');
    });

    it('should handle policy without bindings', () => {
      const policyWithoutBindings = { etag: 'test', version: 1 };
      const formatted = formatIamPolicy(policyWithoutBindings);
      
      expect(formatted).toContain('## IAM Policy');
      expect(formatted).not.toContain('**Policy Bindings:**');
    });
  });

  describe('Deployment Permission Sets', () => {
    it('should have predefined deployment permission sets', () => {
      expect(DEPLOYMENT_PERMISSION_SETS).toBeDefined();
      expect(Object.keys(DEPLOYMENT_PERMISSION_SETS).length).toBeGreaterThan(0);
    });

    it('should get deployment permission set by service name', () => {
      const cloudRunPermissions = getDeploymentPermissionSet('cloud-run');
      
      expect(cloudRunPermissions).toBeDefined();
      expect(cloudRunPermissions?.service).toBe('Cloud Run');
      expect(cloudRunPermissions?.requiredPermissions).toContain('run.services.create');
    });

    it('should return null for unknown service', () => {
      const unknownPermissions = getDeploymentPermissionSet('unknown-service');
      expect(unknownPermissions).toBeNull();
    });

    it('should get all deployment permission sets', () => {
      const allSets = getAllDeploymentPermissionSets();
      
      expect(Array.isArray(allSets)).toBe(true);
      expect(allSets.length).toBeGreaterThan(0);
      expect(allSets[0]).toHaveProperty('service');
      expect(allSets[0]).toHaveProperty('requiredPermissions');
    });

    it('should validate Cloud Run permission set structure', () => {
      const cloudRun = DEPLOYMENT_PERMISSION_SETS['cloud-run'];
      
      expect(cloudRun.service).toBe('Cloud Run');
      expect(cloudRun.description).toBeDefined();
      expect(Array.isArray(cloudRun.requiredPermissions)).toBe(true);
      expect(Array.isArray(cloudRun.optionalPermissions)).toBe(true);
      expect(Array.isArray(cloudRun.commonResources)).toBe(true);
      expect(cloudRun.requiredPermissions).toContain('run.services.create');
    });

    it('should validate GKE permission set structure', () => {
      const gke = DEPLOYMENT_PERMISSION_SETS['gke'];
      
      expect(gke.service).toBe('Google Kubernetes Engine');
      expect(gke.requiredPermissions).toContain('container.clusters.create');
      expect(gke.requiredPermissions).toContain('iam.serviceAccounts.actAs');
    });

    it('should validate all permission sets have required fields', () => {
      Object.values(DEPLOYMENT_PERMISSION_SETS).forEach(permissionSet => {
        expect(permissionSet.service).toBeDefined();
        expect(permissionSet.description).toBeDefined();
        expect(Array.isArray(permissionSet.requiredPermissions)).toBe(true);
        expect(permissionSet.requiredPermissions.length).toBeGreaterThan(0);
        expect(Array.isArray(permissionSet.commonResources)).toBe(true);
      });
    });
  });
});