/**
 * Transport manager for MCP server with SSE and HTTP support
 *
 * Implements MCP specification 2025-06-18 transport requirements:
 * - HTTP endpoint with POST and GET support
 * - SSE (Server-Sent Events) transport
 * - UTF-8 encoding for all JSON-RPC messages
 * - Support for application/json and text/event-stream content types
 * - Multiple simultaneous client connections
 * - Stdio transport backwards compatibility
 */
import http from "http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ISessionManager,
  ILogger,
  TransportConfig,
  SecurityValidator,
} from "./interfaces.js";

/**
 * Transport manager implementing MCP specification requirements with dependency injection
 */
export class TransportManager {
  private server: McpServer;
  private httpServer?: http.Server;
  private activeConnections = new Set<http.ServerResponse>();
  private config: TransportConfig;
  private logger: ILogger;
  private sessionManager: ISessionManager;
  private securityValidator: SecurityValidator;
  private eventIdCounter = 0;

  constructor(
    server: McpServer,
    sessionManager: ISessionManager,
    securityValidator: SecurityValidator,
    logger: ILogger,
    config: Partial<TransportConfig> = {},
  ) {
    this.server = server;
    this.sessionManager = sessionManager;
    this.securityValidator = securityValidator;
    this.logger = logger;
    this.config = {
      supportStdio: true,
      supportHttp: false, // Enable when needed
      supportSse: false, // Enable when needed
      httpPort: parseInt(process.env.MCP_HTTP_PORT || "3000"),
      httpHost: process.env.MCP_HTTP_HOST || "127.0.0.1", // Bind to localhost for security
      maxConnections: parseInt(process.env.MCP_MAX_CONNECTIONS || "10"),
      ...config,
    };
  }

  /**
   * Start the appropriate transport based on configuration
   */
  async startTransport(): Promise<void> {
    // Always support stdio transport for backwards compatibility
    if (this.config.supportStdio) {
      await this.startStdioTransport();
    }

    // Start HTTP/SSE transport if configured
    if (this.config.supportHttp || this.config.supportSse) {
      await this.startHttpTransport();
    }
  }

  /**
   * Start stdio transport (backwards compatibility)
   */
  private async startStdioTransport(): Promise<void> {
    this.logger.info("Starting stdio transport for backwards compatibility");
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info("Stdio transport started successfully");
  }

