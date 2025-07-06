import { 
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
  isError?: boolean;
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
    console.log('🎭 Player constructor called for:', playerInfo.name, 'at position:', x, y);
    
    this.playerInfo = {
      ...playerInfo,
      animationState: playerInfo.animationState || 'idle',
      isMoving: playerInfo.isMoving || false,
      isError: playerInfo.isError || false,
    };
    
    // Get character configuration
    this.characterConfig = getCharacterConfig(this.playerInfo.character);
    console.log('⚙️ Character config loaded:', this.characterConfig.key);
    
    // Create sprite based on character type
    console.log('🎨 Creating character sprite...');
    this.sprite = this.createCharacterSprite(scene);
    console.log('✅ Character sprite created:', this.sprite.texture.key);
    
    console.log('📝 Creating nameplate...');
    this.nameplate = this.createNameplate(scene);
    console.log('🏷️ Creating badge...');
    this.badge = this.createBadge(scene);
    
    // Add elements to container
    this.add([this.sprite, this.nameplate, this.badge]);
    console.log('📦 Elements added to container');
    
    // Add container to scene
    scene.add.existing(this);
    console.log('🎬 Container added to scene');
    
    // Set initial position
    this.setPosition(x, y);
    
    // Create animations upfront for performance
    if (hasAnimations(this.playerInfo.character)) {
      this.createAnimations();
    }
    
    // Initialize sprite display
    this.updateSprite();
  }

  /**
   * Creates the appropriate sprite based on character configuration
   */
  private createCharacterSprite(scene: Phaser.Scene): Phaser.GameObjects.Sprite {
    let textureKey = 'fallback_character'; // Default fallback
    let frameName: string | undefined;
    
    // Check if we have an idle atlas for directional idle frames
    if (this.characterConfig.idleAtlas && scene.textures.exists(this.characterConfig.idleAtlas.key)) {
      textureKey = this.characterConfig.idleAtlas.key;
      // Default to facing down
      frameName = this.characterConfig.idleAtlas.frameMap.down;
    } else if (this.characterConfig.type === 'animation_sheets' && this.characterConfig.animationConfig) {
      // Fallback to animation config if no idle atlas
      const animConfig = this.characterConfig.animationConfig;
      const defaultAnim = animConfig.animations[animConfig.defaultState || 'walk'];
      if (defaultAnim && scene.textures.exists(defaultAnim.key)) {
        textureKey = defaultAnim.key;
      }
    }
    
    if (!scene.textures.exists(textureKey)) {
      console.error(`Fallback texture ${textureKey} not found! Creating a placeholder.`);
      const graphics = scene.add.graphics();
      graphics.fillStyle(0x4a90e2, 1);
      graphics.fillRect(0, 0, 32, 32);
      graphics.generateTexture('fallback_character', 32, 32);
      graphics.destroy();
      textureKey = 'fallback_character';
    }
    
    const sprite = frameName 
      ? scene.add.sprite(0, 0, textureKey, frameName)
      : scene.add.sprite(0, 0, textureKey);
      
    if (this.characterConfig.scale) {
      sprite.setScale(this.characterConfig.scale);
    }
    
    // Set sprite origin to center for proper rotation and rendering
    sprite.setOrigin(0.5, 0.5);
    
    // Enable auto-clearing to prevent ghosting
    sprite.setBlendMode(Phaser.BlendModes.NORMAL);
    
    return sprite;
  }

  /**
   * Creates the nameplate text object
   */
  private createNameplate(scene: Phaser.Scene): Phaser.GameObjects.Text {
    const nameplate = scene.add.text(0, -40, this.playerInfo.name, {
      fontSize: '12px',
      color: this.playerInfo.isCurrentPlayer ? '#00ff00' : '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    });
    nameplate.setOrigin(0.5, 0.5);
    return nameplate;
  }

  /**
   * Creates the level badge text object
   */
  private createBadge(scene: Phaser.Scene): Phaser.GameObjects.Text {
    const badge = scene.add.text(20, -20, `L${this.playerInfo.level || 1}`, {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#4a90e2',
      padding: { x: 3, y: 1 },
    });
    badge.setOrigin(0.5, 0.5);
    return badge;
  }

  /**
   * Creates all animations for the character upfront
   */
  private createAnimations(): void {
    const animConfig = this.characterConfig.animationConfig;
    if (!animConfig) return;

    for (const state in animConfig.animations) {
      const animation = animConfig.animations[state];
      const animKey = `${this.playerInfo.character}_${state}`;

      if (!this.scene.anims.exists(animKey)) {
        // Skip idle animations as we're using static frames
        if (state === 'idle') {
          continue;
        }
        
        // Check if this is an atlas-based animation
        if (animation.atlasPath) {
          // For atlas animations, use frame names from the atlas
          const frameNames = [];
          
          // Special handling for stomp animation - frames are in specific order
          if (state === 'stomp') {
            // Correct frame order based on the JSON
            frameNames.push(
              'Untitled_Artwork-8.png',
              'Untitled_Artwork-1.png',
              'Untitled_Artwork-10.png',
              'Untitled_Artwork-6.png',
              'Untitled_Artwork-7.png',
              'Untitled_Artwork-9.png',
              'Untitled_Artwork-5.png',
              'Untitled_Artwork-3.png',
              'Untitled_Artwork-2.png',
              'Untitled_Artwork-4.png'
            );
          } else {
            // Default sequential frame naming
            for (let i = 1; i <= animation.frames; i++) {
              frameNames.push(`Untitled_Artwork-${i}.png`);
            }
          }
          
          this.scene.anims.create({
            key: animKey,
            frames: frameNames.map(frameName => ({
              key: animation.key,
              frame: frameName
            })),
            frameRate: animation.frameRate,
            repeat: animation.repeat ? -1 : 0,
          });
        } else {
          // Regular spritesheet animation
          let startFrame = 0;
          let endFrame = animation.frames - 1;
          
          // Special handling for cowboy animations
          if (this.playerInfo.character === 'cowboy') {
            if (state === 'walk' || state === 'run') {
              startFrame = 1;
              endFrame = Math.min(7, animation.frames - 1);
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
      }
    }
  }

  /**
   * Updates the sprite display based on character type and current state
   */
  private updateSprite(): void {
    if (hasAnimations(this.playerInfo.character)) {
      this.updateAnimatedSprite();
    } else {
      // For non-animated characters, just handle flipping
      this.sprite.setFlipX(this.playerInfo.direction === 'left');
    }
  }

  /**
   * Updates animated sprites (like cowboy character)
   */
  private updateAnimatedSprite(): void {
    const { character, direction, isMoving, isError } = this.playerInfo;
    
    // Handle error state first - override everything else
    if (isError) {
      const animKey = `${character}_stomp`;
      
      if (this.currentAnimation !== animKey) {
        // Stop any current animation
        if (this.sprite.anims.isPlaying) {
          this.sprite.stop();
        }
        
        this.sprite.play(animKey);
        this.currentAnimation = animKey;
      }
      
      // Face forward during error animation
      this.sprite.setFlipX(false);
      return;
    }
    
    if (!isMoving) {
      // Handle idle state with directional atlas frames
      if (this.characterConfig.idleAtlas) {
        const idleFrameName = this.characterConfig.idleAtlas.frameMap[direction];
        const idleAtlasKey = this.characterConfig.idleAtlas.key;
        
        // Only update if texture or frame has changed
        if (this.sprite.texture.key !== idleAtlasKey || this.sprite.frame.name !== idleFrameName) {
          this.sprite.stop();
          this.sprite.setTexture(idleAtlasKey, idleFrameName);
          this.currentAnimation = undefined;
        }
        // No flipping needed - we have directional frames
        this.sprite.setFlipX(false);
      } else if (hasRotationFrames(character)) {
        // Fallback to rotation frames if no idle atlas
        const directionalFrame = getDirectionalFrame(character, direction);
        if (directionalFrame !== null) {
          const rotationAnimKey = getRotationAnimationKey(character);
          const frameName = `Untitled_Artwork-${directionalFrame + 1}.png`;
          
          if (this.sprite.texture.key !== rotationAnimKey || this.sprite.frame.name !== frameName) {
            this.sprite.stop();
            this.sprite.setTexture(rotationAnimKey, frameName);
            this.currentAnimation = undefined;
          }
        }
      }
    } else {
      // Handle walking animations
      const animKey = `${character}_walk`;
      
      if (this.currentAnimation !== animKey) {
        // Stop any current animation to prevent frame blending
        if (this.sprite.anims.isPlaying) {
          this.sprite.stop();
        }
        
        this.sprite.play(animKey);
        this.currentAnimation = animKey;
      }
      
      // Handle directional flipping for walk animation
      if (direction === 'left') {
        this.sprite.setFlipX(true);
      } else if (direction === 'right') {
        this.sprite.setFlipX(false);
      }
    }
  }


  public updatePosition(x: number, y: number): void {
    this.setPosition(x, y);
    // Force a refresh to prevent ghosting
    this.sprite.setPosition(0, 0);
  }

  public updateDirection(direction: Direction): void {
    if (this.playerInfo.direction !== direction) {
      this.playerInfo.direction = direction;
      this.updateSprite();
    }
  }

  public updateLevel(level: number): void {
    if (this.playerInfo.level !== level) {
      this.playerInfo.level = level;
      this.badge.setText(`L${level}`);
    }
  }

  public updateName(name: string): void {
    if (this.playerInfo.name !== name) {
      this.playerInfo.name = name;
      this.nameplate.setText(name);
    }
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
      this.updateSprite();
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

  /**
   * Triggers the error state with stomp animation
   */
  public setErrorState(isError: boolean, duration?: number): void {
    if (this.playerInfo.isError !== isError) {
      this.playerInfo.isError = isError;
      this.updateSprite();
      
      // Automatically clear error state after duration (default 2 seconds)
      if (isError && duration !== undefined) {
        this.scene.time.delayedCall(duration, () => {
          this.setErrorState(false);
        });
      }
    }
  }

  /**
   * Triggers the stomp animation for a specified duration
   */
  public playStompAnimation(duration: number = 2000): void {
    this.setErrorState(true, duration);
  }

  public destroy(): void {
    super.destroy();
  }
}