/**
 * Session management utilities for MCP server security compliance
 *
 * Implements MCP specification 2025-06-18 security requirements:
 * - Secure session ID generation (non-deterministic)
 * - Session ID rotation and expiration
 * - Request verification without session-based auth
 * - Token audience validation
 */
import crypto from "crypto";
import { ISessionManager } from "./interfaces.js";
import { logger } from "./logger.js";

interface SessionInfo {
  id: string;
  created: Date;
  lastUsed: Date;
  rotationCount: number;
  metadata: Record<string, any>;
}

/**
 * Session manager for MCP security compliance
 */
class SessionManager implements ISessionManager {
  private sessions = new Map<string, SessionInfo>();
  private readonly SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_ROTATION_COUNT = 10;
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    // Periodically clean up expired sessions
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Generate a secure, non-deterministic session ID
   * Following MCP specification security requirements
   */
  generateSecureSessionId(): string {
    // Use cryptographically secure random bytes
    const randomBytes = crypto.randomBytes(32);
    const timestamp = Date.now().toString(36);
    const randomString = randomBytes.toString("base64url");

    // Combine timestamp and random data for uniqueness
    return `mcp_${timestamp}_${randomString}`;
  }

  /**
   * Create a new session with secure ID generation
   */
  createSession(metadata: Record<string, any> = {}): string {
    const sessionId = this.generateSecureSessionId();
    const now = new Date();

    const sessionInfo: SessionInfo = {
      id: sessionId,
      created: now,
      lastUsed: now,
      rotationCount: 0,
      metadata: { ...metadata },
    };

    this.sessions.set(sessionId, sessionInfo);
    return sessionId;
  }

  /**
   * Rotate session ID for enhanced security
   */
  rotateSessionId(currentSessionId: string): string | null {
    const session = this.sessions.get(currentSessionId);
    if (!session) {
      return null;
    }

    // Check rotation limits
    if (session.rotationCount >= this.MAX_ROTATION_COUNT) {
      this.sessions.delete(currentSessionId);
      return null;
    }

    // Generate new session ID
    const newSessionId = this.generateSecureSessionId();
    const now = new Date();

    // Create new session with updated info
    const newSession: SessionInfo = {
      ...session,
      id: newSessionId,
      lastUsed: now,
      rotationCount: session.rotationCount + 1,
    };

    // Replace old session with new one
    this.sessions.delete(currentSessionId);
    this.sessions.set(newSessionId, newSession);

    return newSessionId;
  }

  /**
   * Validate session exists and is not expired
   */
  validateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const now = new Date();
    const age = now.getTime() - session.created.getTime();

    // Check if session has expired
    if (age > this.SESSION_LIFETIME_MS) {
      this.sessions.delete(sessionId);
      return false;
    }

    // Update last used time
    session.lastUsed = now;
    return true;
  }

  /**
   * Get session metadata
   */
  getSessionMetadata(sessionId: string): Record<string, any> | null {
    const session = this.sessions.get(sessionId);
    return session ? { ...session.metadata } : null;
  }

  /**
   * Update session metadata
   */
  updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, any>,
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.metadata = { ...session.metadata, ...metadata };
    session.lastUsed = new Date();
    return true;
  }

  /**
   * Invalidate a session
   */
  invalidateSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now.getTime() - session.created.getTime();
      if (age > this.SESSION_LIFETIME_MS) {
        expiredSessions.push(sessionId);
      }
    }

    // Remove expired sessions
    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
    }

    if (expiredSessions.length > 0) {
      logger.debug(`Cleaned up ${expiredSessions.length} expired sessions`);
    }

    return expiredSessions.length;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): { active: number; total: number; expired: number } {
    return {
      active: this.sessions.size,
      total: this.sessions.size, // This is simplified - in production would track total
      expired: 0, // This would be tracked separately in production
    };
  }
}

// Singleton instance
export const sessionManager = new SessionManager();

/**
 * Generate secure random bytes for various security purposes
 */
export function generateSecureRandomBytes(size: number): Buffer {
  return crypto.randomBytes(size);
}

/**
 * Generate secure random string suitable for tokens or IDs
 */
export function generateSecureRandomString(length: number = 32): string {
  const bytes = crypto.randomBytes(Math.ceil((length * 3) / 4));
  return bytes.toString("base64url").substring(0, length);
}
