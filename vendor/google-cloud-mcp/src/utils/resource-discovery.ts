/**
 * Resource discovery utilities for MCP server
 *
 * This module provides functions to register resource discovery endpoints
 * that allow clients to list available resources.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProjectId } from "./auth.js";

/**
 * Register resource discovery handlers with the MCP server
 *
 * @param server The MCP server instance
 */
export async function registerResourceDiscovery(
  server: McpServer,
): Promise<void> {
  // Get the project ID for constructing resource URIs
  const projectId = await getProjectId();

  // Register a resource list endpoint
  server.resource("resource-list", "resources://list", async (uri) => {
    return {
      contents: [
        {
          uri: uri.href,
          text: `# Google Cloud MCP Resources

This server provides access to Google Cloud services through the Model Context Protocol (MCP).
Below are the available resources you can use to explore and interact with Google Cloud services.

## Resource Navigation

Start with these top-level resources to discover available services:

* **All Resources** - \`resources://list\` (this resource)
  List of all available resources

## Spanner Resources

Use these resources to explore Google Cloud Spanner databases:

* **Spanner Overview** - \`resources://spanner\`
  Detailed guide for navigating Spanner resources

* **Spanner Instances** - \`gcp-spanner://${projectId}/instances\`
  List all Spanner instances in the project

**Navigation Flow**:
1. Start with \`gcp-spanner://${projectId}/instances\` to see all available instances
2. From the instances list, you can navigate to a specific instance's databases
3. From the databases list, you can navigate to tables and schema

**Important**: Always start with the Spanner Instances resource to discover the actual instance IDs available in your project.

## Logging Resources

Use these resources to explore Google Cloud Logging:

* **Recent Logs** - \`gcp-logs://${projectId}/recent\`
  View recent log entries from Google Cloud Logging

* **Filtered Logs** - \`gcp-logs://${projectId}/filter/{filter}\`
  View log entries matching a specific filter

## Monitoring Resources

Use these resources to explore Google Cloud Monitoring:

* **Recent Metrics** - \`gcp-monitoring://${projectId}/recent\`
  View recent metrics from Google Cloud Monitoring

* **Filtered Metrics** - \`gcp-monitoring://${projectId}/filter/{filter}\`
  View metrics matching a specific filter

* **Metric Types** - \`gcp-monitoring://${projectId}/metric-types\`
  List available metric types

## Usage Tips

1. Start by exploring the top-level resources for each service
2. Navigate through the hierarchy (project → instance → database → table)
3. Use the schema resources to understand data structure
4. Use the preview resources to see sample data

## Available Tools

In addition to these resources, the following tools are available:

* **natural-language-spanner-query** - Query Spanner using natural language
* **execute-spanner-query** - Execute SQL queries against Spanner databases
* **list-spanner-tables** - List tables in a Spanner database
* **list-spanner-instances** - List Spanner instances in the project
* **list-spanner-databases** - List databases in a Spanner instance
* **list-metric-types** - List available metric types in Google Cloud Monitoring
* **spanner-query-count** - Get query count metrics for Spanner databases

For detailed information about each tool, use the MCP protocol's tool discovery mechanism.
`,
        },
      ],
    };
  });

  // Register service-specific resource lists
  server.resource("spanner-resources", "resources://spanner", async (uri) => {
    return {
      contents: [
        {
          uri: uri.href,
          text: `# Google Cloud Spanner Resources

This page lists all available resources for working with Google Cloud Spanner.

## Resource Hierarchy

### Step 1: List Instances
* **Spanner Instances** - \`gcp-spanner://${projectId}/instances\`
  List all Spanner instances in the project
  
### Step 2: List Databases (after finding an instance ID)
* **Spanner Databases** - \`gcp-spanner://${projectId}/[instance-id]/databases\`
  Example: \`gcp-spanner://${projectId}/test-instance/databases\`
  
### Step 3: List Tables (after finding a database ID)
* **Spanner Tables** - \`gcp-spanner://${projectId}/[instance-id]/[database-id]/tables\`
  Example: \`gcp-spanner://${projectId}/test-instance/my-database/tables\`
  
### Step 4: View Schema
* **Spanner Schema** - \`gcp-spanner://${projectId}/[instance-id]/[database-id]/schema\`
  Example: \`gcp-spanner://${projectId}/test-instance/my-database/schema\`
  
### Step 5: Preview Table Data (after finding a table name)
* **Table Preview** - \`gcp-spanner://${projectId}/[instance-id]/[database-id]/tables/[table-name]/preview\`
  Example: \`gcp-spanner://${projectId}/test-instance/my-database/tables/users/preview\`

## Available Tools

* **natural-language-spanner-query** - Query Spanner using natural language
* **execute-spanner-query** - Execute SQL queries against Spanner databases
* **list-spanner-tables** - List tables in a Spanner database
* **list-spanner-instances** - List Spanner instances in the project
* **list-spanner-databases** - List databases in a Spanner instance
* **spanner-query-count** - Get query count metrics for Spanner databases

## Usage Example

1. **Start by listing all instances**: \`gcp-spanner://${projectId}/instances\`
   This will show you the actual instance IDs available in your project.

2. **Select an instance and list its databases**: 
   After finding an instance ID (e.g., 'test-instance') from step 1, access:
   \`gcp-spanner://${projectId}/test-instance/databases\`

3. **Select a database and list its tables**: 
   After finding a database ID (e.g., 'my-database') from step 2, access:
   \`gcp-spanner://${projectId}/test-instance/my-database/tables\`

4. **View the schema**: 
   \`gcp-spanner://${projectId}/test-instance/my-database/schema\`

5. **Preview table data**: 
   After finding a table name (e.g., 'users') from step 3, access:
   \`gcp-spanner://${projectId}/test-instance/my-database/tables/users/preview\`

6. **Execute queries** using the execute-spanner-query tool

**Note**: Replace 'test-instance', 'my-database', and 'users' with your actual instance ID, database ID, and table name from the previous steps.
`,
        },
      ],
    };
  });

  server.resource("logging-resources", "resources://logging", async (uri) => {
    return {
      contents: [
        {
          uri: uri.href,
          text: `# Google Cloud Logging Resources

This page lists all available resources for working with Google Cloud Logging.

## Available Resources

* **Recent Logs** - \`gcp-logs://${projectId}/recent\`
  View recent log entries from Google Cloud Logging

* **Filtered Logs** - \`gcp-logs://${projectId}/filter/{filter}\`
  View log entries matching a specific filter

## Usage Tips

1. Start with recent logs to see the latest activity
2. Use filters to narrow down to specific log entries
3. Filter syntax follows Google Cloud Logging filter syntax
`,
        },
      ],
    };
  });

  server.resource(
    "monitoring-resources",
    "resources://monitoring",
    async (uri) => {
      return {
        contents: [
          {
            uri: uri.href,
            text: `# Google Cloud Monitoring Resources

This page lists all available resources for working with Google Cloud Monitoring.

## Available Resources

* **Recent Metrics** - \`gcp-monitoring://${projectId}/recent\`
  View recent metrics from Google Cloud Monitoring

* **Filtered Metrics** - \`gcp-monitoring://${projectId}/filter/{filter}\`
  View metrics matching a specific filter

* **Metric Types** - \`gcp-monitoring://${projectId}/metric-types\`
  List available metric types

## Available Tools

* **list-metric-types** - List available metric types in Google Cloud Monitoring
* **spanner-query-count** - Get query count metrics for Spanner databases

## Usage Tips

1. Start by exploring available metric types
2. Use filters to narrow down to specific metrics
3. Use the spanner-query-count tool for detailed Spanner metrics
`,
          },
        ],
      };
    },
  );
}
