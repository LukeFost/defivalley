/**
 * Database connection utility for web app
 * This module creates a separate DatabaseService instance for the web API routes
 */

import { DatabaseService } from '../../server/src/services/DatabaseService';
import path from 'path';

// Create a dedicated database service instance for web API
// This connects to the same database file that the game server uses
const webDatabaseService = new DatabaseService(
  path.join(process.cwd(), '..', 'server', 'defivalley.db')
);

// Export the web database service instance
export { webDatabaseService as databaseService };

// Re-export types for convenience
export type { Transaction } from '../../server/src/services/DatabaseService';