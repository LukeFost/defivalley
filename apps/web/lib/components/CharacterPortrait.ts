import { CharacterType, getCharacterConfig, CharacterConfiguration } from '../character.config';

/**
 * Interface for character portrait data
 */
export interface CharacterPortraitData {
  /** Character type (references character.config.ts) */
  character?: CharacterType;
  /** Character display name */
  name: string;
  /** Character title/description */
  title?: string;
  /** Custom portrait image key (overrides character sprite) */
  portraitKey?: string;
  /** Custom portrait frame name (for atlas textures) */
  portraitFrame?: string;
  /** Portrait scale factor (default: 1.0) */
  portraitScale?: number;
  /** Background color for placeholder (hex string) */
  backgroundColor?: string;
  /** Text color for placeholder (hex string) */
  textColor?: string;
}

/**
 * Configuration options for portrait display
 */
export interface CharacterPortraitConfig {
  /** Portrait width in pixels */
  width: number;
  /** Portrait height in pixels */
  height: number;
  /** Position from right edge of screen */
  rightOffset: number;
  /** Position from top of screen */
  topOffset: number;
  /** Show character name */
  showName: boolean;
  /** Show character title */
  showTitle: boolean;
  /** Enable entrance/exit animations */
  enableAnimations: boolean;
  /** Animation duration in milliseconds */
  animationDuration: number;
}

/**
 * Default configuration for character portraits
 */
export const DEFAULT_PORTRAIT_CONFIG: CharacterPortraitConfig = {
  width: 200,
  height: 250,
  rightOffset: 50,
  topOffset: 100,
  showName: true,
  showTitle: true,
  enableAnimations: true,
  animationDuration: 500,
};

/**
 * A visual novel style character portrait component for Phaser 3
 * Displays characters on the right side of the screen with optional animations
 */
export class CharacterPortrait extends Phaser.GameObjects.Container {
  private portraitSprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private titleText: Phaser.GameObjects.Text;
  private backgroundRect: Phaser.GameObjects.Rectangle;
  private portraitData: CharacterPortraitData;
  private config: CharacterPortraitConfig;
  private isVisible: boolean = false;
  private characterConfig?: CharacterConfiguration;

  constructor(
    scene: Phaser.Scene,
    portraitData: CharacterPortraitData,
    config: Partial<CharacterPortraitConfig> = {}
  ) {
    // Calculate position based on config
    const finalConfig = { ...DEFAULT_PORTRAIT_CONFIG, ...config };
    const x = scene.cameras.main.width - finalConfig.rightOffset - finalConfig.width / 2;
    const y = finalConfig.topOffset + finalConfig.height / 2;
    
    super(scene, x, y);

    this.portraitData = portraitData;
    this.config = finalConfig;

    // Get character configuration if character type is specified
    if (portraitData.character) {
      this.characterConfig = getCharacterConfig(portraitData.character);
    }

    // Create background
    this.backgroundRect = this.createBackground();
    this.add(this.backgroundRect);

    // Create portrait sprite or placeholder
    this.portraitSprite = this.createPortraitSprite();
    this.add(this.portraitSprite);

    // Create text elements
    if (this.config.showName) {
      this.nameText = this.createNameText();
      this.add(this.nameText);
    }

    if (this.config.showTitle && portraitData.title) {
      this.titleText = this.createTitleText();
      this.add(this.titleText);
    }

    // Initially hidden
    this.setVisible(false);
    this.setAlpha(0);

    // Add to scene
    scene.add.existing(this);
    
    // Set depth to ensure it appears above game elements
    this.setDepth(1000);
  }

  /**
   * Creates the background rectangle for the portrait
   */
  private createBackground(): Phaser.GameObjects.Rectangle {
    const bg = this.scene.add.rectangle(
      0, 0,
      this.config.width,
      this.config.height,
      0x000000,
      0.8
    );
    bg.setStrokeStyle(2, 0x444444);
    return bg;
  }

  /**
   * Creates the portrait sprite or placeholder
   */
  private createPortraitSprite(): Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics {
    // Use custom portrait if specified
    if (this.portraitData.portraitKey) {
      return this.createCustomPortraitSprite();
    }

    // Use character sprite if character type is specified
    if (this.portraitData.character && this.characterConfig) {
      return this.createCharacterPortraitSprite();
    }

    // Create placeholder
    return this.createPlaceholderPortrait();
  }