  /**
   * Start HTTP transport with SSE support
   */
  private async startHttpTransport(): Promise<void> {
    this.logger.info(
      `Starting HTTP transport on ${this.config.httpHost}:${this.config.httpPort}`,
    );

    this.httpServer = http.createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });

    // Set up connection tracking
    this.httpServer.on("connection", (socket) => {
      // Configure socket for security
      socket.setNoDelay(true);
      socket.setTimeout(30000); // 30 second timeout
    });

    return new Promise((resolve, reject) => {
      this.httpServer!.listen(
        this.config.httpPort,
        this.config.httpHost,
        () => {
          this.logger.info(
            `HTTP transport listening on ${this.config.httpHost}:${this.config.httpPort}`,
          );
          resolve();
        },
      );

      this.httpServer!.on("error", (error) => {
        this.logger.error(`HTTP transport error: ${error.message}`);
        reject(error);
      });
    });
  }

  /**
   * Handle HTTP requests with MCP protocol support
   */
  private async handleHttpRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const clientId = req.connection.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    try {
      // Security: Validate request headers for suspicious patterns
      const headerValidation = this.securityValidator.validateRequestHeaders(
        req.headers,
      );
      if (!headerValidation.valid) {
        this.securityValidator.logSecurityEvent(
          "suspicious_headers",
          {
            clientIp: clientId,
            userAgent,
            errors: headerValidation.errors,
            url: req.url,
          },
          "medium",
        );

        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Forbidden: Invalid request headers");
        return;
      }

      // Security: Rate limiting check
      const rateLimitCheck = this.securityValidator.checkRateLimit(clientId);
      if (!rateLimitCheck.allowed) {
        this.securityValidator.logSecurityEvent(
          "rate_limit_exceeded",
          {
            clientIp: clientId,
            userAgent,
            retryAfter: rateLimitCheck.retryAfter,
          },
          "medium",
        );

        res.writeHead(429, {
          "Content-Type": "text/plain",
          "Retry-After": rateLimitCheck.retryAfter?.toString() || "60",
        });
        res.end("Too Many Requests");
        return;
      }

      // Security: Validate Origin header to prevent DNS rebinding attacks
      const origin = req.headers.origin as string | undefined;
      if (!this.securityValidator.validateOriginHeader(origin)) {
        this.securityValidator.logSecurityEvent(
          "invalid_origin",
          {
            clientIp: clientId,
            userAgent,
            origin,
            url: req.url,
          },
          "high",
        );

        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Forbidden: Invalid origin");
        return;
      }

      // Check connection limits
      if (this.activeConnections.size >= this.config.maxConnections) {
        this.securityValidator.logSecurityEvent(
          "connection_limit_exceeded",
          {
            clientIp: clientId,
            userAgent,
            activeConnections: this.activeConnections.size,
            maxConnections: this.config.maxConnections,
          },
          "medium",
        );

        res.writeHead(503, { "Content-Type": "text/plain" });
        res.end("Service Unavailable: Too many connections");
        return;
      }

      // Add comprehensive security headers
      this.securityValidator.setSecurityHeaders(res);

      // Handle different HTTP methods
      if (req.method === "GET") {
        await this.handleGetRequest(req, res);
      } else if (req.method === "POST") {
        await this.handlePostRequest(req, res);
      } else if (req.method === "OPTIONS") {
        this.handleOptionsRequest(res);
      } else {
        res.writeHead(405, { "Content-Type": "text/plain" });
        res.end("Method Not Allowed");
      }
    } catch (error) {
      this.logger.error(
        `HTTP request error: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
    }
  }

  /**
   * Handle GET requests (typically for SSE connections)
   */
  private async handleGetRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (url.pathname === "/sse" && this.config.supportSse) {
      await this.handleSseConnection(req, res);
    } else if (url.pathname === "/health") {
      this.handleHealthCheck(res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  }

  /**
   * Handle POST requests (JSON-RPC messages) per MCP 2025-06-18 specification
   */
  private async handlePostRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    let body = "";
    const clientId = req.connection.remoteAddress || "unknown";

    // MCP Requirement: Validate Accept headers for SSE support
    const acceptHeader = req.headers.accept;
    const supportsJson = acceptHeader?.includes("application/json");
    const supportsEventStream = acceptHeader?.includes("text/event-stream");

    req.on("data", (chunk) => {
      body += chunk.toString("utf8"); // Ensure UTF-8 encoding per MCP spec
    });

    req.on("end", async () => {
      try {
        // Parse JSON-RPC message
        const message = JSON.parse(body);

        // Validate JSON-RPC format
        if (!this.isValidJsonRpc(message)) {
          this.securityValidator.logSecurityEvent(
            "invalid_jsonrpc",
            {
              clientIp: req.connection.remoteAddress,
              userAgent: req.headers["user-agent"],
              message:
                typeof message === "object"
                  ? JSON.stringify(message).substring(0, 200)
                  : "invalid",
            },
            "medium",
          );

          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: message.id || null,
              error: { code: -32600, message: "Invalid Request" },
            }),
          );
          return;
        }

        // Security: Validate method name
        if (
          message.method &&
          !this.securityValidator.validateMethodName(message.method)
        ) {
          this.securityValidator.logSecurityEvent(
            "dangerous_method",
            {
              clientIp: req.connection.remoteAddress,
              userAgent: req.headers["user-agent"],
              method: this.securityValidator.sanitiseInput(message.method),
            },
            "high",
          );

          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: message.id || null,
              error: { code: -32601, message: "Method not allowed" },
            }),
          );
          return;
        }

        // MCP 2025-06-18: Handle request vs notification/response differently
        if (message.method) {
          // This is a request - decide response format based on Accept headers and SSE support
          if (supportsEventStream && this.config.supportSse) {
            // Return SSE stream for requests when client supports it
            await this.handleSseResponse(req, res, message);
          } else {
            // Return single JSON response
            await this.handleJsonResponse(req, res, message);
          }
        } else {
          // This is a notification or response - always return HTTP 202
          res.writeHead(202, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ acknowledged: true }));
        }
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Parse error" },
          }),
        );
      }
    });
  }

  /**
   * Handle SSE response for JSON-RPC requests per MCP 2025-06-18
   */
  private async handleSseResponse(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    message: any,
  ): Promise<void> {
    // Set SSE headers per MCP specification
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*", // Configure based on security requirements
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    // Generate session for this SSE stream
    const sessionId = this.sessionManager.createSession({
      connectionType: "sse-request",
      clientAddress: req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
      requestId: message.id,
    });

    // Track this connection
    this.activeConnections.add(res);

    try {
      // TODO: Process the actual MCP request through the server
      // For now, simulate processing and send response

      // Send initial status
      this.sendSseEvent(res, "status", {
        message: "Processing request",
        requestId: message.id,
      });

      // Simulate some processing time
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send the actual response (this should be the real MCP response)
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          status: "completed",
          method: message.method,
          timestamp: new Date().toISOString(),
        },
      };

      // Send response with event ID for resumability
      const eventId = this.generateEventId();
      this.sendSseEvent(res, "response", response, eventId);

      // MCP 2025-06-18: Server should close stream after sending response
      res.end();
    } catch (error) {
      // Send error via SSE
      this.sendSseEvent(res, "error", {
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32603,
          message: "Internal error",
          data: error instanceof Error ? error.message : String(error),
        },
      });
      res.end();
    } finally {
      // Clean up
      this.activeConnections.delete(res);
      this.sessionManager.invalidateSession(sessionId);
    }
  }

  /**
   * Handle single JSON response for JSON-RPC requests
   */
  private async handleJsonResponse(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    message: any,
  ): Promise<void> {
    try {
      // TODO: Process the actual MCP request through the server
      // For now, return a placeholder response
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          status: "completed",
          method: message.method,
          timestamp: new Date().toISOString(),
        },
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(response));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32603,
            message: "Internal error",
            data: error instanceof Error ? error.message : String(error),
          },
        }),
      );
    }
  }

  /**
   * Send SSE event with proper formatting
   */
  private sendSseEvent(
    res: http.ServerResponse,
    event: string,
    data: any,
    id?: string,
  ): void {
    if (res.writableEnded) return;

    let message = "";
    if (id) {
      message += `id: ${id}\n`;
    }
    message += `event: ${event}\n`;
    message += `data: ${JSON.stringify(data)}\n\n`;

    res.write(message);
  }

  /**
   * Generate unique event ID for SSE stream resumability
   */
  private generateEventId(): string {
    return `${Date.now()}-${++this.eventIdCounter}`;
  }

  /**
   * Handle SSE connections for real-time communication (GET /sse endpoint)
   */
  private async handleSseConnection(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*", // Configure based on security requirements
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    // Generate session for this connection
    const sessionId = this.sessionManager.createSession({
      connectionType: "sse",
      clientAddress: req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
    });

    // Track this connection
    this.activeConnections.add(res);

    // Send initial connection message
    this.sendSseEvent(res, "connected", { sessionId });

    // Handle client disconnect
    req.on("close", () => {
      this.activeConnections.delete(res);
      this.sessionManager.invalidateSession(sessionId);
      this.logger.info(
        `SSE client disconnected, session ${sessionId} cleaned up`,
      );
    });

    // Send periodic heartbeat
    const heartbeat = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(heartbeat);
        return;
      }
      this.sendSseEvent(res, "heartbeat", { timestamp: Date.now() });
    }, 30000);

    // Clean up on disconnect
    req.on("close", () => {
      clearInterval(heartbeat);
    });
  }

  /**
   * Handle OPTIONS requests for CORS
   */
  private handleOptionsRequest(res: http.ServerResponse): void {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Origin",
      "Access-Control-Max-Age": "86400",
    });
    res.end();
  }

  /**
   * Handle health check requests
   */
  private handleHealthCheck(res: http.ServerResponse): void {
    const stats = this.sessionManager.getSessionStats();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        activeConnections: this.activeConnections.size,
        activeSessions: stats.active,
        transport: {
          stdio: this.config.supportStdio,
          http: this.config.supportHttp,
          sse: this.config.supportSse,
        },
      }),
    );
  }

  /**
   * Validate JSON-RPC message format
   */
  private isValidJsonRpc(message: any): boolean {
    return (
      typeof message === "object" &&
      message.jsonrpc === "2.0" &&
      typeof message.method === "string" &&
      (message.id === null ||
        typeof message.id === "string" ||
        typeof message.id === "number")
    );
  }

  /**
   * Gracefully shutdown all transports
   */
  async shutdown(): Promise<void> {
    this.logger.info("Shutting down transport manager");

    // Close all active SSE connections
    for (const connection of this.activeConnections) {
      if (!connection.writableEnded) {
        connection.end();
      }
    }
    this.activeConnections.clear();

    // Close HTTP server
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer!.close(() => {
          this.logger.info("HTTP transport shutdown complete");
          resolve();
        });
      });
    }
  }

  /**
   * Get transport statistics
   */
  getStats(): any {
    return {
      activeConnections: this.activeConnections.size,
      maxConnections: this.config.maxConnections,
      sessionStats: this.sessionManager.getSessionStats(),
      transports: {
        stdio: this.config.supportStdio,
        http: this.config.supportHttp,
        sse: this.config.supportSse,
      },
    };
  }
}
