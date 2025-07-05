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
} as const;

export type CharacterType = keyof typeof CharacterConfig.player.characters;
export type Direction = keyof typeof CharacterConfig.player.directions;