  /**
   * Creates a sprite from a custom portrait key
   */
  private createCustomPortraitSprite(): Phaser.GameObjects.Sprite {
    const portraitKey = this.portraitData.portraitKey!;
    const portraitFrame = this.portraitData.portraitFrame;
    
    // Check if texture exists
    if (!this.scene.textures.exists(portraitKey)) {
      console.warn(`Portrait texture '${portraitKey}' not found, creating placeholder`);
      return this.createPlaceholderPortrait() as Phaser.GameObjects.Sprite;
    }

    const sprite = portraitFrame 
      ? this.scene.add.sprite(0, 0, portraitKey, portraitFrame)
      : this.scene.add.sprite(0, 0, portraitKey);

    // Scale to fit within portrait bounds
    const scale = this.portraitData.portraitScale || 1.0;
    const maxWidth = this.config.width * 0.8;
    const maxHeight = this.config.height * 0.6;
    
    const scaleX = maxWidth / sprite.width;
    const scaleY = maxHeight / sprite.height;
    const finalScale = Math.min(scaleX, scaleY) * scale;
    
    sprite.setScale(finalScale);
    sprite.setOrigin(0.5, 0.5);
    
    return sprite;
  }

  /**
   * Creates a portrait sprite from character configuration
   */
  private createCharacterPortraitSprite(): Phaser.GameObjects.Sprite {
    if (!this.characterConfig) {
      return this.createPlaceholderPortrait() as Phaser.GameObjects.Sprite;
    }

    let textureKey = '';
    let frameName: string | undefined;

    // Try to use idle atlas first (best for portraits)
    if (this.characterConfig.idleAtlas && this.scene.textures.exists(this.characterConfig.idleAtlas.key)) {
      textureKey = this.characterConfig.idleAtlas.key;
      frameName = this.characterConfig.idleAtlas.frameMap.down; // Use down-facing frame
    } else if (this.characterConfig.type === 'animation_sheets' && this.characterConfig.animationConfig) {
      // Fallback to animation texture
      const animConfig = this.characterConfig.animationConfig;
      const defaultAnim = animConfig.animations[animConfig.defaultState || 'idle'];
      if (defaultAnim && this.scene.textures.exists(defaultAnim.key)) {
        textureKey = defaultAnim.key;
        // For animation sheets, use the first frame
        if (defaultAnim.atlasPath) {
          frameName = 'Untitled_Artwork-1.png'; // Default first frame
        }
      }
    }

    if (!textureKey || !this.scene.textures.exists(textureKey)) {
      console.warn(`Character portrait texture not found for '${this.portraitData.character}', creating placeholder`);
      return this.createPlaceholderPortrait() as Phaser.GameObjects.Sprite;
    }

    const sprite = frameName 
      ? this.scene.add.sprite(0, 0, textureKey, frameName)
      : this.scene.add.sprite(0, 0, textureKey);

    // Scale character sprite for portrait display
    const characterScale = this.characterConfig.scale || 1.0;
    const portraitScale = this.portraitData.portraitScale || 2.0; // Larger for portraits
    const maxWidth = this.config.width * 0.8;
    const maxHeight = this.config.height * 0.6;
    
    const scaleX = maxWidth / sprite.width;
    const scaleY = maxHeight / sprite.height;
    const finalScale = Math.min(scaleX, scaleY) * characterScale * portraitScale;
    
    sprite.setScale(finalScale);
    sprite.setOrigin(0.5, 0.5);
    
    return sprite;
  }

  /**
   * Creates a placeholder portrait using graphics
   */
  private createPlaceholderPortrait(): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    
    // Portrait dimensions
    const width = this.config.width * 0.8;
    const height = this.config.height * 0.6;
    
    // Colors
    const bgColor = this.portraitData.backgroundColor 
      ? parseInt(this.portraitData.backgroundColor.replace('#', ''), 16)
      : 0x4a90e2;
    const textColor = this.portraitData.textColor
      ? parseInt(this.portraitData.textColor.replace('#', ''), 16)
      : 0xffffff;

    // Draw background rectangle
    graphics.fillStyle(bgColor, 1);
    graphics.fillRoundedRect(-width/2, -height/2, width, height, 8);
    
    // Draw border
    graphics.lineStyle(2, 0x666666, 1);
    graphics.strokeRoundedRect(-width/2, -height/2, width, height, 8);
    
    // Add character initial or name
    const displayText = this.portraitData.character 
      ? this.portraitData.character.charAt(0).toUpperCase()
      : this.portraitData.name.charAt(0).toUpperCase();
    
    // Create text separately and add to graphics
    const placeholderText = this.scene.add.text(0, 0, displayText, {
      fontSize: '48px',
      color: `#${textColor.toString(16).padStart(6, '0')}`,
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });
    placeholderText.setOrigin(0.5, 0.5);
    
    // Convert text to graphics by rendering it
    const textTexture = this.scene.add.renderTexture(0, 0, width, height);
    textTexture.draw(placeholderText, width/2, height/2);
    
    // Clean up temporary text
    placeholderText.destroy();
    
