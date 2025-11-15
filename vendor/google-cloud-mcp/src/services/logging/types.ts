/**
 * Type definitions for Google Cloud Logging service
 */
import { Logging } from "@google-cloud/logging";

/**
 * Interface for Google Cloud Log Entry
 */
export interface LogEntry {
  timestamp: string;
  severity: string;
  resource: {
    type: string;
    labels: Record<string, string>;
  };
  logName: string;
  textPayload?: string;
  jsonPayload?: Record<string, unknown>;
  protoPayload?: Record<string, unknown>;
  labels?: Record<string, string>;
  insertId?: string;
  trace?: string;
  spanId?: string;
  traceSampled?: boolean;
  sourceLocation?: {
    file?: string;
    line?: number;
    function?: string;
  };
  httpRequest?: {
    requestMethod?: string;
    requestUrl?: string;
    requestSize?: string;
    status?: number;
    responseSize?: string;
    userAgent?: string;
    remoteIp?: string;
    referer?: string;
    latency?: string;
    cacheLookup?: boolean;
    cacheHit?: boolean;
    cacheValidatedWithOriginServer?: boolean;
    cacheFillBytes?: string;
    protocol?: string;
  };
  operation?: {
    id?: string;
    producer?: string;
    first?: boolean;
    last?: boolean;
  };
  receiveTimestamp?: string;
  [key: string]: unknown;
}

/**
 * Initialises the Google Cloud Logging client
 *
 * @returns A configured Logging client
 */
export function getLoggingClient(): Logging {
  return new Logging({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });
}

/**
 * Formats a log entry for display with comprehensive information
 *
 * @param entry The log entry to format
 * @returns A formatted string representation of the log entry with all available fields
 */
