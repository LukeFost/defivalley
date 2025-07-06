/**
 * Components Index
 * 
 * Centralized exports for all Phaser 3 game components
 */

export {
  CharacterPortrait,
  CharacterPortraitData,
  CharacterPortraitConfig,
  DEFAULT_PORTRAIT_CONFIG,
} from './CharacterPortrait';

export type {
  CharacterPortraitData as ICharacterPortraitData,
  CharacterPortraitConfig as ICharacterPortraitConfig,
} from './CharacterPortrait';

// Re-export example configurations for convenience
export {
  PORTRAIT_CONFIGS,
  NPC_PORTRAITS,
} from './CharacterPortrait.example';