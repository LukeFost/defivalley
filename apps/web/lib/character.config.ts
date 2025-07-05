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
  // For characters with directional rotation frames
  rotationFrames?: Record<Direction, number>;
}

// Animation preset type with optional rotation frames
interface AnimationPreset {
  frameWidth: number;
  frameHeight: number;
  scale: number;
  basePath: string;
  animations: Record<string, { frames: number; frameRate: number; file: string }>;
  rotationFrames?: Record<Direction, number>;
}

// Animation preset configurations for DRY principle
const ANIMATION_PRESETS: Record<string, AnimationPreset> = {
  cowboy: {
    frameWidth: 80,
    frameHeight: 102,
    scale: 0.5,
    basePath: '/sprites/Cowboy',
    animations: {
      idle: { frames: 1, frameRate: 1, file: 'Walk_Cycle_Cowboy.png' }, // Frame 0 only - idle pose
      walk: { frames: 11, frameRate: 12, file: 'Walk_Cycle_Cowboy.png' }, // All 11 frames - complete walk cycle
      run: { frames: 11, frameRate: 16, file: 'Walk_Cycle_Cowboy.png' }, // All 11 frames - faster walk cycle
      // Rotation sprite sheet for directional facing (5 frames: left, left-front, front, right-front, right)
      rotate: { frames: 5, frameRate: 1, file: 'Rotation_Cycle_Cowboy.png' }, // Static directional frames
    },
    // Add directional frame mapping for rotation sprite
    rotationFrames: {
      left: 0,      // Frame 0: facing left
      down: 2,      // Frame 2: facing forward/down
      right: 4,     // Frame 4: facing right
      up: 2,        // Frame 2: facing forward (no back view, use front)
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

// Helper function to create character configuration from presets
function createCharacterConfig(name: string, preset: keyof typeof ANIMATION_PRESETS): CharacterConfiguration {
  const config = ANIMATION_PRESETS[preset];
  return {
    key: name,
    frameWidth: config.frameWidth,
    frameHeight: config.frameHeight,
    scale: config.scale,
    type: 'animation_sheets',
    animationConfig: createAnimationConfig(preset),
    rotationFrames: config.rotationFrames,
  };
}

// Character definitions using the new configuration system
export const CharacterDefinitions: Record<string, CharacterConfiguration> = {
  cowboy: createCharacterConfig('cowboy', 'cowboy'),
};

// Legacy config for backward compatibility
export const CharacterConfig = {
  player: {
    key: 'player_characters',
    path: '/sprites/Cowboy/Walk_Cycle_Cowboy.png',
    frameWidth: 80,
    frameHeight: 102,
    directions: {
      down: 0,
      left: 1,
      right: 2,
      up: 3,
    },
    framesPerCharacter: 11,
    characters: {
      cowboy: 0,
    },
  },
  cowboy: {
    key: 'cowboy_character',
    path: '/sprites/Cowboy/Rotation_Cycle_Cowboy.png',
    frameWidth: 80,
    frameHeight: 102,
    directions: {
      down: 2,  // Use frame 2 (front-facing) for down
      left: 0,  // Use frame 0 (left-facing) for left
      right: 4, // Use frame 4 (right-facing) for right
      up: 2,    // Use frame 2 (front-facing) for up (no back view)
    },
    framesPerCharacter: 5,
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

// Helper function to get directional frame for characters with rotation sprites
export function getDirectionalFrame(character: CharacterType, direction: Direction): number | null {
  const config = getCharacterConfig(character);
  if (config.rotationFrames) {
    return config.rotationFrames[direction] ?? null;
  }
  return null;
}

// Helper function to check if character has directional rotation frames
export function hasRotationFrames(character: CharacterType): boolean {
  const config = getCharacterConfig(character);
  return config.rotationFrames !== undefined;
}

// Helper function to get rotation animation key for character
export function getRotationAnimationKey(character: CharacterType): string {
  return `${character}_rotate`;
}

// Helper function to add new character easily
export function addCharacter(
  name: string,
  preset: keyof typeof ANIMATION_PRESETS
): CharacterConfiguration {
  return createCharacterConfig(name, preset);
}