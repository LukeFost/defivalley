import { 
  CharacterConfig, 
  CharacterType, 
  Direction, 
  AnimationState,
  getCharacterConfig,
  hasAnimations,
  CharacterConfiguration
} from './character.config';

export interface PlayerInfo {
  id: string;
  name: string;
  x: number;
  y: number;
  character: CharacterType;
  direction: Direction;
  isCurrentPlayer: boolean;
  level?: number;
  xp?: number;
  animationState?: AnimationState;
  isMoving?: boolean;
}

export class Player extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private nameplate: Phaser.GameObjects.Text;
  private badge: Phaser.GameObjects.Text;
  private playerInfo: PlayerInfo;
  private characterConfig: CharacterConfiguration;
  private currentAnimation?: string;

  constructor(scene: Phaser.Scene, x: number, y: number, playerInfo: PlayerInfo) {
    super(scene, x, y);
    
    this.playerInfo = {
      ...playerInfo,
      animationState: playerInfo.animationState || 'idle',
      isMoving: playerInfo.isMoving || false,
    };
    
    // Get character configuration
    this.characterConfig = getCharacterConfig(this.playerInfo.character);
    
    // Create sprite based on character type
    this.sprite = this.createCharacterSprite(scene);
    
    // Create nameplate
    this.nameplate = scene.add.text(0, -40, playerInfo.name, {
      fontSize: '12px',
      color: playerInfo.isCurrentPlayer ? '#00ff00' : '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    });
    this.nameplate.setOrigin(0.5, 0.5);
    
    // Create level badge
    this.badge = scene.add.text(20, -20, `L${playerInfo.level || 1}`, {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#4a90e2',
      padding: { x: 3, y: 1 },
    });
    this.badge.setOrigin(0.5, 0.5);
    
    // Add elements to container
    this.add([this.sprite, this.nameplate, this.badge]);
    
    // Add container to scene
    scene.add.existing(this);
    
    // Set initial position
    this.setPosition(x, y);
    
    // Initialize sprite display
    this.updateSprite();
  }

  /**
   * Creates the appropriate sprite based on character configuration
   */
  private createCharacterSprite(scene: Phaser.Scene): Phaser.GameObjects.Sprite {
    if (this.characterConfig.type === 'animation_sheets') {
      // For animation-based characters (like knight), create with idle animation
      const idleAnim = this.characterConfig.animationConfig?.animations.idle;
      if (idleAnim) {
        return scene.add.sprite(0, 0, idleAnim.key);
      }
    }
    
    // For spritesheet-based characters or fallback
    const spritesheetConfig = this.characterConfig.spritesheetConfig;
    if (spritesheetConfig) {
      return scene.add.sprite(0, 0, 'player_characters');
    }
    
    // Legacy fallback
    return scene.add.sprite(0, 0, this.characterConfig.key);
  }

  /**
   * Updates the sprite display based on character type and current state
   */
  private updateSprite(): void {
    if (this.characterConfig.type === 'animation_sheets') {
      this.updateAnimatedSprite();
    } else {
      this.updateStaticSprite();
    }
    
    // Apply character-specific scaling
    if (this.characterConfig.scale) {
      this.sprite.setScale(this.characterConfig.scale);
    }
  }

  /**
   * Updates animated sprites (like knight character)
   */
  private updateAnimatedSprite(): void {
    const animConfig = this.characterConfig.animationConfig;
    if (!animConfig) return;

    const animationState = this.playerInfo.animationState || 'idle';
    const animation = animConfig.animations[animationState];
    
    if (animation) {
      const animKey = `${this.playerInfo.character}_${animationState}`;
      
      // Check if animation exists, if not create it
      if (!this.scene.anims.exists(animKey)) {
        this.scene.anims.create({
          key: animKey,
          frames: this.scene.anims.generateFrameNumbers(animation.key, { 
            start: 0, 
            end: animation.frames - 1 
          }),
          frameRate: animation.frameRate,
          repeat: animation.repeat ? -1 : 0,
        });
      }
      
      // Play animation if it's different from current
      if (this.currentAnimation !== animKey) {
        this.sprite.play(animKey);
        this.currentAnimation = animKey;
      }
    }
  }

  /**
   * Updates static sprites (like RPG character sheet)
   */
  private updateStaticSprite(): void {
    const spritesheetConfig = this.characterConfig.spritesheetConfig;
    if (!spritesheetConfig) return;

    const directionIndex = spritesheetConfig.directions[this.playerInfo.direction];
    const frameIndex = spritesheetConfig.characterIndex * spritesheetConfig.framesPerCharacter + directionIndex;
    
    this.sprite.setFrame(frameIndex);
  }

  public updatePosition(x: number, y: number): void {
    this.setPosition(x, y);
  }

  public updateDirection(direction: Direction): void {
    this.playerInfo.direction = direction;
    this.updateSprite();
  }

  public updateLevel(level: number): void {
    this.playerInfo.level = level;
    this.badge.setText(`L${level}`);
  }

  public updateName(name: string): void {
    this.playerInfo.name = name;
    this.nameplate.setText(name);
  }

  /**
   * Updates the player's animation state (idle, walk, run)
   */
  public updateAnimationState(animationState: AnimationState): void {
    if (this.playerInfo.animationState !== animationState) {
      this.playerInfo.animationState = animationState;
      this.updateSprite();
    }
  }

  /**
   * Updates the player's movement state
   */
  public updateMovementState(isMoving: boolean): void {
    if (this.playerInfo.isMoving !== isMoving) {
      this.playerInfo.isMoving = isMoving;
      
      // Update animation state based on movement
      if (hasAnimations(this.playerInfo.character)) {
        const newAnimationState = isMoving ? 'walk' : 'idle';
        this.updateAnimationState(newAnimationState);
      }
    }
  }

  /**
   * Changes the player's character type
   */
  public changeCharacter(newCharacter: CharacterType): void {
    const oldCharacter = this.playerInfo.character;
    this.playerInfo.character = newCharacter;
    
    // Update character configuration
    this.characterConfig = getCharacterConfig(newCharacter);
    
    // Recreate sprite with new character
    this.sprite.destroy();
    this.sprite = this.createCharacterSprite(this.scene);
    
    // Re-add sprite to container (replace old one)
    this.removeAt(0); // Remove old sprite
    this.addAt(this.sprite, 0); // Add new sprite at same position
    
    // Reset animation state
    this.playerInfo.animationState = 'idle';
    this.currentAnimation = undefined;
    
    this.updateSprite();
    console.log(`🎭 Player ${this.playerInfo.name} changed character from ${oldCharacter} to ${newCharacter}`);
  }

  public getPlayerInfo(): PlayerInfo {
    return { ...this.playerInfo };
  }

  public highlight(isCurrentPlayer: boolean): void {
    this.playerInfo.isCurrentPlayer = isCurrentPlayer;
    this.nameplate.setColor(isCurrentPlayer ? '#00ff00' : '#ffffff');
  }

  public destroy(): void {
    // Clean up all child objects
    this.sprite.destroy();
    this.nameplate.destroy();
    this.badge.destroy();
    super.destroy();
  }
}