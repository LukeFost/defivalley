/**
 * Validation utilities for input sanitization and security
 */

/**
 * Validates a world ID (player ID) to prevent SQL injection
 * World IDs should be alphanumeric with possible underscores or hyphens
 * This matches typical wallet addresses or user IDs
 */
export function isValidWorldId(worldId: string): boolean {
  if (!worldId || typeof worldId !== 'string') {
    return false;
  }
  
  // Allow alphanumeric, underscores, hyphens, and dots (for wallet addresses)
  // Limit length to prevent buffer overflow attacks
  const worldIdRegex = /^[a-zA-Z0-9._-]{1,100}$/;
  return worldIdRegex.test(worldId);
}

/**
 * Sanitizes a world ID for safe database usage
 * Returns null if invalid
 */
export function sanitizeWorldId(worldId: string): string | null {
  if (!isValidWorldId(worldId)) {
    return null;
  }
  return worldId.trim();
}

/**
 * Validates pagination parameters
 */
export function validatePagination(page?: string, limit?: string) {
  const pageNum = parseInt(page || '1', 10);
  const limitNum = parseInt(limit || '20', 10);
  
  return {
    page: Math.max(1, isNaN(pageNum) ? 1 : pageNum),
    limit: Math.min(100, Math.max(1, isNaN(limitNum) ? 20 : limitNum))
  };
}