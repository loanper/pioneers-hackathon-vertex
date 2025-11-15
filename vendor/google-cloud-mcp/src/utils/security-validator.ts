/**
 * Security validation utilities for MCP server
 *
 * Implements security validation separate from transport concerns
 * Following Single Responsibility Principle
 */
import { SecurityValidator } from "./interfaces.js";
import { logger } from "./logger.js";

/**
 * Security validator implementation for MCP compliance
 */
export class McpSecurityValidator implements SecurityValidator {
  private allowedOrigins: string[];

  constructor(
    allowedOrigins: string[] = ["http://localhost", "https://localhost"],
  ) {
    this.allowedOrigins = allowedOrigins;
  }

  /**
   * Validate Origin header to prevent DNS rebinding attacks
   * MCP specification requirement
   */
  validateOriginHeader(origin?: string): boolean {
    if (!origin) {
      // Allow requests without origin (like from MCP clients)
      return true;
    }

    // Check against allowed origins
    return this.allowedOrigins.some((allowed) => origin.startsWith(allowed));
  }

  /**
   * Set comprehensive security headers for HTTP responses
   */
  setSecurityHeaders(res: any): void {
    // Prevent MIME type sniffing attacks
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Prevent clickjacking attacks
    res.setHeader("X-Frame-Options", "DENY");

    // Legacy XSS protection (deprecated but still widely supported)
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Enforce HTTPS for 1 year including subdomains
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );

    // Content Security Policy - restrictive for MCP server
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'none'; style-src 'none'; img-src 'none'; font-src 'none'; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; frame-ancestors 'none'; form-action 'none'; upgrade-insecure-requests; block-all-mixed-content",
    );

    // Referrer policy for privacy
    res.setHeader("Referrer-Policy", "no-referrer");

    // Permissions policy to disable dangerous features
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), autoplay=(), encrypted-media=(), fullscreen=(), picture-in-picture=(), sync-xhr=()",
    );

    // Cross-Origin policies for isolation
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

    // Cache control for security-sensitive responses
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Server identification headers removal for security through obscurity
    res.removeHeader("X-Powered-By");
    res.removeHeader("Server");
  }

  /**
   * Update allowed origins
   */
  setAllowedOrigins(origins: string[]): void {
    this.allowedOrigins = [...origins];
  }

  /**
   * Get current allowed origins
   */
  getAllowedOrigins(): string[] {
    return [...this.allowedOrigins];
  }

  /**
   * Validate request headers for security compliance
   */
  validateRequestHeaders(
    headers: Record<string, string | string[] | undefined>,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for suspicious headers
    const suspiciousHeaders = [
      "x-forwarded-for",
      "x-real-ip",
      "x-forwarded-host",
    ];
    for (const header of suspiciousHeaders) {
      if (headers[header]) {
        errors.push(`Suspicious header detected: ${header}`);
      }
    }

    // Validate User-Agent
    const userAgent = headers["user-agent"];
    if (userAgent && typeof userAgent === "string") {
      // Block known malicious user agents or automated tools
      const blockedPatterns = [
        /sqlmap/i,
        /nmap/i,
        /nikto/i,
        /curl.*bot/i,
        /wget.*bot/i,
      ];

      for (const pattern of blockedPatterns) {
        if (pattern.test(userAgent)) {
          errors.push(`Blocked user agent pattern: ${userAgent}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Rate limiting check (simple implementation)
   */
  checkRateLimit(clientId: string): { allowed: boolean; retryAfter?: number } {
    // This is a simplified implementation
    // In production, use Redis or similar for distributed rate limiting
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxRequests = 100; // 100 requests per minute

    // For now, always allow (implement proper rate limiting in production)
    return { allowed: true };
  }

  /**
   * Sanitise input to prevent injection attacks
   */
  sanitiseInput(input: string): string {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>'"&]/g, "") // Basic XSS prevention
      .replace(/[\x00-\x1f\x7f-\x9f]/g, "") // Remove control characters
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate JSON-RPC method names for security
   */
  validateMethodName(method: string): boolean {
    // Only allow alphanumeric characters, hyphens, and underscores
    const validMethodPattern = /^[a-zA-Z0-9_-]+$/;

    // Block dangerous method patterns
    const blockedPatterns = [/^rpc\./i, /^system\./i, /eval/i, /exec/i, /cmd/i];

    if (!validMethodPattern.test(method)) {
      return false;
    }

    for (const pattern of blockedPatterns) {
      if (pattern.test(method)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Log security events for audit trail
   */
  logSecurityEvent(
    event: string,
    details: Record<string, any>,
    severity: "low" | "medium" | "high" | "critical" = "medium",
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details: {
        ...details,
        userAgent: details.userAgent
          ? this.sanitiseInput(details.userAgent)
          : undefined,
        clientIp: details.clientIp
          ? this.sanitiseInput(details.clientIp)
          : undefined,
      },
    };

    // In production, send to SIEM or security monitoring system
    logger.error(
      `[SECURITY-${severity.toUpperCase()}] ${JSON.stringify(logEntry)}`,
    );
  }
}

// Export default instance
export const securityValidator = new McpSecurityValidator();
