/**
 * Type definitions for Google Cloud IAM service
 */
import { ProjectsClient } from "@google-cloud/resource-manager";

/**
 * Interface for IAM Policy
 */
export interface IamPolicy {
  version?: number;
  bindings?: PolicyBinding[];
  auditConfigs?: AuditConfig[];
  etag?: string;
}

/**
 * Interface for Policy Binding
 */
export interface PolicyBinding {
  role: string;
  members: string[];
  condition?: {
    title?: string;
    description?: string;
    expression: string;
  };
}

/**
 * Interface for Audit Config
 */
export interface AuditConfig {
  service: string;
  auditLogConfigs: AuditLogConfig[];
}

/**
 * Interface for Audit Log Config
 */
export interface AuditLogConfig {
  logType: "ADMIN_READ" | "DATA_READ" | "DATA_WRITE";
  exemptedMembers?: string[];
}

/**
 * Interface for Service Account
 */
export interface ServiceAccount {
  name: string;
  projectId: string;
  uniqueId: string;
  email: string;
  displayName?: string;
  description?: string;
  oauth2ClientId?: string;
  disabled?: boolean;
  etag?: string;
}

/**
 * Interface for IAM Role
 */
export interface IamRole {
  name: string;
  title: string;
  description?: string;
  includedPermissions: string[];
  stage?: "ALPHA" | "BETA" | "GA" | "DEPRECATED";
  etag?: string;
  deleted?: boolean;
}

/**
 * Interface for IAM Permission
 */
export interface IamPermission {
  name: string;
  title?: string;
  description?: string;
  onlyInPredefinedRoles?: boolean;
  stage?: "ALPHA" | "BETA" | "GA" | "DEPRECATED";
  customRolesSupportLevel?: "NOT_SUPPORTED" | "SUPPORTED" | "TESTING";
  apiDisabled?: boolean;
}

/**
 * Interface for Policy Analysis Result
 */
export interface PolicyAnalysisResult {
  fullyExplored: boolean;
  mainAnalysis: AccessControlEntry[];
  serviceAccountImpersonationAnalysis?: AccessControlEntry[];
  nonCriticalErrors?: IamError[];
}

/**
 * Interface for Access Control Entry
 */
export interface AccessControlEntry {
  identityName: string;
  identityType: "USER" | "GROUP" | "DOMAIN" | "SERVICE_ACCOUNT";
  fullyQualifiedResourceName: string;
  permission: string;
  role?: string;
  accessType:
    | "GRANTED"
    | "NOT_GRANTED"
    | "UNKNOWN_CONDITIONAL"
    | "UNKNOWN_INFO_DENIED";
  condition?: {
    expression: string;
    title?: string;
    description?: string;
  };
}

/**
 * Interface for IAM Error
 */
export interface IamError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Interface for common GCP deployment permission sets
 */
export interface DeploymentPermissionSet {
  service: string;
  description: string;
  requiredPermissions: string[];
  optionalPermissions?: string[];
  commonResources: string[];
}

/**
 * Interface for permission test result
 */
export interface PermissionTestResult {
  resource: string;
  permission: string;
  granted: boolean;
  error?: string;
}

/**
 * Interface for service account validation result
 */
export interface ServiceAccountValidationResult {
  serviceAccount: string;
  exists: boolean;
  enabled: boolean;
  permissions: PermissionTestResult[];
  errors: string[];
}

// Singleton Resource Manager client instance for IAM operations
let resourceManagerClientInstance: ProjectsClient | null = null;

/**
 * Initialises the Google Cloud Resource Manager client for IAM operations
 *
 * @returns A configured Resource Manager client
 */
export function getResourceManagerClient(): ProjectsClient {
  if (!resourceManagerClientInstance) {
    resourceManagerClientInstance = new ProjectsClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });
  }
  return resourceManagerClientInstance;
}

/**
 * Formats an IAM policy for display
 *
 * @param policy The IAM policy to format
 * @returns A formatted string representation of the policy
 */
