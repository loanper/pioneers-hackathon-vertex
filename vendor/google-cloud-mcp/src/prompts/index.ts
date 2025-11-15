/**
 * Prompts for Google Cloud MCP Server
 *
 * This module defines reusable prompt templates for interacting with Google Cloud services.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Register all prompts with the MCP server
 *
 * @param server The MCP server instance
 */
export function registerPrompts(server: McpServer): void {
  // Log Analysis Prompts
  registerLogAnalysisPrompts(server);

  // Monitoring Prompts
  registerMonitoringPrompts(server);

  // Spanner Prompts
  registerSpannerPrompts(server);
}

/**
 * Register log analysis prompts
 *
 * @param server The MCP server instance
 */
function registerLogAnalysisPrompts(server: McpServer): void {
  // Analyse errors in logs
  server.registerPrompt(
    "analyse-errors",
    {
      title: "Analyse Errors",
      description:
        "Analyse errors in logs over a specified timeframe with optional severity and service filtering",
      argsSchema: {
        timeframe: z
          .string()
          .describe('Time range to analyse (e.g., "1h", "24h", "7d")') as any,
        severity: z
          .string()
          .optional()
          .describe('Minimum severity level (e.g., "ERROR", "WARNING")') as any,
        service: z
          .string()
          .optional()
          .describe("Filter by service name") as any,
      },
    },
    async (args) => {
      const { timeframe, severity, service } = args;
      const filter = [];

      if (severity) {
        filter.push(`severity>=${severity}`);
      }

      if (service) {
        filter.push(`resource.type="${service}"`);
      }

      const filterString = filter.length > 0 ? filter.join(" AND ") : "";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Analyse the following logs from the past ${timeframe} and identify error patterns, their frequency, and potential root causes:`,
            },
          },
          {
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: `logging://entries?timeframe=${timeframe}${filterString ? "&filter=" + encodeURIComponent(filterString) : ""}`,
                text: "",
                mimeType: "text/plain",
              },
            },
          },
        ],
      };
    },
  );

  // Trace request through logs
  server.registerPrompt(
    "trace-request",
    {
      title: "Trace Request",
      description: "Trace a specific request through logs using trace ID",
      argsSchema: {
        traceId: z.string().describe("Trace ID to follow through logs") as any,
        timeframe: z
          .string()
          .optional()
          .describe('Time range to search (e.g., "1h", "24h")') as any,
      },
    },
    async (args) => {
      const { traceId, timeframe = "1h" } = args;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Trace the following request through our services. Analyse the flow, identify any errors or performance issues, and summarise the request lifecycle:`,
            },
          },
          {
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: `logging://entries?timeframe=${timeframe}&filter=${encodeURIComponent(`trace="${traceId}"`)}`,
                text: "",
                mimeType: "text/plain",
              },
            },
          },
        ],
      };
    },
  );
}

/**
 * Register monitoring prompts
 *
 * @param server The MCP server instance
 */
function registerMonitoringPrompts(server: McpServer): void {
  // Performance overview
  server.registerPrompt(
    "performance-overview",
    {
      title: "Performance Overview",
      description:
        "Get a performance overview for services over a specified timeframe",
      argsSchema: {
        timeframe: z
          .string()
          .describe('Time range to analyse (e.g., "1h", "24h", "7d")') as any,
        service: z
          .string()
          .optional()
          .describe("Filter by service name") as any,
      },
    },
    async (args) => {
      const { timeframe, service } = args;
      const filter = service ? `resource.type="${service}"` : "";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Provide a comprehensive performance overview for the past ${timeframe}. Include key metrics like response times, error rates, throughput, and resource utilisation:`,
            },
          },
          {
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: `monitoring://metrics?timeframe=${timeframe}${filter ? "&filter=" + encodeURIComponent(filter) : ""}`,
                text: "",
                mimeType: "application/json",
              },
            },
          },
        ],
      };
    },
  );

  // Alert investigation
  server.registerPrompt(
    "alert-investigation",
    {
      title: "Alert Investigation",
      description:
        "Investigate a specific alert and analyse related metrics and logs",
      argsSchema: {
        alertId: z.string().describe("Alert ID to investigate") as any,
        timeframe: z
          .string()
          .optional()
          .describe('Time window around alert (e.g., "30m", "1h")') as any,
      },
    },
    async (args) => {
      const { alertId, timeframe = "30m" } = args;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Investigate the following alert and provide analysis of what caused it, its impact, and recommended actions:`,
            },
          },
          {
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: `monitoring://alerts/${alertId}?timeframe=${timeframe}`,
                text: "",
                mimeType: "application/json",
              },
            },
          },
          {
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: `logging://entries?timeframe=${timeframe}&filter=${encodeURIComponent(`jsonPayload.alertId="${alertId}"`)}`,
                text: "",
                mimeType: "text/plain",
              },
            },
          },
        ],
      };
    },
  );
}

/**
 * Register Spanner prompts
 *
 * @param server The MCP server instance
 */
function registerSpannerPrompts(server: McpServer): void {
  // Schema explanation
  server.registerPrompt(
    "schema-explanation",
    {
      title: "Schema Explanation",
      description:
        "Get a comprehensive overview of a Cloud Spanner database schema",
      argsSchema: {
        instanceId: z.string().describe("Spanner instance ID") as any,
        databaseId: z.string().describe("Spanner database ID") as any,
      },
    },
    async (args) => {
      const { instanceId, databaseId } = args;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Explain the database schema, including table relationships, key constraints, and design patterns used:`,
            },
          },
          {
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: `spanner://${instanceId}/${databaseId}/schema`,
                text: "",
                mimeType: "application/json",
              },
            },
          },
        ],
      };
    },
  );

  // Query optimisation
  server.registerPrompt(
    "query-optimisation",
    {
      title: "Query Optimisation",
      description:
        "Analyse and provide optimisation suggestions for a Cloud Spanner SQL query",
      argsSchema: {
        instanceId: z.string().describe("Spanner instance ID") as any,
        databaseId: z.string().describe("Spanner database ID") as any,
        query: z.string().describe("SQL query to optimise") as any,
      },
    },
    async (args) => {
      const { instanceId, databaseId, query } = args;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Analyse the following SQL query and provide optimisation recommendations, including index suggestions, query restructuring, and performance improvements:`,
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: `Query to optimise:\n\`\`\`sql\n${query}\n\`\`\``,
            },
          },
          {
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: `spanner://${instanceId}/${databaseId}/schema`,
                text: "",
                mimeType: "application/json",
              },
            },
          },
        ],
      };
    },
  );

  // Data exploration
  server.registerPrompt(
    "data-exploration",
    {
      title: "Data Exploration",
      description:
        "Analyse a Cloud Spanner table schema, performance, and data patterns",
      argsSchema: {
        instanceId: z.string().describe("Spanner instance ID") as any,
        databaseId: z.string().describe("Spanner database ID") as any,
        tableName: z.string().describe("Table to explore") as any,
      },
    },
    async (args) => {
      const { instanceId, databaseId, tableName } = args;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Provide a comprehensive analysis of the ${tableName} table, including schema details, data patterns, performance characteristics, and suggestions for improvement:`,
            },
          },
          {
            role: "user",
            content: {
              type: "resource",
              resource: {
                uri: `spanner://${instanceId}/${databaseId}/tables/${tableName}`,
                text: "",
                mimeType: "application/json",
              },
            },
          },
        ],
      };
    },
  );
}
