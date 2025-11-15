# Google Cloud MCP Integration

Integration of the Google Cloud MCP server for monitoring and managing the Mental Journal pipeline.

## Setup

### 1. Authentication
Already configured with:
```bash
gcloud auth application-default login
```

Credentials stored at: `~/.config/gcloud/application_default_credentials.json`

### 2. MCP Server Location
Installed at: `vendor/google-cloud-mcp/`

### 3. Configuration for Claude Desktop

Copy `mcp-config.json` content to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "google-cloud-mcp": {
      "command": "node",
      "args": [
        "/home/rqbin/Documents/GCPU-Hackathon/vertex/vendor/google-cloud-mcp/dist/index.js"
      ],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/home/rqbin/.config/gcloud/application_default_credentials.json",
        "GOOGLE_CLOUD_PROJECT": "build-unicorn25par-4813"
      }
    }
  }
}
```

## Available Tools

### Logging
- `gcp-logging-query-logs` - Query Cloud Run Job logs
- `gcp-logging-search-comprehensive` - Search for specific errors/patterns

**Example prompts:**
```
"Show me logs from build-unicorn25par-4813 Cloud Run job from the last hour"
"Search for logs containing 'Gemini' from mj-weekly-pipeline"
"Find errors in project build-unicorn25par-4813 yesterday"
```

### Billing
- `gcp-billing-analyse-costs` - Analyze costs by service
- `gcp-billing-detect-anomalies` - Detect unusual spending patterns
- `gcp-billing-cost-recommendations` - Get optimization recommendations

**Example prompts:**
```
"Analyse costs for build-unicorn25par-4813 for the last 30 days"
"Detect billing anomalies in project build-unicorn25par-4813"
"Generate cost recommendations for Speech-to-Text and Gemini APIs"
```

### Monitoring
- `gcp-monitoring-query-metrics` - Get Cloud Run metrics
- `gcp-monitoring-query-natural-language` - Natural language metric queries

**Example prompts:**
```
"Show CPU utilisation for mj-weekly-pipeline for the last 6 hours"
"Query memory usage for Cloud Run job in build-unicorn25par-4813"
```

### IAM
- `gcp-iam-get-project-policy` - View IAM policies
- `gcp-iam-test-project-permissions` - Test user permissions
- `gcp-iam-validate-deployment-permissions` - Check deployment readiness

**Example prompts:**
```
"Get IAM policy for build-unicorn25par-4813"
"Test if zpro4@outlook.com has Cloud Run permissions"
"Check deployment permissions for Cloud Run in build-unicorn25par-4813"
```

### Error Reporting
- `gcp-error-reporting-list-groups` - List error groups
- `gcp-error-reporting-analyse-trends` - Analyze error patterns

**Example prompts:**
```
"Show error groups from build-unicorn25par-4813 for the last 24 hours"
"Analyse error trends for mj-weekly-pipeline"
```

## Testing the Server

### With MCP Inspector
```bash
cd vendor/google-cloud-mcp
npx @modelcontextprotocol/inspector node dist/index.js
```

Then open http://localhost:5173 to test tools interactively.

### Test Queries

1. **Get recent logs:**
```
Query logs from build-unicorn25par-4813 Cloud Run job for the last hour
```

2. **Check costs:**
```
Analyse costs for build-unicorn25par-4813 for the last 7 days
```

3. **View permissions:**
```
Get IAM policy for project build-unicorn25par-4813
```

## Use Cases for Mental Journal

### Development
- Debug pipeline failures without opening GCP console
- Monitor Gemini API costs in real-time
- Check user permissions for collaborators

### Production
- Track weekly job execution status
- Detect cost anomalies (unexpected Gemini usage)
- Monitor STT/Gemini latency

### Optimization
- Identify performance bottlenecks
- Get cost reduction recommendations
- Analyze error patterns for improvements

## Troubleshooting

### Authentication Errors
If you get auth errors:
```bash
# Re-authenticate
gcloud auth application-default login

# Verify credentials
gcloud auth application-default print-access-token
```

### Server Won't Start
```bash
# Rebuild the server
cd vendor/google-cloud-mcp
npm run build
```

### Missing Permissions
Ensure your GCP account has:
- `roles/viewer` - Read project resources
- `roles/logging.viewer` - Read logs
- `roles/monitoring.viewer` - Read metrics
- `roles/billing.viewer` - Read billing data
