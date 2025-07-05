import crypto from 'crypto';

/**
 * Authentication utilities for secure player identification
 */

// Store authenticated sessions (in production, use Redis or similar)
const authenticatedSessions = new Map<string, { playerId: string; createdAt: number }>();

// Session timeout (1 hour)
const SESSION_TIMEOUT = 60 * 60 * 1000;

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create an authenticated session for a player
 */
export function createAuthSession(playerId: string): string {
  const token = generateSessionToken();
  authenticatedSessions.set(token, {
    playerId,
    createdAt: Date.now()
  });
  
  // Clean up old sessions periodically
  cleanupExpiredSessions();
  
  return token;
}

/**
 * Validate a session token and return the player ID
 */
export function validateSession(token: string): string | null {
  const session = authenticatedSessions.get(token);
  
  if (!session) {
    return null;
  }
  
  // Check if session has expired
  if (Date.now() - session.createdAt > SESSION_TIMEOUT) {
    authenticatedSessions.delete(token);
    return null;
  }
  
  return session.playerId;
}

/**
 * Remove expired sessions
 */
function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of authenticatedSessions.entries()) {
    if (now - session.createdAt > SESSION_TIMEOUT) {
      authenticatedSessions.delete(token);
    }
  }
}

/**
 * Hash a player ID for consistent but secure identification
 */
export function hashPlayerId(playerId: string): string {
  return crypto.createHash('sha256').update(playerId).digest('hex').substring(0, 16);
}

/**
 * Verify if a client has permission to perform actions in a world
 */
export function verifyWorldPermission(authToken: string, worldOwnerId: string): boolean {
  const playerId = validateSession(authToken);
  return playerId === worldOwnerId;
}