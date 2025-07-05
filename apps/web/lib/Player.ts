import { 
  CharacterConfig, 
  CharacterType, 
  Direction, 
  AnimationState,
  getCharacterConfig,
  hasAnimations,
  hasRotationFrames,
  getDirectionalFrame,
  getRotationAnimationKey,
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
        console.log(`🎭 Creating sprite for ${this.playerInfo.character} with texture key: ${idleAnim.key}`);
        
        // Check if texture exists before creating sprite
        if (scene.textures.exists(idleAnim.key)) {
          return scene.add.sprite(0, 0, idleAnim.key);
        } else {
          console.warn(`⚠️ Texture ${idleAnim.key} not found! Falling back to legacy character sprite.`);
          console.log('Available textures:', scene.textures.list);
          // Fall through to legacy fallback
        }
      }
    }
    
    // For spritesheet-based characters or fallback
    const spritesheetConfig = this.characterConfig.spritesheetConfig;
    if (spritesheetConfig) {
      console.log(`🎭 Using spritesheet character with key: player_characters`);
      if (scene.textures.exists('player_characters')) {
        return scene.add.sprite(0, 0, 'player_characters');
      } else {
        console.warn(`⚠️ Texture player_characters not found!`);
      }
    }
    
    // Legacy fallback
    console.log(`🎭 Using legacy fallback with key: ${this.characterConfig.key}`);
    if (scene.textures.exists(this.characterConfig.key)) {
      return scene.add.sprite(0, 0, this.characterConfig.key);
    } else {
      console.error(`❌ No valid texture found for character ${this.playerInfo.character}! Creating fallback texture.`);
      // Create a fallback texture programmatically
      const graphics = scene.add.graphics();
      graphics.fillStyle(0x4a90e2, 1); // Blue rectangle instead of green
      graphics.fillRect(0, 0, 32, 32);
      graphics.generateTexture('fallback_character', 32, 32);
      graphics.destroy(); // Clean up the graphics object
      
      return scene.add.sprite(0, 0, 'fallback_character');
    }
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

    // Check if character has rotation frames for directional facing
    if (hasRotationFrames(this.playerInfo.character)) {
      this.updateRotationSprite();
      return;
    }

    const animationState = this.playerInfo.animationState || 'idle';
    const animation = animConfig.animations[animationState];
    
    if (animation) {
      const animKey = `${this.playerInfo.character}_${animationState}`;
      
      // Check if animation exists, if not create it
      if (!this.scene.anims.exists(animKey)) {
        // Handle custom frame ranges for different characters
        let startFrame = 0;
        let endFrame = animation.frames - 1;
        
        // Special handling for cowboy walk cycle
        if (this.playerInfo.character === 'cowboy') {
          if (animationState === 'idle') {
            // Idle uses only frame 0
            startFrame = 0;
            endFrame = 0;
          } else if (animationState === 'walk' || animationState === 'run') {
            // Walk/run uses frames 1-7 (avoiding problematic frames and non-existent frames)
            startFrame = 1;
            endFrame = 7;
          }
        }
        
        this.scene.anims.create({
          key: animKey,
          frames: this.scene.anims.generateFrameNumbers(animation.key, { 
            start: startFrame, 
            end: endFrame 
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
      
      // Handle directional flipping for left/right movement
      this.updateSpriteFlipping();
    }
  }

  /**
   * Updates rotation sprites for directional facing (like cowboy rotation)
   */
  private updateRotationSprite(): void {
    const animConfig = this.characterConfig.animationConfig;
    if (!animConfig) return;

    const animationState = this.playerInfo.animationState || 'idle';
    
    // For idle state, use rotation frames for directional facing
    if (animationState === 'idle' || !this.playerInfo.isMoving) {
      const rotationAnimKey = getRotationAnimationKey(this.playerInfo.character);
      
      // Create rotation animation if it doesn't exist
      if (!this.scene.anims.exists(rotationAnimKey)) {
        const rotateAnimation = animConfig.animations['rotate'];
        if (rotateAnimation) {
          this.scene.anims.create({
            key: rotationAnimKey,
            frames: this.scene.anims.generateFrameNumbers(rotateAnimation.key, { 
              start: 0, 
              end: rotateAnimation.frames - 1 
            }),
            frameRate: 1, // Static frames, no animation
            repeat: 0,
          });
        }
      }
      
      // Set to the appropriate directional frame
      const directionalFrame = getDirectionalFrame(this.playerInfo.character, this.playerInfo.direction);
      if (directionalFrame !== null) {
        // Stop any current animation and set static frame
        this.sprite.stop();
        this.sprite.setTexture(getRotationAnimationKey(this.playerInfo.character), directionalFrame);
      }
    } else {
      // For walking/running, use the regular walk animation
      const walkAnimation = animConfig.animations[animationState];
      if (walkAnimation) {
        const animKey = `${this.playerInfo.character}_${animationState}`;
        
        // Create walk animation if it doesn't exist
        if (!this.scene.anims.exists(animKey)) {
          let startFrame = 0;
          let endFrame = walkAnimation.frames - 1;
          
          // Special handling for cowboy walk cycle
          if (this.playerInfo.character === 'cowboy') {
            if (animationState === 'walk' || animationState === 'run') {
              startFrame = 1;
              endFrame = 7;
            }
          }
          
          this.scene.anims.create({
            key: animKey,
            frames: this.scene.anims.generateFrameNumbers(walkAnimation.key, { 
              start: startFrame, 
              end: endFrame 
            }),
            frameRate: walkAnimation.frameRate,
            repeat: -1,
          });
        }
        
        // Play walk animation if different from current
        if (this.currentAnimation !== animKey) {
          this.sprite.play(animKey);
          this.currentAnimation = animKey;
        }
      }
    }
  }

  /**
   * Updates sprite flipping based on movement direction
   */
  private updateSpriteFlipping(): void {
    if (this.playerInfo.direction === 'left') {
      this.sprite.setFlipX(true); // Flip horizontally for left movement
    } else if (this.playerInfo.direction === 'right') {
      this.sprite.setFlipX(false); // Normal orientation for right movement
    }
    // For up/down, keep the current flip state (don't change)
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
    
    // Handle directional flipping for static sprites too
    this.updateSpriteFlipping();
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
        console.log(`🎭 ${this.playerInfo.character} animation state: ${this.playerInfo.animationState} → ${newAnimationState}`);
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