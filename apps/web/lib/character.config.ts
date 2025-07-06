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
    defaultState?: string; // Default animation state for this character
    animations: Record<string, {
      key: string;
      path: string;
      atlasPath?: string; // Optional: path to atlas JSON file for Texture Packer exports
      frames: number;
      frameRate: number;
      repeat: boolean;
      frameNames?: string[]; // Optional: specific frame names for atlas animations
    }>;
  };
  // For idle directional atlas
  idleAtlas?: {
    key: string;
    path: string;
    atlasPath: string;
    frameMap: Record<Direction, string>; // Maps directions to frame names
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
  animations: Record<string, { frames: number; frameRate: number; file: string; atlasFile?: string }>;
  idleAtlas?: {
    file: string;
    atlasFile: string;
    frameMap: Record<Direction, string>;
  };
  rotationFrames?: Record<Direction, number>;
}

// Animation preset configurations for DRY principle
const ANIMATION_PRESETS: Record<string, AnimationPreset> = {
  cowboy: {
    frameWidth: 128,
    frameHeight: 128,
    scale: 0.5,
    basePath: '/sprites/Cowboy',
    animations: {
      walk: { frames: 11, frameRate: 12, file: '_walk/walk.png', atlasFile: '_walk/walk.json' }, // New atlas-based walk cycle
      run: { frames: 11, frameRate: 16, file: '_walk/walk.png', atlasFile: '_walk/walk.json' }, // Same atlas, faster rate
      stomp: { frames: 10, frameRate: 10, file: '_stomp/stomp.png', atlasFile: '_stomp/stomp.json' }, // Error state stomp animation
      // Rotation sprite sheet for directional facing (5 frames: left, left-front, front, right-front, right)
      rotate: { frames: 5, frameRate: 1, file: '_rotate/rotate.png', atlasFile: '_rotate/rotate.json' }, // New atlas-based rotation frames
    },
    // Idle directional atlas
    idleAtlas: {
      file: '_idle/idle.png',
      atlasFile: '_idle/idle.json',
      frameMap: {
        left: 'West_idle.png',
        right: 'East_idle.png',
        up: 'North_idle.png',
        down: 'South_idle.png'
      }
    },
    // Add directional frame mapping for rotation sprite (0-indexed)
    rotationFrames: {
      right: 0,     // Frame 0: Untitled_Artwork-1.png - facing right
      down: 2,      // Frame 2: Untitled_Artwork-3.png - facing down
      left: 4,      // Frame 4: Untitled_Artwork-5.png - facing left
      up: 2,        // Frame 2: Untitled_Artwork-3.png - facing down (no back view, use front)
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

// Helper function to create animation configuration from presets
function createAnimationConfig(preset: keyof typeof ANIMATION_PRESETS): CharacterConfiguration['animationConfig'] {
  const config = ANIMATION_PRESETS[preset];
  return {
    defaultState: 'idle', // Explicitly set the default animation state
    animations: Object.entries(config.animations).reduce((acc, [state, anim]) => {
      acc[state] = {
        key: `${preset}_${state}`,
        path: `${config.basePath}/${anim.file}`,
        atlasPath: anim.atlasFile ? `${config.basePath}/${anim.atlasFile}` : undefined,
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
    idleAtlas: config.idleAtlas ? {
      key: `${preset}_idle`,
      path: `${config.basePath}/${config.idleAtlas.file}`,
      atlasPath: `${config.basePath}/${config.idleAtlas.atlasFile}`,
      frameMap: config.idleAtlas.frameMap
    } : undefined,
    rotationFrames: config.rotationFrames,
  };
}

// Character definitions using the new configuration system
export const CharacterDefinitions: Record<string, CharacterConfiguration> = {
  cowboy: createCharacterConfig('cowboy', 'cowboy'),
};


export type CharacterType = keyof typeof CharacterDefinitions;

// Animation state type for characters that support animations
export type AnimationState = 'idle' | 'walk' | 'run' | 'stomp';

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