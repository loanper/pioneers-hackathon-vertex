/**
 * Logger utility for the Google Cloud MCP server
 */
import winston from "winston";
import crypto from "crypto";

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string | Error): void;
}

// Log correlation ID for tracking requests across services
let correlationId: string = generateCorrelationId();

/**
 * Generate a unique correlation ID for log tracing
 */
function generateCorrelationId(): string {
  return `mcp-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

/**
 * Enhanced logger implementation using Winston with structured logging
 * Writes to stderr to avoid interfering with MCP protocol communication on stdout
 */
class StructuredLogger implements Logger {
  private winston: winston.Logger;

  constructor() {
    const logLevel = process.env.LOG_LEVEL || "info";
    const isDevelopment = process.env.NODE_ENV !== "production";

    // Create Winston logger with appropriate format
    this.winston = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
        winston.format.errors({ stack: true }),
        isDevelopment
          ? winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(
                ({
                  timestamp,
                  level,
                  message,
                  correlationId: cId,
                  service,
                  operation,
                  ...meta
                }) => {
                  const corrId = cId || correlationId;
                  const svc = service || "mcp-server";
                  const op = operation ? `[${operation}]` : "";
                  const metaStr =
                    Object.keys(meta).length > 0
                      ? ` ${JSON.stringify(meta)}`
                      : "";
                  return `[${timestamp}] ${level} [${svc}] ${op} [${corrId}] ${message}${metaStr}`;
                },
              ),
            )
          : winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          stderrLevels: ["error", "warn", "info", "debug"], // All levels to stderr for MCP compatibility
        }),
      ],
    });
  }

  debug(message: string): void {
    this.winston.debug(message, { correlationId });
  }

  info(message: string): void {
    this.winston.info(message, { correlationId });
  }

  warn(message: string): void {
    this.winston.warn(message, { correlationId });
  }

  error(message: string | Error): void {
    if (message instanceof Error) {
      this.winston.error(message.message, {
        correlationId,
        error: {
          name: message.name,
          message: message.message,
          stack: message.stack,
        },
      });
    } else {
      this.winston.error(message, { correlationId });
    }
  }

  /**
   * Set correlation ID for current operation
   */
  setCorrelationId(id: string): void {
    correlationId = id;
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string {
    return correlationId;
  }

  /**
   * Generate new correlation ID
   */
  newCorrelationId(): string {
    correlationId = generateCorrelationId();
    return correlationId;
  }

  /**
   * Log with additional context
   */
  logWithContext(
    level: string,
    message: string,
    context: Record<string, any> = {},
  ): void {
    this.winston.log(level, message, { correlationId, ...context });
  }

  /**
   * Log operation start
   */
  startOperation(operation: string, context: Record<string, any> = {}): string {
    const opCorrelationId = generateCorrelationId();
    this.winston.info(`Starting operation: ${operation}`, {
      correlationId: opCorrelationId,
      operation,
      operationPhase: "start",
      ...context,
    });
    return opCorrelationId;
  }

  /**
   * Log operation completion
   */
  endOperation(
    operation: string,
    startTime: number,
    opCorrelationId?: string,
    context: Record<string, any> = {},
  ): void {
    const duration = Date.now() - startTime;
    this.winston.info(`Completed operation: ${operation}`, {
      correlationId: opCorrelationId || correlationId,
      operation,
      operationPhase: "end",
      duration,
      ...context,
    });
  }

  /**
   * Log audit events
   */
  audit(
    action: string,
    resource: string,
    context: Record<string, any> = {},
  ): void {
    this.winston.info(`Audit: ${action}`, {
      correlationId,
      audit: {
        action,
        resource,
        timestamp: new Date().toISOString(),
      },
      ...context,
    });
  }
}

// Export a singleton instance of the enhanced logger
export const logger = new StructuredLogger();