    return graphics;
  }

  /**
   * Creates the character name text
   */
  private createNameText(): Phaser.GameObjects.Text {
    const text = this.scene.add.text(
      0, 
      this.config.height * 0.35,
      this.portraitData.name,
      {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        backgroundColor: '#000000',
        padding: { x: 8, y: 4 },
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, fill: true }
      }
    );
    text.setOrigin(0.5, 0.5);
    return text;
  }

  /**
   * Creates the character title text
   */
  private createTitleText(): Phaser.GameObjects.Text {
    const text = this.scene.add.text(
      0,
      this.config.height * 0.42,
      this.portraitData.title || '',
      {
        fontSize: '14px',
        color: '#cccccc',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'italic',
        backgroundColor: '#000000',
        padding: { x: 6, y: 2 },
        shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 1, fill: true }
      }
    );
    text.setOrigin(0.5, 0.5);
    return text;
  }

  /**
   * Shows the portrait with optional entrance animation
   */
  public show(immediate: boolean = false): Promise<void> {
    return new Promise((resolve) => {
      if (this.isVisible) {
        resolve();
        return;
      }

      this.isVisible = true;
      this.setVisible(true);

      if (immediate || !this.config.enableAnimations) {
        this.setAlpha(1);
        this.setScale(1);
        resolve();
      } else {
        // Entrance animation: slide in from right with fade
        this.setAlpha(0);
        this.setScale(0.8);
        this.x += 100; // Start offset to the right
        
        this.scene.tweens.add({
          targets: this,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          x: this.x - 100, // Slide to final position
          duration: this.config.animationDuration,
          ease: 'Power2',
          onComplete: () => resolve()
        });
      }
    });
  }

  /**
   * Hides the portrait with optional exit animation
   */
  public hide(immediate: boolean = false): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isVisible) {
        resolve();
        return;
      }

      if (immediate || !this.config.enableAnimations) {
        this.setVisible(false);
        this.setAlpha(0);
        this.isVisible = false;
        resolve();
      } else {
        // Exit animation: fade out and slide right
        this.scene.tweens.add({
          targets: this,
          alpha: 0,
          scaleX: 0.8,
          scaleY: 0.8,
          x: this.x + 100, // Slide to the right
          duration: this.config.animationDuration,
          ease: 'Power2',
          onComplete: () => {
            this.setVisible(false);
            this.isVisible = false;
            resolve();
          }
        });
      }
    });
  }

  /**
   * Updates the portrait with new character data
   */
  public updatePortrait(newData: Partial<CharacterPortraitData>): void {
    const hasCharacterChanged = newData.character && newData.character !== this.portraitData.character;
    const hasPortraitChanged = newData.portraitKey && newData.portraitKey !== this.portraitData.portraitKey;
    
    // Update data
    this.portraitData = { ...this.portraitData, ...newData };
    
    // Update character config if needed
    if (hasCharacterChanged && this.portraitData.character) {
      this.characterConfig = getCharacterConfig(this.portraitData.character);
    }
    
    // Recreate sprite if character or portrait changed
    if (hasCharacterChanged || hasPortraitChanged) {
      this.portraitSprite.destroy();
      this.portraitSprite = this.createPortraitSprite();
      this.add(this.portraitSprite);
    }
    
    // Update text
    if (newData.name && this.nameText) {
      this.nameText.setText(newData.name);
    }
    
    if (newData.title && this.titleText) {
      this.titleText.setText(newData.title);
    }
  }

  /**
   * Animates the portrait (e.g., bounce, pulse effects)
   */
  public animate(animationType: 'bounce' | 'pulse' | 'shake' = 'bounce'): void {
    if (!this.isVisible || !this.config.enableAnimations) {
      return;
    }

    switch (animationType) {
      case 'bounce':
        this.scene.tweens.add({
          targets: this,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 150,
          ease: 'Power2',
          yoyo: true,
          repeat: 0
        });
        break;
        
      case 'pulse':
        this.scene.tweens.add({
          targets: this,
          alpha: 0.7,
          duration: 300,
          ease: 'Power2',
          yoyo: true,
          repeat: 0
        });
        break;
        
      case 'shake':
        this.scene.tweens.add({
          targets: this,
          x: this.x + 5,
          duration: 50,
          ease: 'Power2',
          yoyo: true,
          repeat: 5
        });
        break;
    }
  }

  /**
   * Gets the current visibility state
   */
  public getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Gets the current portrait data
   */
  public getPortraitData(): CharacterPortraitData {
    return { ...this.portraitData };
  }

  /**
   * Updates the portrait position (useful for responsive design)
   */
  public updatePosition(): void {
    const x = this.scene.cameras.main.width - this.config.rightOffset - this.config.width / 2;
    const y = this.config.topOffset + this.config.height / 2;
    this.setPosition(x, y);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    // Stop any running tweens
    this.scene.tweens.killTweensOf(this);
    super.destroy();
  }
}