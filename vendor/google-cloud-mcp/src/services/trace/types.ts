/**
 * Google Cloud Trace types and utilities
 */
import * as traceAgent from "@google-cloud/trace-agent";
import { PluginTypes } from "@google-cloud/trace-agent";
import { getProjectId } from "../../utils/auth.js";
import { stateManager } from "../../utils/state-manager.js";
import { GcpMcpError } from "../../utils/error.js";
import { logger } from "../../utils/logger.js";

// Global trace client that can be reused
let traceClient: PluginTypes.Tracer | null = null;

/**
 * Trace span status
 */
export enum TraceStatus {
  OK = "OK",
  ERROR = "ERROR",
  UNSPECIFIED = "UNSPECIFIED",
}

/**
 * Trace span data
 */
export interface TraceSpan {
  /** Span ID */
  spanId: string;
  /** Display name */
  displayName: string;
  /** Start time */
  startTime: string;
  /** End time */
  endTime: string;
  /** Span kind */
  kind: string;
  /** Status */
  status: TraceStatus;
  /** Parent span ID (if any) */
  parentSpanId?: string;
  /** Attributes/labels */
  attributes: Record<string, string>;
  /** Child spans */
  childSpans?: TraceSpan[];
}

/**
 * Trace data
 */
export interface TraceData {
  /** Trace ID */
  traceId: string;
  /** Project ID */
  projectId: string;
  /** Root spans */
  rootSpans: TraceSpan[];
  /** All spans (flat list) */
  allSpans: TraceSpan[];
}

/**
 * Gets the Google Cloud Trace client
 *
 * @returns The trace client
 */
