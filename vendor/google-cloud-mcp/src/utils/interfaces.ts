/**
 * Interfaces for dependency inversion and SOLID principles compliance
 */

export interface ISessionManager {
  createSession(metadata?: Record<string, any>): string;
  validateSession(sessionId: string): boolean;
  invalidateSession(sessionId: string): boolean;
  rotateSessionId(sessionId: string): string | null;
  getSessionMetadata(sessionId: string): Record<string, any> | null;
  updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, any>,
  ): boolean;
  getSessionStats(): { active: number; total: number; expired: number };
  cleanupExpiredSessions(): number;
}

export interface ILogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string | Error): void;
}

export interface TransportConfig {
  supportStdio: boolean;
  supportHttp: boolean;
  supportSse: boolean;
  httpPort: number;
  httpHost: string;
  maxConnections: number;
}

export interface SecurityValidator {
  validateOriginHeader(origin?: string): boolean;
  setSecurityHeaders(res: any): void;
  validateRequestHeaders(
    headers: Record<string, string | string[] | undefined>,
  ): { valid: boolean; errors: string[] };
  checkRateLimit(clientId: string): { allowed: boolean; retryAfter?: number };
  sanitiseInput(input: string): string;
  validateMethodName(method: string): boolean;
  logSecurityEvent(
    event: string,
    details: Record<string, any>,
    severity?: "low" | "medium" | "high" | "critical",
  ): void;
}
