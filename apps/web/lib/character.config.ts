// Direction type definition
export type Direction = 'down' | 'left' | 'right' | 'up';

// Base interface for character configuration
export interface CharacterConfiguration {
  key: string;
  frameWidth: number;
  frameHeight: number;
  scale?: number;
  type: 'spritesheet' | 'animation_sheets';
  // For spritesheet type (like RPG characters)
  spritesheetConfig?: {
    path: string;
    directions: Record<Direction, number>;
    framesPerCharacter: number;
    characterIndex: number;
  };
  // For animation sheets type (like knight)
  animationConfig?: {
    animations: Record<string, {
      key: string;
      path: string;
      frames: number;
      frameRate: number;
      repeat: boolean;
    }>;
  };
}

// Character definitions using the new configuration system
export const CharacterDefinitions: Record<string, CharacterConfiguration> = {
  warrior: {
    key: 'warrior',
    frameWidth: 32,
    frameHeight: 32,
    scale: 1,
    type: 'spritesheet',
    spritesheetConfig: {
      path: '/sprites/RPGCharacterSprites32x32.png',
      directions: { down: 0, left: 1, right: 2, up: 3 },
      framesPerCharacter: 4,
      characterIndex: 0,
    },
  },
  mage: {
    key: 'mage',
    frameWidth: 32,
    frameHeight: 32,
    scale: 1,
    type: 'spritesheet',
    spritesheetConfig: {
      path: '/sprites/RPGCharacterSprites32x32.png',
      directions: { down: 0, left: 1, right: 2, up: 3 },
      framesPerCharacter: 4,
      characterIndex: 1,
    },
  },
  archer: {
    key: 'archer',
    frameWidth: 32,
    frameHeight: 32,
    scale: 1,
    type: 'spritesheet',
    spritesheetConfig: {
      path: '/sprites/RPGCharacterSprites32x32.png',
      directions: { down: 0, left: 1, right: 2, up: 3 },
      framesPerCharacter: 4,
      characterIndex: 2,
    },
  },
  rogue: {
    key: 'rogue',
    frameWidth: 32,
    frameHeight: 32,
    scale: 1,
    type: 'spritesheet',
    spritesheetConfig: {
      path: '/sprites/RPGCharacterSprites32x32.png',
      directions: { down: 0, left: 1, right: 2, up: 3 },
      framesPerCharacter: 4,
      characterIndex: 3,
    },
  },
  paladin: {
    key: 'paladin',
    frameWidth: 32,
    frameHeight: 32,
    scale: 1,
    type: 'spritesheet',
    spritesheetConfig: {
      path: '/sprites/RPGCharacterSprites32x32.png',
      directions: { down: 0, left: 1, right: 2, up: 3 },
      framesPerCharacter: 4,
      characterIndex: 4,
    },
  },
  priest: {
    key: 'priest',
    frameWidth: 32,
    frameHeight: 32,
    scale: 1,
    type: 'spritesheet',
    spritesheetConfig: {
      path: '/sprites/RPGCharacterSprites32x32.png',
      directions: { down: 0, left: 1, right: 2, up: 3 },
      framesPerCharacter: 4,
      characterIndex: 5,
    },
  },
  necromancer: {
    key: 'necromancer',
    frameWidth: 32,
    frameHeight: 32,
    scale: 1,
    type: 'spritesheet',
    spritesheetConfig: {
      path: '/sprites/RPGCharacterSprites32x32.png',
      directions: { down: 0, left: 1, right: 2, up: 3 },
      framesPerCharacter: 4,
      characterIndex: 6,
    },
  },
  berserker: {
    key: 'berserker',
    frameWidth: 32,
    frameHeight: 32,
    scale: 1,
    type: 'spritesheet',
    spritesheetConfig: {
      path: '/sprites/RPGCharacterSprites32x32.png',
      directions: { down: 0, left: 1, right: 2, up: 3 },
      framesPerCharacter: 4,
      characterIndex: 7,
    },
  },
  knight: {
    key: 'knight',
    frameWidth: 120,
    frameHeight: 80,
    scale: 0.4,
    type: 'animation_sheets',
    animationConfig: {
      animations: {
        idle: {
          key: 'knight_idle',
          path: '/sprites/FreeKnight_v1/Colour1/Outline/120x80_PNGSheets/_Idle.png',
          frames: 10,
          frameRate: 8,
          repeat: true,
        },
        walk: {
          key: 'knight_run',
          path: '/sprites/FreeKnight_v1/Colour1/Outline/120x80_PNGSheets/_Run.png',
          frames: 10,
          frameRate: 12,
          repeat: true,
        },
        run: {
          key: 'knight_run',
          path: '/sprites/FreeKnight_v1/Colour1/Outline/120x80_PNGSheets/_Run.png',
          frames: 10,
          frameRate: 16,
          repeat: true,
        },
      },
    },
  },
};

// Legacy config for backward compatibility
export const CharacterConfig = {
  player: {
    key: 'player_characters',
    path: '/sprites/RPGCharacterSprites32x32.png',
    frameWidth: 32,
    frameHeight: 32,
    directions: {
      down: 0,
      left: 1,
      right: 2,
      up: 3,
    },
    framesPerCharacter: 4,
    characters: {
      warrior: 0,
      mage: 1,
      archer: 2,
      rogue: 3,
      paladin: 4,
      priest: 5,
      necromancer: 6,
      berserker: 7,
      knight: 8, // For backward compatibility
    },
  },
  knight: {
    key: 'knight_character',
    path: '/sprites/FreeKnight_v1/Colour1/Outline/120x80_PNGSheets/_Idle.png',
    frameWidth: 120,
    frameHeight: 80,
    directions: {
      down: 0,
      left: 1,
      right: 2,
      up: 3,
    },
    framesPerCharacter: 10,
  },
} as const;

export type CharacterType = keyof typeof CharacterDefinitions;

// Animation state type for characters that support animations
export type AnimationState = 'idle' | 'walk' | 'run';

// Helper function to get character configuration
export function getCharacterConfig(character: CharacterType): CharacterConfiguration {
  return CharacterDefinitions[character];
}

// Helper function to check if character supports animations
export function hasAnimations(character: CharacterType): boolean {
  return getCharacterConfig(character).type === 'animation_sheets';
}