export function formatIamPolicy(policy: IamPolicy): string {
  let result = `## IAM Policy\n\n`;

  result += `**Version:** ${policy.version || 1}\n`;
  if (policy.etag) result += `**ETag:** ${policy.etag}\n`;

  if (policy.bindings && policy.bindings.length > 0) {
    result += `\n**Policy Bindings:**\n\n`;

    policy.bindings.forEach((binding, index) => {
      result += `### Binding ${index + 1}: ${binding.role}\n\n`;
      result += `**Members:**\n`;
      binding.members.forEach((member) => {
        result += `- ${member}\n`;
      });

      if (binding.condition) {
        result += `\n**Condition:**\n`;
        if (binding.condition.title)
          result += `- Title: ${binding.condition.title}\n`;
        if (binding.condition.description)
          result += `- Description: ${binding.condition.description}\n`;
        result += `- Expression: \`${binding.condition.expression}\`\n`;
      }
      result += "\n";
    });
  }

  if (policy.auditConfigs && policy.auditConfigs.length > 0) {
    result += `**Audit Configurations:**\n\n`;

    policy.auditConfigs.forEach((config, index) => {
      result += `### Audit Config ${index + 1}: ${config.service}\n\n`;
      config.auditLogConfigs.forEach((logConfig, logIndex) => {
        result += `**Log Config ${logIndex + 1}:**\n`;
        result += `- Log Type: ${logConfig.logType}\n`;
        if (logConfig.exemptedMembers && logConfig.exemptedMembers.length > 0) {
          result += `- Exempted Members: ${logConfig.exemptedMembers.join(", ")}\n`;
        }
        result += "\n";
      });
    });
  }

  return result;
}

/**
 * Common GCP deployment permission sets
 */
export const DEPLOYMENT_PERMISSION_SETS: Record<
  string,
  DeploymentPermissionSet
> = {
  "cloud-run": {
    service: "Cloud Run",
    description: "Deploy and manage Cloud Run services",
    requiredPermissions: [
      "run.services.create",
      "run.services.update",
      "run.services.get",
      "run.services.list",
      "run.services.delete",
      "run.revisions.get",
      "run.revisions.list",
      "iam.serviceAccounts.actAs",
    ],
    optionalPermissions: [
      "run.services.setIamPolicy",
      "run.services.getIamPolicy",
      "cloudsql.instances.connect",
      "secretmanager.versions.access",
    ],
    commonResources: [
      "projects/{project}/locations/{location}/services/{service}",
    ],
  },
  gke: {
    service: "Google Kubernetes Engine",
    description: "Deploy and manage GKE clusters and workloads",
    requiredPermissions: [
      "container.clusters.create",
      "container.clusters.update",
      "container.clusters.get",
      "container.clusters.list",
      "container.clusters.delete",
      "container.operations.get",
      "container.operations.list",
      "compute.instances.get",
      "compute.instances.list",
      "iam.serviceAccounts.actAs",
    ],
    optionalPermissions: [
      "container.clusters.getCredentials",
      "compute.networks.get",
      "compute.subnetworks.get",
      "logging.logEntries.create",
      "monitoring.metricDescriptors.create",
    ],
    commonResources: [
      "projects/{project}/locations/{location}/clusters/{cluster}",
    ],
  },
  "compute-engine": {
    service: "Compute Engine",
    description: "Deploy and manage Compute Engine instances",
    requiredPermissions: [
      "compute.instances.create",
      "compute.instances.delete",
      "compute.instances.get",
      "compute.instances.list",
      "compute.instances.start",
      "compute.instances.stop",
      "compute.disks.create",
      "compute.disks.use",
      "compute.networks.use",
      "compute.subnetworks.use",
      "iam.serviceAccounts.actAs",
    ],
    optionalPermissions: [
      "compute.instances.setMetadata",
      "compute.instances.setTags",
      "compute.firewalls.create",
      "compute.addresses.create",
    ],
    commonResources: ["projects/{project}/zones/{zone}/instances/{instance}"],
  },
  "cloud-functions": {
    service: "Cloud Functions",
    description: "Deploy and manage Cloud Functions",
    requiredPermissions: [
      "cloudfunctions.functions.create",
      "cloudfunctions.functions.update",
      "cloudfunctions.functions.get",
      "cloudfunctions.functions.list",
      "cloudfunctions.functions.delete",
      "cloudfunctions.operations.get",
      "iam.serviceAccounts.actAs",
    ],
    optionalPermissions: [
      "cloudfunctions.functions.setIamPolicy",
      "cloudfunctions.functions.getIamPolicy",
      "storage.buckets.get",
      "storage.objects.create",
    ],
    commonResources: [
      "projects/{project}/locations/{location}/functions/{function}",
    ],
  },
  "app-engine": {
    service: "App Engine",
    description: "Deploy and manage App Engine applications",
    requiredPermissions: [
      "appengine.applications.create",
      "appengine.applications.update",
      "appengine.applications.get",
      "appengine.versions.create",
      "appengine.versions.update",
      "appengine.versions.get",
      "appengine.versions.list",
      "appengine.services.get",
      "appengine.services.list",
    ],
    optionalPermissions: [
      "appengine.versions.delete",
      "appengine.instances.get",
      "appengine.instances.list",
      "storage.buckets.get",
      "storage.objects.create",
    ],
    commonResources: [
      "projects/{project}/services/{service}/versions/{version}",
    ],
  },
  "cloud-storage": {
    service: "Cloud Storage",
    description: "Manage Cloud Storage buckets and objects",
    requiredPermissions: [
      "storage.buckets.create",
      "storage.buckets.get",
      "storage.buckets.list",
      "storage.objects.create",
      "storage.objects.get",
      "storage.objects.list",
    ],
    optionalPermissions: [
      "storage.buckets.delete",
      "storage.objects.delete",
      "storage.buckets.setIamPolicy",
      "storage.buckets.getIamPolicy",
    ],
    commonResources: ["projects/{project}/buckets/{bucket}"],
  },
  "cloud-sql": {
    service: "Cloud SQL",
    description: "Deploy and manage Cloud SQL instances",
    requiredPermissions: [
      "cloudsql.instances.create",
      "cloudsql.instances.update",
      "cloudsql.instances.get",
      "cloudsql.instances.list",
      "cloudsql.instances.connect",
      "cloudsql.databases.create",
      "cloudsql.databases.get",
      "cloudsql.databases.list",
    ],
    optionalPermissions: [
      "cloudsql.instances.delete",
      "cloudsql.users.create",
      "cloudsql.users.list",
      "cloudsql.backupRuns.create",
    ],
    commonResources: ["projects/{project}/instances/{instance}"],
  },
};

