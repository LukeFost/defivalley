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

// Animation preset configurations for DRY principle
const ANIMATION_PRESETS = {
  knight: {
    frameWidth: 120,
    frameHeight: 80,
    scale: 0.8,
    basePath: '/sprites/FreeKnight_v1/Colour1/Outline/120x80_PNGSheets',
    animations: {
      idle: { frames: 10, frameRate: 8, file: '_Idle.png' },
      walk: { frames: 10, frameRate: 12, file: '_Run.png' },
      run: { frames: 10, frameRate: 16, file: '_Run.png' },
    },
  },
  cowboy: {
    frameWidth: 53,
    frameHeight: 115,
    scale: 0.5,
    basePath: '/sprites/Cowboy',
    animations: {
      idle: { frames: 6, frameRate: 4, file: 'Rotation_Cycle_Cowboy.png' },
      walk: { frames: 12, frameRate: 8, file: 'Walk_Cycle_Cowboy.png' },
      run: { frames: 12, frameRate: 12, file: 'Walk_Cycle_Cowboy.png' },
    },
  },
} as const;

// Helper function to create animation configuration from presets
function createAnimationConfig(preset: keyof typeof ANIMATION_PRESETS): CharacterConfiguration['animationConfig'] {
  const config = ANIMATION_PRESETS[preset];
  return {
    animations: Object.entries(config.animations).reduce((acc, [state, anim]) => {
      acc[state] = {
        key: `${preset}_${state}`,
        path: `${config.basePath}/${anim.file}`,
        frames: anim.frames,
        frameRate: anim.frameRate,
        repeat: true,
      };
      return acc;
    }, {} as Record<string, any>),
  };
}

// Character definitions using the new configuration system
export const CharacterDefinitions: Record<string, CharacterConfiguration> = {
  knight: {
    key: 'knight',
    frameWidth: ANIMATION_PRESETS.knight.frameWidth,
    frameHeight: ANIMATION_PRESETS.knight.frameHeight,
    scale: ANIMATION_PRESETS.knight.scale,
    type: 'animation_sheets',
    animationConfig: createAnimationConfig('knight'),
  },
  cowboy: {
    key: 'cowboy',
    frameWidth: ANIMATION_PRESETS.cowboy.frameWidth,
    frameHeight: ANIMATION_PRESETS.cowboy.frameHeight,
    scale: ANIMATION_PRESETS.cowboy.scale,
    type: 'animation_sheets',
    animationConfig: createAnimationConfig('cowboy'),
  },
};

// Legacy config for backward compatibility
export const CharacterConfig = {
  player: {
    key: 'player_characters',
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
    characters: {
      knight: 0,
      cowboy: 1,
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
  cowboy: {
    key: 'cowboy_character',
    path: '/sprites/Cowboy/Rotation_Cycle_Cowboy.png',
    frameWidth: 53,
    frameHeight: 115,
    directions: {
      down: 0,
      left: 1,
      right: 2,
      up: 3,
    },
    framesPerCharacter: 6,
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

// Helper function to get all animation states for a character
export function getAnimationStates(character: CharacterType): string[] {
  const config = getCharacterConfig(character);
  if (config.type === 'animation_sheets' && config.animationConfig) {
    return Object.keys(config.animationConfig.animations);
  }
  return [];
}

// Helper function to get animation key for a character and state
export function getAnimationKey(character: CharacterType, state: AnimationState): string {
  const config = getCharacterConfig(character);
  if (config.type === 'animation_sheets' && config.animationConfig) {
    const animation = config.animationConfig.animations[state];
    return animation ? animation.key : `${character}_idle`;
  }
  return `${character}_idle`;
}

// Helper function to add new character easily
export function addCharacter(
  name: string,
  preset: keyof typeof ANIMATION_PRESETS
): CharacterConfiguration {
  const presetConfig = ANIMATION_PRESETS[preset];
  return {
    key: name,
    frameWidth: presetConfig.frameWidth,
    frameHeight: presetConfig.frameHeight,
    scale: presetConfig.scale,
    type: 'animation_sheets',
    animationConfig: createAnimationConfig(preset),
  };
}