export function getTraceClient(): PluginTypes.Tracer {
  if (!traceClient) {
    try {
      // Get project ID from state manager if available
      const projectId = stateManager.getCurrentProjectId();

      // Initialize the trace agent
      const config: any = {
        samplingRate: 1, // Sample all traces for now
        ignoreUrls: ["/health", "/readiness"], // Ignore health check endpoints
        serviceContext: {
          service: "google-cloud-mcp",
          version: "0.1.0",
        },
      };

      // Add project ID if available
      if (projectId) {
        config.projectId = projectId;
      }

      traceClient = traceAgent.start(config);
      logger.debug(
        `Initialized Google Cloud Trace client${projectId ? ` for project ${projectId}` : ""}`,
      );
    } catch (error) {
      // Failed to initialize Google Cloud Trace client
      logger.error(
        `Failed to initialize Google Cloud Trace client: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new GcpMcpError(
        "Failed to initialize Google Cloud Trace client",
        "INTERNAL",
        500,
      );
    }
  }

  return traceClient;
}

/**
 * Formats trace data for display
 *
 * @param traceData The trace data to format
 * @returns Formatted markdown string
 */
export function formatTraceData(traceData: TraceData): string {
  let markdown = `## Trace Details\n\n`;
  markdown += `- **Trace ID**: ${traceData.traceId}\n`;
  markdown += `- **Project ID**: ${traceData.projectId}\n`;
  markdown += `- **Total Spans**: ${traceData.allSpans.length}\n`;
  markdown += `- **Associated Logs**: [View logs for this trace](gcp-trace://${traceData.projectId}/traces/${traceData.traceId}/logs)\n\n`;

  // Add a summary of span types if we have them
  const spanTypes = new Map<string, number>();
  traceData.allSpans.forEach((span) => {
    if (span.kind && span.kind !== "UNSPECIFIED") {
      spanTypes.set(span.kind, (spanTypes.get(span.kind) || 0) + 1);
    }
  });

  if (spanTypes.size > 0) {
    markdown += `- **Span Types**:\n`;
    for (const [type, count] of spanTypes.entries()) {
      markdown += `  - ${type}: ${count}\n`;
    }
    markdown += `\n`;
  }

  // Format root spans and their children
  markdown += `## Trace Hierarchy\n\n`;

  for (const rootSpan of traceData.rootSpans) {
    markdown += formatSpanHierarchy(rootSpan, 0);
  }

  // Add section for failed spans if any
  const failedSpans = traceData.allSpans.filter(
    (span) => span.status === TraceStatus.ERROR,
  );
  if (failedSpans.length > 0) {
    markdown += `\n## Failed Spans (${failedSpans.length})\n\n`;

    for (const span of failedSpans) {
      markdown += `- **${span.displayName}** (${span.spanId})\n`;
      markdown += `  - Start: ${new Date(span.startTime).toISOString()}\n`;
      markdown += `  - End: ${new Date(span.endTime).toISOString()}\n`;
      markdown += `  - Duration: ${calculateDuration(span.startTime, span.endTime)}\n`;

      // Add error details if available
      if (span.attributes["error.message"]) {
        markdown += `  - Error: ${span.attributes["error.message"]}\n`;
      }

      markdown += "\n";
    }
  }

  return markdown;
}

/**
 * Formats a span hierarchy for display
 *
 * @param span The span to format
 * @param depth The current depth in the hierarchy
 * @returns Formatted markdown string
 */
function formatSpanHierarchy(span: TraceSpan, depth: number): string {
  const indent = "  ".repeat(depth);
  const statusEmoji =
    span.status === TraceStatus.ERROR
      ? "❌ "
      : span.status === TraceStatus.OK
        ? "✅ "
        : "⚪ ";

  // Format the span name with more details if available
  let displayText = span.displayName;

  // If the display name still contains 'Unknown Span', try to enhance it with attributes
  if (displayText.includes("Unknown Span")) {
    // Try to add more context from attributes if the name is unknown
    const contextAttributes = [];

    // Check for common HTTP attributes
    if (span.attributes["/http/method"])
      contextAttributes.push(span.attributes["/http/method"]);
    if (span.attributes["/http/path"])
      contextAttributes.push(span.attributes["/http/path"]);
    if (span.attributes["/http/url"])
      contextAttributes.push(span.attributes["/http/url"]);
    if (span.attributes["/http/status_code"])
      contextAttributes.push(`Status: ${span.attributes["/http/status_code"]}`);

    // Check for component or service name
    if (span.attributes["/component"])
      contextAttributes.push(`Component: ${span.attributes["/component"]}`);
    if (span.attributes["service.name"])
      contextAttributes.push(`Service: ${span.attributes["service.name"]}`);

    // Check for database attributes
    if (span.attributes["/db/system"])
      contextAttributes.push(`DB: ${span.attributes["/db/system"]}`);
    if (span.attributes["/db/operation"])
      contextAttributes.push(span.attributes["/db/operation"]);

    // Check for agent information
    if (span.attributes["g.co/agent"])
      contextAttributes.push(`Agent: ${span.attributes["g.co/agent"]}`);

    // Add any context found to the display text
    if (contextAttributes.length > 0) {
      displayText = `${displayText} (${contextAttributes.join(" | ")})`;
    }
  }

  // Format the span display line with ID and status
  let markdown = `${indent}- ${statusEmoji}**${displayText}**\n`;
  markdown += `${indent}  - Span ID: ${span.spanId}\n`;

  // Add timing information
  if (span.startTime && span.endTime) {
    const duration = calculateDuration(span.startTime, span.endTime);
    markdown += `${indent}  - Duration: ${duration}\n`;

    // Add start and end times if they exist
    const startDate = new Date(span.startTime);
    const endDate = new Date(span.endTime);
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      // Format dates in a more readable format
      const formatDate = (date: Date) => {
        return date.toISOString().replace("T", " ").replace("Z", "");
      };

      markdown += `${indent}  - Start: ${formatDate(startDate)}\n`;
      markdown += `${indent}  - End: ${formatDate(endDate)}\n`;
    }
  }

  // Add span kind if it's not the default
  if (span.kind && span.kind !== "UNSPECIFIED") {
    markdown += `${indent}  - Kind: ${span.kind}\n`;
  }

  // Add error information if present
  if (span.status === TraceStatus.ERROR) {
    markdown += `${indent}  - Status: ERROR\n`;

    // Look for error details in attributes
    const errorMessage =
      span.attributes["/error/message"] ||
      span.attributes["error.message"] ||
      span.attributes["error"];

    if (errorMessage) {
      markdown += `${indent}  - Error: ${errorMessage}\n`;
    }
  }

  // Add all attributes, prioritizing important ones
  const importantAttributes = [
    // HTTP attributes
    "/http/method",
    "/http/url",
    "/http/status_code",
    "/http/host",
    "/http/path",
    "/http/route",
    "/http/user_agent",
    "http.method",
    "http.url",
    "http.status_code",
    "http.host",
    "http.path",
    "http.route",
    "http.user_agent",

    // Error attributes
    "/error/message",
    "error.message",
    "error",

    // Database attributes
    "/db/system",
    "/db/name",
    "/db/operation",
    "/db/statement",
    "db.system",
    "db.name",
    "db.operation",
    "db.statement",

    // Service and component attributes
    "service.name",
    "span.kind",
    "component",
    "/component",

    // Google Cloud specific attributes
    "g.co/agent",
    "g.co/gae/app/module",
    "g.co/gae/app/version",
    "g.co/gce/instance_id",
  ];

  // First show important attributes
  const importantAttributeEntries = Object.entries(span.attributes).filter(
    ([key]) => importantAttributes.includes(key),
  );

  // Then show other attributes
  const otherAttributeEntries = Object.entries(span.attributes).filter(
    ([key]) => !importantAttributes.includes(key),
  );

  if (
    importantAttributeEntries.length > 0 ||
    otherAttributeEntries.length > 0
  ) {
    markdown += `${indent}  - Attributes:\n`;

    // Show important attributes first
    for (const [key, value] of importantAttributeEntries) {
      markdown += `${indent}    - ${key}: ${value}\n`;
    }

    // Show other attributes (up to a reasonable limit)
    const maxOtherAttributes = 5;
    const shownOtherAttributes = otherAttributeEntries.slice(
      0,
      maxOtherAttributes,
    );

    for (const [key, value] of shownOtherAttributes) {
      markdown += `${indent}    - ${key}: ${value}\n`;
    }

    // Indicate if there are more attributes
    if (otherAttributeEntries.length > maxOtherAttributes) {
      const remaining = otherAttributeEntries.length - maxOtherAttributes;
      markdown += `${indent}    - ... ${remaining} more attributes\n`;
    }
  }

  // Format child spans
  if (span.childSpans && span.childSpans.length > 0) {
    // Sort child spans by start time if available
    const sortedChildren = [...span.childSpans];
    sortedChildren.sort((a, b) => {
      if (a.startTime && b.startTime) {
        return (
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
      }
      return 0;
    });

    for (const childSpan of sortedChildren) {
      markdown += formatSpanHierarchy(childSpan, depth + 1);
    }
  }

  return markdown;
}

/**
 * Calculates the duration between two timestamps
 *
 * @param startTime The start time
 * @param endTime The end time
 * @returns Formatted duration string
 */
function calculateDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const durationMs = end - start;

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  } else if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = ((durationMs % 60000) / 1000).toFixed(2);
    return `${minutes}m ${seconds}s`;
  }
}