/**
 * Get deployment permission set by service name
 */
export function getDeploymentPermissionSet(
  serviceName: string,
): DeploymentPermissionSet | null {
  return DEPLOYMENT_PERMISSION_SETS[serviceName.toLowerCase()] || null;
}

/**
 * Get all available deployment permission sets
 */
export function getAllDeploymentPermissionSets(): DeploymentPermissionSet[] {
  return Object.values(DEPLOYMENT_PERMISSION_SETS);
}

/**
 * Formats a service account for display
 *
 * @param serviceAccount The service account to format
 * @returns A formatted string representation of the service account
 */
export function formatServiceAccount(serviceAccount: ServiceAccount): string {
  let result = `## Service Account: ${serviceAccount.displayName || serviceAccount.email}\n\n`;

  result += `**Email:** ${serviceAccount.email}\n`;
  result += `**Name:** ${serviceAccount.name}\n`;
  result += `**Project ID:** ${serviceAccount.projectId}\n`;
  result += `**Unique ID:** ${serviceAccount.uniqueId}\n`;

  if (serviceAccount.description)
    result += `**Description:** ${serviceAccount.description}\n`;
  if (serviceAccount.oauth2ClientId)
    result += `**OAuth2 Client ID:** ${serviceAccount.oauth2ClientId}\n`;
  result += `**Status:** ${serviceAccount.disabled ? "Disabled" : "Enabled"}\n`;
  if (serviceAccount.etag) result += `**ETag:** ${serviceAccount.etag}\n`;

  return result;
}

/**
 * Formats an IAM role for display
 *
 * @param role The IAM role to format
 * @returns A formatted string representation of the role
 */
export function formatIamRole(role: IamRole): string {
  let result = `## IAM Role: ${role.title}\n\n`;

  result += `**Name:** ${role.name}\n`;
  result += `**Title:** ${role.title}\n`;
  if (role.description) result += `**Description:** ${role.description}\n`;
  if (role.stage) result += `**Stage:** ${role.stage}\n`;
  result += `**Status:** ${role.deleted ? "Deleted" : "Active"}\n`;
  if (role.etag) result += `**ETag:** ${role.etag}\n`;

  result += `\n**Included Permissions (${role.includedPermissions.length}):**\n`;
  role.includedPermissions.forEach((permission) => {
    result += `- ${permission}\n`;
  });

  return result;
}
