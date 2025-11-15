/**
 * Google Cloud Trace service for MCP
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTraceResources } from "./resources.js";
import { registerTraceTools } from "./tools.js";

/**
 * Registers all Google Cloud Trace functionality with the MCP server
 *
 * @param server The MCP server instance
 */
export async function registerTraceService(server: McpServer): Promise<void> {
  // Register resources
  registerTraceResources(server);

  // Register tools
  await registerTraceTools(server);

  // Service registration complete
}

// Export types and utilities
export * from "./types.js";
