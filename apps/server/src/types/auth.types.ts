/**
 * Authentication-related types for the game server
 */

export interface JoinOptions {
  name?: string;
  authToken?: string;
  playerId: string;  // The actual player ID (wallet address or similar)
  [key: string]: any;
}

export interface AuthenticatedClient {
  sessionId: string;
  playerId: string;  // The validated player ID
  isHost: boolean;
}