import { CharacterType, CharacterDefinitions, getCharacterConfig } from './character.config';

/**
 * CharacterFactory - Factory pattern for creating and managing character assets
 * Following KISS, DRY, and YAGNI principles
 */
export class CharacterFactory {
  private static loadedTextures = new Set<string>();
  private static createdAnimations = new Set<string>();

  /**
   * Preloads all character assets for the given character type
   */
  static preloadCharacter(scene: Phaser.Scene, character: CharacterType): void {
    const config = getCharacterConfig(character);
    
    if (config.type === 'spritesheet') {
      this.preloadSpritesheetCharacter(scene, character, config);
    } else if (config.type === 'animation_sheets') {
      this.preloadAnimationCharacter(scene, character, config);
    }
  }

  /**
   * Preloads all character assets for all characters
   */
  static preloadAllCharacters(scene: Phaser.Scene): void {
    Object.keys(CharacterDefinitions).forEach(character => {
      this.preloadCharacter(scene, character as CharacterType);
    });
  }

  /**
   * Creates character animations for animated characters
   */
  static createCharacterAnimations(scene: Phaser.Scene, character: CharacterType): void {
    const config = getCharacterConfig(character);
    
    if (config.type === 'animation_sheets' && config.animationConfig) {
      Object.entries(config.animationConfig.animations).forEach(([animName, animConfig]) => {
        const animKey = `${character}_${animName}`;
        
        if (!this.createdAnimations.has(animKey) && !scene.anims.exists(animKey)) {
          scene.anims.create({
            key: animKey,
            frames: scene.anims.generateFrameNumbers(animConfig.key, { 
              start: 0, 
              end: animConfig.frames - 1 
            }),
            frameRate: animConfig.frameRate,
            repeat: animConfig.repeat ? -1 : 0,
          });
          this.createdAnimations.add(animKey);
        }
      });
    }
  }

  /**
   * Creates all animations for all animated characters
   */
  static createAllAnimations(scene: Phaser.Scene): void {
    Object.keys(CharacterDefinitions).forEach(character => {
      this.createCharacterAnimations(scene, character as CharacterType);
    });
  }

  /**
   * Gets the appropriate texture key for a character
   */
  static getTextureKey(character: CharacterType): string {
    const config = getCharacterConfig(character);
    
    if (config.type === 'spritesheet') {
      return config.spritesheetConfig?.path.includes('RPG') ? 'player_characters' : config.key;
    } else if (config.type === 'animation_sheets') {
      // Return idle animation key for initial texture
      return config.animationConfig?.animations.idle.key || config.key;
    }
    
    return config.key;
  }

  /**
   * Gets character display information
   */
  static getCharacterInfo(character: CharacterType): {
    name: string;
    description: string;
    type: 'spritesheet' | 'animation_sheets';
    hasAnimations: boolean;
    scale: number;
  } {
    const config = getCharacterConfig(character);
    
    const characterInfo: Record<CharacterType, { name: string; description: string }> = {
      warrior: { name: 'Warrior', description: 'A brave fighter with sword and shield' },
      mage: { name: 'Mage', description: 'A wise spellcaster wielding magical powers' },
      archer: { name: 'Archer', description: 'A skilled ranger with bow and arrows' },
      rogue: { name: 'Rogue', description: 'A stealthy assassin with dual daggers' },
      paladin: { name: 'Paladin', description: 'A holy knight blessed with divine power' },
      priest: { name: 'Priest', description: 'A divine healer with sacred magic' },
      necromancer: { name: 'Necromancer', description: 'A dark sorcerer commanding undead' },
      berserker: { name: 'Berserker', description: 'A fierce warrior with uncontrolled rage' },
      knight: { name: 'Knight', description: 'A noble warrior with full armor and blade' },
    };

    const info = characterInfo[character];
    
    return {
      name: info.name,
      description: info.description,
      type: config.type,
      hasAnimations: config.type === 'animation_sheets',
      scale: config.scale || 1,
    };
  }

  /**
   * Validates if a character type is supported
   */
  static isValidCharacter(character: string): character is CharacterType {
    return character in CharacterDefinitions;
  }

  /**
   * Gets all available character types
   */
  static getAllCharacterTypes(): CharacterType[] {
    return Object.keys(CharacterDefinitions) as CharacterType[];
  }

  /**
   * Gets all animated character types
   */
  static getAnimatedCharacterTypes(): CharacterType[] {
    return this.getAllCharacterTypes().filter(char => 
      getCharacterConfig(char).type === 'animation_sheets'
    );
  }

  /**
   * Gets all spritesheet character types
   */
  static getSpritesheetCharacterTypes(): CharacterType[] {
    return this.getAllCharacterTypes().filter(char => 
      getCharacterConfig(char).type === 'spritesheet'
    );
  }

  // Private helper methods
  private static preloadSpritesheetCharacter(
    scene: Phaser.Scene, 
    character: CharacterType, 
    config: any
  ): void {
    const spritesheetConfig = config.spritesheetConfig;
    if (!spritesheetConfig) return;

    const textureKey = spritesheetConfig.path.includes('RPG') ? 'player_characters' : config.key;
    
    if (!this.loadedTextures.has(textureKey)) {
      scene.load.spritesheet(textureKey, spritesheetConfig.path, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      });
      this.loadedTextures.add(textureKey);
    }
  }

  private static preloadAnimationCharacter(
    scene: Phaser.Scene, 
    character: CharacterType, 
    config: any
  ): void {
    const animConfig = config.animationConfig;
    if (!animConfig) return;

    Object.entries(animConfig.animations).forEach(([animName, animData]: [string, any]) => {
      if (!this.loadedTextures.has(animData.key)) {
        scene.load.spritesheet(animData.key, animData.path, {
          frameWidth: config.frameWidth,
          frameHeight: config.frameHeight,
        });
        this.loadedTextures.add(animData.key);
      }
    });
  }
}