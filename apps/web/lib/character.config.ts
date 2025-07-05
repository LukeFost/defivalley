export const CharacterConfig = {
  player: {
    key: 'player_characters',
    path: '/sprites/RPGCharacterSprites32x32.png',
    frameWidth: 32,
    frameHeight: 32,
    // Frame indices for each direction within a character's block
    directions: {
      down: 0,
      left: 1,
      right: 2,
      up: 3,
    },
    framesPerCharacter: 4,
    // Character indices in the sprite sheet
    characters: {
      warrior: 0,
      mage: 1,
      archer: 2,
      rogue: 3,
      paladin: 4,
      priest: 5,
      necromancer: 6,
      berserker: 7,
    },
  },
  knight: {
    key: 'knight_character',
    idlePath: '/sprites/FreeKnight_v1/Colour1/Outline/120x80_PNGSheets/_Idle.png',
    runPath: '/sprites/FreeKnight_v1/Colour1/Outline/120x80_PNGSheets/_Run.png',
    frameWidth: 120,
    frameHeight: 80,
    // Knight sprite sheets have different frame counts
    idleFrames: 4,
    runFrames: 10,
    // Knight uses single animation states (not directional)
    directions: {
      down: 'idle',
      left: 'run',
      right: 'run',
      up: 'run',
    },
  },
} as const;

export type CharacterType = keyof typeof CharacterConfig.player.characters | 'knight';
export type Direction = keyof typeof CharacterConfig.player.directions;

// Helper function to determine if a character is a knight
export function isKnightCharacter(character: CharacterType): character is 'knight' {
  return character === 'knight';
}