export function formatLogEntry(entry: LogEntry): string {
  // Safely format the timestamp
  let timestamp: string;
  try {
    if (!entry.timestamp) {
      timestamp = "No timestamp";
    } else {
      const date = new Date(entry.timestamp);
      timestamp = !isNaN(date.getTime())
        ? date.toISOString()
        : String(entry.timestamp);
    }
  } catch {
    timestamp = String(entry.timestamp || "Invalid timestamp");
  }

  const severity = entry.severity || "DEFAULT";
  const resourceType = entry.resource?.type || "unknown";
  const resourceLabels = entry.resource?.labels
    ? Object.entries(entry.resource.labels)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")
    : "";

  const resource = resourceLabels
    ? `${resourceType}(${resourceLabels})`
    : resourceType;

  // Start building the comprehensive log entry display
  let result = `## ${timestamp} | ${severity} | ${resource}\n\n`;

  // Basic metadata
  if (entry.logName) result += `**Log Name:** ${entry.logName}\n`;
  if (entry.insertId) result += `**Insert ID:** ${entry.insertId}\n`;
  if (entry.receiveTimestamp) {
    try {
      const receiveTime = new Date(entry.receiveTimestamp).toISOString();
      result += `**Receive Time:** ${receiveTime}\n`;
    } catch {
      result += `**Receive Time:** ${entry.receiveTimestamp}\n`;
    }
  }

  // Trace context information
  if (entry.trace) result += `**Trace:** ${entry.trace}\n`;
  if (entry.spanId) result += `**Span ID:** ${entry.spanId}\n`;
  if (entry.traceSampled !== undefined)
    result += `**Trace Sampled:** ${entry.traceSampled}\n`;

  // Source location if available
  if (entry.sourceLocation) {
    result += `**Source Location:**\n`;
    if (entry.sourceLocation.file)
      result += `  - File: ${entry.sourceLocation.file}\n`;
    if (entry.sourceLocation.line)
      result += `  - Line: ${entry.sourceLocation.line}\n`;
    if (entry.sourceLocation.function)
      result += `  - Function: ${entry.sourceLocation.function}\n`;
  }

  // HTTP request details if available
  if (entry.httpRequest) {
    result += `**HTTP Request:**\n`;
    if (entry.httpRequest.requestMethod)
      result += `  - Method: ${entry.httpRequest.requestMethod}\n`;
    if (entry.httpRequest.requestUrl)
      result += `  - URL: ${entry.httpRequest.requestUrl}\n`;
    if (entry.httpRequest.status)
      result += `  - Status: ${entry.httpRequest.status}\n`;
    if (entry.httpRequest.userAgent)
      result += `  - User Agent: ${entry.httpRequest.userAgent}\n`;
    if (entry.httpRequest.remoteIp)
      result += `  - Remote IP: ${entry.httpRequest.remoteIp}\n`;
    if (entry.httpRequest.latency)
      result += `  - Latency: ${entry.httpRequest.latency}\n`;
    if (entry.httpRequest.requestSize)
      result += `  - Request Size: ${entry.httpRequest.requestSize}\n`;
    if (entry.httpRequest.responseSize)
      result += `  - Response Size: ${entry.httpRequest.responseSize}\n`;
    if (entry.httpRequest.referer)
      result += `  - Referer: ${entry.httpRequest.referer}\n`;
    if (entry.httpRequest.protocol)
      result += `  - Protocol: ${entry.httpRequest.protocol}\n`;
    if (entry.httpRequest.cacheHit !== undefined)
      result += `  - Cache Hit: ${entry.httpRequest.cacheHit}\n`;
    if (entry.httpRequest.cacheLookup !== undefined)
      result += `  - Cache Lookup: ${entry.httpRequest.cacheLookup}\n`;
    if (entry.httpRequest.cacheValidatedWithOriginServer !== undefined) {
      result += `  - Cache Validated: ${entry.httpRequest.cacheValidatedWithOriginServer}\n`;
    }
    if (entry.httpRequest.cacheFillBytes)
      result += `  - Cache Fill Bytes: ${entry.httpRequest.cacheFillBytes}\n`;
  }

  // Operation details if available
  if (entry.operation) {
    result += `**Operation:**\n`;
    if (entry.operation.id) result += `  - ID: ${entry.operation.id}\n`;
    if (entry.operation.producer)
      result += `  - Producer: ${entry.operation.producer}\n`;
    if (entry.operation.first !== undefined)
      result += `  - First: ${entry.operation.first}\n`;
    if (entry.operation.last !== undefined)
      result += `  - Last: ${entry.operation.last}\n`;
  }

  // Labels if they exist
  if (entry.labels && Object.keys(entry.labels).length > 0) {
    try {
      result += `**Labels:**\n`;
      Object.entries(entry.labels).forEach(([key, value]) => {
        result += `  - ${key}: ${value}\n`;
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      result += `**Labels:** [Error formatting labels: ${errorMessage}]\n`;
    }
  }

  // Add any additional fields that might be present
  const knownFields = new Set([
    "timestamp",
    "severity",
    "resource",
    "logName",
    "textPayload",
    "jsonPayload",
    "protoPayload",
    "labels",
    "insertId",
    "trace",
    "spanId",
    "traceSampled",
    "sourceLocation",
    "httpRequest",
    "operation",
    "receiveTimestamp",
  ]);

  const additionalFields: Record<string, unknown> = {};
  Object.entries(entry).forEach(([key, value]) => {
    if (!knownFields.has(key) && value !== undefined && value !== null) {
      additionalFields[key] = value;
    }
  });

  if (Object.keys(additionalFields).length > 0) {
    result += `**Additional Fields:**\n`;
    try {
      result += `\`\`\`json\n${JSON.stringify(additionalFields, null, 2)}\n\`\`\`\n`;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      result += `[Error formatting additional fields: ${errorMessage}]\n`;
    }
  }

  // Format the main payload
  result += `\n**Payload:**\n`;
  try {
    if (entry.textPayload !== undefined && entry.textPayload !== null) {
      result += `\`\`\`\n${String(entry.textPayload)}\n\`\`\``;
    } else if (entry.jsonPayload) {
      result += `\`\`\`json\n${JSON.stringify(entry.jsonPayload, null, 2)}\n\`\`\``;
    } else if (entry.protoPayload) {
      result += `\`\`\`json\n${JSON.stringify(entry.protoPayload, null, 2)}\n\`\`\``;
    } else {
      // Check for any other payload-like fields
      const data = entry.data || entry.message || entry.msg;
      if (data) {
        if (typeof data === "string") {
          result += `\`\`\`\n${data}\n\`\`\``;
        } else {
          result += `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
        }
      } else {
        result += `\`\`\`\n[No payload available]\n\`\`\``;
      }
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    result += `\`\`\`\n[Error formatting payload: ${errorMessage}]\n\`\`\``;
  }

  return result;
}
