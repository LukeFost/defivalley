import { Events } from 'phaser';

/**
 * Central event bus for React-Phaser communication
 * Provides a clean, decoupled way for React components to communicate with the Phaser game
 */
export const EventBus = new Events.EventEmitter();

// Type-safe event names
export const GameEvents = {
  SEED_SELECTED: 'seedSelected',
  CROP_PLANTED: 'cropPlanted',
  CROP_HARVESTED: 'cropHarvested',
  PLAYER_GOLD_UPDATED: 'playerGoldUpdated',
} as const;

export type GameEventType = typeof GameEvents[keyof typeof GameEvents];