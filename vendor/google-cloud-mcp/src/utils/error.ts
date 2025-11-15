/**
 * Error handling utilities
 */
import { logger } from "./logger.js";

/**
 * Custom error class for Google Cloud MCP server errors
 */
export class GcpMcpError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code = "INTERNAL_ERROR",
    statusCode = 500,
    details?: unknown,
  ) {
    super(message);
    this.name = "GcpMcpError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Formats an error into a consistent structure for MCP responses
 *
 * @param error The error to format
 * @returns A formatted error object
 */
export function formatError(error: unknown): {
  message: string;
  code: string;
  details?: unknown;
} {
  if (error instanceof GcpMcpError) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: "UNKNOWN_ERROR",
      details: error.stack,
    };
  }

  return {
    message: String(error),
    code: "UNKNOWN_ERROR",
  };
}

/**
 * Safely handles errors in async functions and returns a formatted error response
 *
 * @param fn The async function to execute
 * @returns A function that returns either the result or a formatted error
 */
export function safeAsync<T, A extends any[]>(
  fn: (...args: A) => Promise<T>,
): (...args: A) => Promise<T | { error: ReturnType<typeof formatError> }> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error(
        `Error in async operation: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { error: formatError(error) };
    }
  };
}
