/**
 * Type definitions for Colyseus room connections
 */

export interface RoomOptions {
  name: string;
  playerId: string;  // The actual player ID (wallet address)
  worldOwnerId?: string;  // The world owner ID (only for 'world' rooms)
}

export interface WelcomeMessage {
  message: string;
  playerId: string;  // The actual player ID
  sessionId: string;  // The Colyseus session ID
  isHost: boolean;
  worldOwnerId: string;
  worldOwnerName: string;
}