// Note: We only use the v1 API for querying trace data

/**
 * Builds a hierarchical trace structure from flat spans
 *
 * @param projectId The Google Cloud project ID
 * @param traceId The trace ID
 * @param spans The flat list of spans
 * @returns Structured trace data
 */
export function buildTraceHierarchy(
  projectId: string,
  traceId: string,
  spans: any[],
): TraceData {
  // Log the raw spans for debugging
  logger.debug(
    `Building trace hierarchy for trace ${traceId} with ${spans.length} spans`,
  );

  // Debug: Log the structure of the first span to understand the format
  if (spans.length > 0) {
    logger.debug(`First span structure: ${JSON.stringify(spans[0], null, 2)}`);
    logger.debug(`First span keys: ${Object.keys(spans[0]).join(", ")}`);
  }

  // We're using the v1 API which returns spans in a consistent format

  // Map to store spans by ID for quick lookup
  const spanMap = new Map<string, TraceSpan>();

  // Convert raw spans to our TraceSpan format
  logger.debug("Converting spans to TraceSpan format...");
  const traceSpans: TraceSpan[] = spans.map((span, index) => {
    // Extract span data - ensure we have a valid spanId
    const spanId = span.spanId || "";
    logger.debug(`Processing span ${index} with ID: ${spanId}`);

    // Handle different display name formats in v1 API
    // According to https://cloud.google.com/trace/docs/reference/v1/rest/v1/projects.traces#TraceSpan
    let displayName = "Unknown Span";

    // Debug: Log the name-related fields
    logger.debug(`Span ${spanId} name fields:`);
    logger.debug(`- name: ${span.name || "undefined"}`);
    logger.debug(
      `- displayName: ${typeof span.displayName === "object" ? JSON.stringify(span.displayName) : span.displayName || "undefined"}`,
    );

    // In v1 API, the name field is the actual span name
    if (span.name) {
      displayName = span.name;
      logger.debug(`Using span.name: ${displayName}`);
    } else if (span.displayName?.value) {
      displayName = span.displayName.value;
      logger.debug(`Using span.displayName.value: ${displayName}`);
    } else if (typeof span.displayName === "string") {
      displayName = span.displayName;
      logger.debug(`Using span.displayName string: ${displayName}`);
    }

    // For v1 API, check if the name is a full URL path (common in Google Cloud Trace)
    if (displayName.startsWith("/")) {
      // This is likely an HTTP path
      displayName = `HTTP ${displayName}`;
    }

    // If we still have an unknown span, try to extract a meaningful name from labels
    if (displayName === "Unknown Span") {
      // Try to extract from common label patterns in Google Cloud Trace v1 API
      if (span.labels) {
        // Common Google Cloud Trace labels
        if (span.labels["/http/path"]) {
          const method = span.labels["/http/method"] || "";
          displayName = `${method} ${span.labels["/http/path"]}`;
        } else if (span.labels["/http/url"]) {
          displayName = `HTTP ${span.labels["/http/url"]}`;
        } else if (span.labels["/http/status_code"]) {
          displayName = `HTTP Status: ${span.labels["/http/status_code"]}`;
        } else if (span.labels["/component"]) {
          displayName = `Component: ${span.labels["/component"]}`;
        } else if (span.labels["/db/statement"]) {
          const dbSystem = span.labels["/db/system"] || "DB";
          displayName = `${dbSystem}: ${span.labels["/db/statement"].substring(0, 30)}...`;
        } else if (span.labels["g.co/agent"]) {
          displayName = `Agent: ${span.labels["g.co/agent"]}`;
        } else if (span.labels["g.co/gae/app/module"]) {
          displayName = `GAE Module: ${span.labels["g.co/gae/app/module"]}`;
        } else if (span.labels["g.co/gae/app/version"]) {
          displayName = `GAE Version: ${span.labels["g.co/gae/app/version"]}`;
        } else if (span.labels["g.co/gce/instance_id"]) {
          displayName = `GCE Instance: ${span.labels["g.co/gce/instance_id"]}`;
        }

        // If still unknown, check for any label that might be descriptive
        if (displayName === "Unknown Span") {
          // Look for descriptive labels
          const descriptiveLabels = Object.entries(span.labels).filter(
            ([key, value]) =>
              typeof value === "string" &&
              !key.startsWith("/") &&
              !key.startsWith("g.co/") &&
              value.length < 50,
          );

          if (descriptiveLabels.length > 0) {
            // Use the first descriptive label
            const [key, value] = descriptiveLabels[0];
            displayName = `${key}: ${value}`;
          }
        }
      }

      // Try alternative fields from the span object
      if (displayName === "Unknown Span") {
        // Check for operation name (common in Cloud Trace)
        if (span.operation && span.operation.name) {
          displayName = `Operation: ${span.operation.name}`;
        }

        // Check for any other descriptive fields
        const possibleNameFields = [
          "operationName",
          "description",
          "type",
          "method",
          "rpcName",
          "kind",
        ];
        for (const field of possibleNameFields) {
          if (span[field] && typeof span[field] === "string") {
            displayName = `${field}: ${span[field]}`;
            break;
          }
        }
      }
    }

    // If we still have an unknown span, include the span ID in the display name
    if (displayName === "Unknown Span" && spanId) {
      displayName = `Unknown Span (ID: ${spanId})`;
    }

    // Extract timestamps - in v1 API these are RFC3339 strings
    const startTime = span.startTime || "";
    const endTime = span.endTime || "";
    const parentSpanId = span.parentSpanId || "";

    // Extract span kind - in v1 API, this might be in different formats
    let kind = "UNSPECIFIED";
    if (span.kind) {
      kind = span.kind;
    } else if (span.spanKind) {
      kind = span.spanKind;
    }

    // In v1 API, the span kind might be encoded in labels
    if (kind === "UNSPECIFIED" && span.labels) {
      if (span.labels["/span/kind"]) {
        kind = span.labels["/span/kind"];
      } else if (span.labels["span.kind"]) {
        kind = span.labels["span.kind"];
      }
    }

    // Extract status - in v1 API this might be in different formats
    let status = TraceStatus.UNSPECIFIED;
    if (span.status) {
      if (span.status.code === 0) {
        status = TraceStatus.OK;
      } else if (span.status.code > 0) {
        status = TraceStatus.ERROR;
      }
    }

    // In v1 API, error status might be in labels
    if (status === TraceStatus.UNSPECIFIED && span.labels) {
      if (span.labels["/error/message"] || span.labels["error"]) {
        status = TraceStatus.ERROR;
      } else if (span.labels["/http/status_code"]) {
        const statusCode = parseInt(span.labels["/http/status_code"], 10);
        if (statusCode >= 400) {
          status = TraceStatus.ERROR;
        } else if (statusCode >= 200 && statusCode < 400) {
          status = TraceStatus.OK;
        }
      }
    }

    // Extract attributes/labels - handle both v1 and v2 formats
    const attributes: Record<string, string> = {};

    // Debug: Log label information
    logger.debug(`Span ${spanId} labels:`);
    logger.debug(`- Has labels: ${!!span.labels}`);
    if (span.labels) {
      logger.debug(`- Label keys: ${Object.keys(span.labels).join(", ")}`);
    }

    // Handle v1 API format (labels)
    if (span.labels) {
      logger.debug(
        `Processing ${Object.keys(span.labels).length} labels for span ${spanId}`,
      );
      for (const [key, value] of Object.entries(span.labels)) {
        if (value !== undefined && value !== null) {
          attributes[key] = String(value);
        }
      }
    }

    // Also handle v2 API format (attributes.attributeMap)
    if (span.attributes && span.attributes.attributeMap) {
      for (const [key, value] of Object.entries(span.attributes.attributeMap)) {
        if (value !== undefined && value !== null) {
          attributes[key] =
            (value as any)?.stringValue ||
            String((value as any)?.intValue || (value as any)?.boolValue || "");
        }
      }
    }

    // Handle any other fields that might contain useful information
    for (const [key, value] of Object.entries(span)) {
      // Skip keys we've already processed or that are part of the standard span structure
      if (
        [
          "spanId",
          "name",
          "displayName",
          "startTime",
          "endTime",
          "parentSpanId",
          "kind",
          "status",
          "labels",
          "attributes",
          "childSpans",
        ].includes(key)
      ) {
        continue;
      }

      // Add any other fields as attributes
      if (value !== undefined && value !== null) {
        if (typeof value !== "object") {
          attributes[`raw.${key}`] = String(value);
        } else if (!Array.isArray(value)) {
          // For simple objects, flatten one level
          try {
            attributes[`raw.${key}`] = JSON.stringify(value).substring(0, 100);
            if (JSON.stringify(value).length > 100) {
              attributes[`raw.${key}`] += "...";
            }
          } catch (e) {
            // If we can't stringify, just note that it exists
            attributes[`raw.${key}`] = "[Complex Object]";
          }
        }
      }
    }

    // Create the trace span
    const traceSpan: TraceSpan = {
      spanId,
      displayName,
      startTime,
      endTime,
      kind,
      status,
      attributes,
      childSpans: [],
    };

    if (parentSpanId) {
      traceSpan.parentSpanId = parentSpanId;
      logger.debug(`Span ${spanId} has parent: ${parentSpanId}`);
    } else {
      logger.debug(`Span ${spanId} has no parent (will be a root span)`);
    }

    // Debug: Log the final display name
    logger.debug(`Final display name for span ${spanId}: "${displayName}"`);

    // Store in map for quick lookup
    spanMap.set(spanId, traceSpan);

    return traceSpan;
  });

  // Build the hierarchy
  const rootSpans: TraceSpan[] = [];

  logger.debug(`Building trace hierarchy for ${traceSpans.length} spans...`);
  logger.debug(`Span map contains ${spanMap.size} spans`);

  for (const span of traceSpans) {
    logger.debug(
      `Processing hierarchy for span ${span.spanId} (${span.displayName})`,
    );

    if (span.parentSpanId) {
      logger.debug(`Span ${span.spanId} has parent ${span.parentSpanId}`);
      // This is a child span, add it to its parent
      const parentSpan = spanMap.get(span.parentSpanId);
      if (parentSpan) {
        logger.debug(
          `Found parent span ${span.parentSpanId} for child ${span.spanId}`,
        );
        if (!parentSpan.childSpans) {
          parentSpan.childSpans = [];
          logger.debug(
            `Initialized childSpans array for parent ${span.parentSpanId}`,
          );
        }
        parentSpan.childSpans.push(span);
        logger.debug(
          `Added span ${span.spanId} as child of ${span.parentSpanId}`,
        );
      } else {
        // Parent not found, treat as root
        logger.debug(
          `Parent ${span.parentSpanId} not found for span ${span.spanId}, treating as root`,
        );
        rootSpans.push(span);
      }
    } else {
      // This is a root span
      logger.debug(`Span ${span.spanId} has no parent, adding as root span`);
      rootSpans.push(span);
    }
  }

  // Sort child spans by start time
  for (const span of traceSpans) {
    if (span.childSpans && span.childSpans.length > 0) {
      logger.debug(
        `Sorting ${span.childSpans.length} child spans for parent ${span.spanId}`,
      );
      span.childSpans.sort((a, b) => {
        return (
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
      });
    }
  }

  // Debug: Log the root spans and their children
  logger.debug(`Final hierarchy: ${rootSpans.length} root spans`);
  for (const rootSpan of rootSpans) {
    logger.debug(`Root span: ${rootSpan.spanId} (${rootSpan.displayName})`);
    logger.debug(`- Has ${rootSpan.childSpans?.length || 0} direct children`);

    // Count total descendants
    let totalDescendants = 0;
    const countDescendants = (span: TraceSpan) => {
      if (span.childSpans) {
        totalDescendants += span.childSpans.length;
        for (const child of span.childSpans) {
          countDescendants(child);
        }
      }
    };
    countDescendants(rootSpan);
    logger.debug(`- Total descendants: ${totalDescendants}`);
  }

  return {
    traceId,
    projectId,
    rootSpans,
    allSpans: traceSpans,
  };
}

/**
 * Extracts a trace ID from a log entry if present
 *
 * @param logEntry The log entry to check
 * @returns The trace ID if found, otherwise undefined
 */
export function extractTraceIdFromLog(logEntry: any): string | undefined {
  // Check for trace in the standard logging.googleapis.com/trace field
  if (logEntry.trace) {
    // The trace field is typically in the format "projects/PROJECT_ID/traces/TRACE_ID"
    const match = logEntry.trace.match(/traces\/([a-f0-9]+)$/i);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Check for trace in labels
  if (logEntry.labels && logEntry.labels["logging.googleapis.com/trace"]) {
    const traceLabel = logEntry.labels["logging.googleapis.com/trace"];
    const match = traceLabel.match(/traces\/([a-f0-9]+)$/i);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Check for trace in jsonPayload
  if (logEntry.jsonPayload) {
    if (logEntry.jsonPayload.traceId) {
      return logEntry.jsonPayload.traceId;
    }

    if (logEntry.jsonPayload["logging.googleapis.com/trace"]) {
      const tracePayload = logEntry.jsonPayload["logging.googleapis.com/trace"];
      const match = tracePayload.match(/traces\/([a-f0-9]+)$/i);
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  return undefined;
}
