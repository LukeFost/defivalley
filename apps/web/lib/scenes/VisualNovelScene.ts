import * as Phaser from 'phaser';

/**
 * Configuration for scene transitions
 */
export interface SceneTransitionConfig {
  duration?: number;
  ease?: string;
  fadeColor?: number;
}

/**
 * Configuration for character portraits
 */
export interface CharacterPortraitConfig {
  key: string;
  x: number;
  y: number;
  scale?: number;
  tint?: number;
  alpha?: number;
}

/**
 * Configuration for player choices
 */
export interface DialogueChoice {
  text: string;
  action: () => void;
}

/**
 * Configuration for dialogue display
 */
export interface DialogueConfig {
  text: string;
  speaker?: string;
  backgroundColor?: number;
  textColor?: string;
  fontSize?: string;
  fontFamily?: string;
  autoAdvance?: boolean;
  autoAdvanceDelay?: number;
  choices?: DialogueChoice[];
}

/**
 * Data that can be passed between scenes
 */
export interface SceneData {
  [key: string]: any;
  previousScene?: string;
  returnData?: any;
}

/**
 * VisualNovelScene - Base class for building interactive scenes
 * 
 * Provides common functionality for:
 * - Background management with placeholder generation
 * - Character portrait integration points
 * - Dialogue box framework
 * - Scene transitions (fade in/out)
 * - Return to previous scene functionality
 * - Data passing between scenes
 * 
 * This class should be extended by specific building scenes.
 */
export class VisualNovelScene extends Phaser.Scene {
  // Scene management
  protected sceneData: SceneData = {};
  protected previousScene?: string;
  
  // Visual elements
  protected background?: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
  protected portraits: Map<string, Phaser.GameObjects.Image> = new Map();
  protected dialogueContainer?: Phaser.GameObjects.Container;
  protected dialogueBackground?: Phaser.GameObjects.Graphics;
  protected dialogueText?: Phaser.GameObjects.Text;
  protected speakerText?: Phaser.GameObjects.Text;
  protected choiceButtons: Phaser.GameObjects.Container[] = [];
  
  // Transition elements
  protected fadeOverlay?: Phaser.GameObjects.Graphics;
  
  // Scene state
  protected isTransitioning: boolean = false;
  protected backgroundPlaceholderColor: number = 0x4A7C59; // Default forest green
  
  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config);
  }

  /**
   * Initialize scene with data from previous scene
   */
  init(data: SceneData): void {
    this.sceneData = { ...data };
    this.previousScene = data.previousScene;
    console.log(`🎬 Visual Novel Scene initialized with data:`, this.sceneData);
  }

  /**
   * Create the scene - this is called by Phaser to set up the scene
   * Subclasses should override this method to set up their specific content
   */
  create(): void {
    console.log(`🎬 Creating Visual Novel Scene: ${this.scene.key}`);
    
    // Set up basic scene elements
    this.setBackground();
    this.createDialogueContainer();
    
    // Add return button
    this.createReturnButton();
    
    // Fade in the scene
    this.fadeIn();
    
    console.log(`✅ Visual Novel Scene created: ${this.scene.key}`);
  }

  /**
   * Set background image with fallback to placeholder
   * @param backgroundKey - Texture key for background image
   * @param placeholderColor - Color for placeholder if image not found
   */
  protected setBackground(backgroundKey?: string, placeholderColor?: number): void {
    // Remove existing background
    if (this.background) {
      this.background.destroy();
      this.background = undefined;
    }

    const color = placeholderColor || this.backgroundPlaceholderColor;

    if (backgroundKey && this.textures.exists(backgroundKey)) {
      // Use provided background image
      this.background = this.add.image(0, 0, backgroundKey);
      this.background.setOrigin(0, 0);
      this.background.setDisplaySize(this.scale.width, this.scale.height);
      this.background.setDepth(-100);
      console.log(`🖼️ Background set to image: ${backgroundKey}`);
    } else {
      // Generate placeholder background
      this.background = this.generatePlaceholderBackground(color);
      console.log(`🎨 Generated placeholder background with color: #${color.toString(16)}`);
    }
  }

  /**
   * Generate a placeholder background with gradient and decorative elements
   * @param baseColor - Base color for the placeholder
   */
  protected generatePlaceholderBackground(baseColor: number): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics();
    graphics.setDepth(-100);

    const width = this.scale.width;
    const height = this.scale.height;

    // Create gradient background
    const gradient = this.createGradientTexture(baseColor, width, height);
    graphics.fillStyle(baseColor);
    graphics.fillRect(0, 0, width, height);

    // Add decorative elements
    this.addPlaceholderDecorations(graphics, baseColor, width, height);

    return graphics;
  }

  /**
   * Create a gradient texture for backgrounds
   * @param baseColor - Base color for gradient
   * @param width - Width of the gradient
   * @param height - Height of the gradient
   */
  protected createGradientTexture(baseColor: number, width: number, height: number): void {
    // Extract RGB components
    const r = (baseColor >> 16) & 0xFF;
    const g = (baseColor >> 8) & 0xFF;
    const b = baseColor & 0xFF;

    // Create subtle gradient effect
    const canvas = this.add.graphics();
    
    // Top lighter section
    const lighterColor = Phaser.Display.Color.GetColor(
      Math.min(255, r + 30),
      Math.min(255, g + 30),
      Math.min(255, b + 30)
    );
    canvas.fillGradientStyle(lighterColor, lighterColor, baseColor, baseColor, 0.7);
    canvas.fillRect(0, 0, width, height * 0.6);

    // Bottom darker section
    const darkerColor = Phaser.Display.Color.GetColor(
      Math.max(0, r - 30),
      Math.max(0, g - 30),
      Math.max(0, b - 30)
    );
    canvas.fillGradientStyle(baseColor, baseColor, darkerColor, darkerColor, 0.5);
    canvas.fillRect(0, height * 0.6, width, height * 0.4);
  }

  /**
   * Add decorative elements to placeholder background
   * @param graphics - Graphics object to draw on
   * @param baseColor - Base color for decorations
   * @param width - Width of the canvas
   * @param height - Height of the canvas
   */
  protected addPlaceholderDecorations(
    graphics: Phaser.GameObjects.Graphics,
    baseColor: number,
    width: number,
    height: number
  ): void {
    // Add subtle texture with circles
    const colorObj = Phaser.Display.Color.IntegerToColor(baseColor);
    const decorColor = Phaser.Display.Color.GetColor(
      Math.min(255, colorObj.r + 30),
      Math.min(255, colorObj.g + 30), 
      Math.min(255, colorObj.b + 30)
    );
    graphics.fillStyle(decorColor, 0.3);
    
    // Random decorative circles
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = 20 + Math.random() * 40;
      graphics.fillCircle(x, y, radius);
    }

    // Add border frame
    const frameColorObj = Phaser.Display.Color.IntegerToColor(baseColor);
    const frameColor = Phaser.Display.Color.GetColor(
      Math.max(0, frameColorObj.r - 40),
      Math.max(0, frameColorObj.g - 40),
      Math.max(0, frameColorObj.b - 40)
    );
    graphics.lineStyle(4, frameColor, 0.8);
    graphics.strokeRect(10, 10, width - 20, height - 20);
  }

  /**
   * Add or update a character portrait
   * @param portraitId - Unique identifier for the portrait
   * @param config - Portrait configuration
   */
  protected setCharacterPortrait(portraitId: string, config: CharacterPortraitConfig): void {
    // Remove existing portrait if it exists
    if (this.portraits.has(portraitId)) {
      this.portraits.get(portraitId)?.destroy();
      this.portraits.delete(portraitId);
    }

    if (this.textures.exists(config.key)) {
      const portrait = this.add.image(config.x, config.y, config.key);
      portrait.setScale(config.scale || 1);
      portrait.setDepth(10);
      
      if (config.tint !== undefined) {
        portrait.setTint(config.tint);
      }
      
      if (config.alpha !== undefined) {
        portrait.setAlpha(config.alpha);
      }

      this.portraits.set(portraitId, portrait);
      console.log(`👤 Character portrait '${portraitId}' added at (${config.x}, ${config.y})`);
    } else {
      console.warn(`⚠️ Portrait texture '${config.key}' not found for '${portraitId}'`);
    }
  }

  /**
   * Remove a character portrait
   * @param portraitId - Unique identifier for the portrait to remove
   */
  protected removeCharacterPortrait(portraitId: string): void {
    if (this.portraits.has(portraitId)) {
      this.portraits.get(portraitId)?.destroy();
      this.portraits.delete(portraitId);
      console.log(`👤 Character portrait '${portraitId}' removed`);
    }
  }

  /**
   * Clear all character portraits
   */
  protected clearAllPortraits(): void {
    this.portraits.forEach((portrait, id) => {
      portrait.destroy();
      console.log(`👤 Character portrait '${id}' cleared`);
    });
    this.portraits.clear();
  }

  /**
   * Display dialogue with optional speaker
   * @param config - Dialogue configuration
   */
  protected showDialogue(config: DialogueConfig): void {
    // Create dialogue container if it doesn't exist
    if (!this.dialogueContainer) {
      this.createDialogueContainer();
    }

    // Update dialogue content
    if (this.dialogueText) {
      this.dialogueText.setText(config.text);
      this.dialogueText.setStyle({
        fontSize: config.fontSize || '18px',
        color: config.textColor || '#FFFFFF',
        fontFamily: config.fontFamily || 'Arial, sans-serif',
        wordWrap: { width: this.scale.width - 100, useAdvancedWrap: true }
      });
    }

    // Update speaker if provided
    if (this.speakerText && config.speaker) {
      this.speakerText.setText(config.speaker);
      this.speakerText.setVisible(true);
    } else if (this.speakerText) {
      this.speakerText.setVisible(false);
    }

    // Update dialogue background color
    if (this.dialogueBackground && config.backgroundColor !== undefined) {
      this.dialogueBackground.clear();
      this.dialogueBackground.fillStyle(config.backgroundColor, 0.9);
      this.dialogueBackground.fillRoundedRect(
        20, this.scale.height - 150, 
        this.scale.width - 40, 120, 
        10
      );
    }

    // Clear previous choices
    this.clearChoices();

    // Display new choices if they exist
    if (config.choices) {
      this.displayChoices(config.choices);
    }

    // Make dialogue visible
    if (this.dialogueContainer) {
      this.dialogueContainer.setVisible(true);
    }

    // Auto-advance if configured
    if (config.autoAdvance) {
      this.time.delayedCall(config.autoAdvanceDelay || 3000, () => {
        this.hideDialogue();
      });
    }

    console.log(`💬 Dialogue displayed: "${config.text}"`);
  }

  /**
   * Hide the dialogue box
   */
  protected hideDialogue(): void {
    if (this.dialogueContainer) {
      this.dialogueContainer.setVisible(false);
    }
    this.clearChoices();
    console.log(`💬 Dialogue hidden`);
  }

  /**
   * Display dialogue choices
   * @param choices - Array of dialogue choices
   */
  protected displayChoices(choices: DialogueChoice[]): void {
    const startX = this.scale.width - 250;
    const startY = this.scale.height / 2 - (choices.length * 60 / 2);

    choices.forEach((choice, index) => {
      const buttonContainer = this.add.container(startX, startY + index * 60);
      buttonContainer.setDepth(101);

      const buttonBg = this.add.graphics();
      buttonBg.fillStyle(0x2d3748, 0.9);
      buttonBg.fillRoundedRect(0, 0, 220, 50, 8);
      buttonBg.lineStyle(2, 0x4a5568, 1);
      buttonBg.strokeRoundedRect(0, 0, 220, 50, 8);
      buttonBg.setInteractive(new Phaser.Geom.Rectangle(0, 0, 220, 50), Phaser.Geom.Rectangle.Contains);

      const buttonText = this.add.text(110, 25, choice.text, {
        fontSize: '16px',
        color: '#e2e8f0',
        fontFamily: 'Arial, sans-serif',
        align: 'center',
        wordWrap: { width: 200, useAdvancedWrap: true }
      }).setOrigin(0.5);

      buttonContainer.add([buttonBg, buttonText]);
      this.choiceButtons.push(buttonContainer);

      // Add hover effects
      buttonBg.on('pointerover', () => {
        buttonBg.clear();
        buttonBg.fillStyle(0x4a5568, 1);
        buttonBg.fillRoundedRect(0, 0, 220, 50, 8);
        buttonBg.lineStyle(2, 0x63b3ed, 1);
        buttonBg.strokeRoundedRect(0, 0, 220, 50, 8);
        buttonText.setColor('#ffffff');
      });

      buttonBg.on('pointerout', () => {
        buttonBg.clear();
        buttonBg.fillStyle(0x2d3748, 0.9);
        buttonBg.fillRoundedRect(0, 0, 220, 50, 8);
        buttonBg.lineStyle(2, 0x4a5568, 1);
        buttonBg.strokeRoundedRect(0, 0, 220, 50, 8);
        buttonText.setColor('#e2e8f0');
      });

      // Add click handler
      buttonBg.on('pointerdown', () => {
        this.disableChoices();
        choice.action();
      });
    });

    console.log(`💬 Displayed ${choices.length} dialogue choices`);
  }

  /**
   * Clear all dialogue choices
   */
  protected clearChoices(): void {
    this.choiceButtons.forEach(button => button.destroy());
    this.choiceButtons = [];
  }

  /**
   * Disable all dialogue choices
   */
  protected disableChoices(): void {
    this.choiceButtons.forEach(button => {
      const bg = button.getAt(0) as Phaser.GameObjects.Graphics;
      bg.disableInteractive();
      bg.setAlpha(0.5);
    });
  }

  /**
   * Create return button to go back to previous scene
   */
  protected createReturnButton(): void {
    // Create return button background
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x333333, 0.8);
    buttonBg.fillRoundedRect(0, 0, 120, 40, 8);
    buttonBg.lineStyle(2, 0x87CEEB, 1);
    buttonBg.strokeRoundedRect(0, 0, 120, 40, 8);
    
    // Create return button text
    const buttonText = this.add.text(60, 20, '← Return', {
      fontSize: '16px',
      color: '#87CEEB',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    
    // Create button container
    const returnButton = this.add.container(this.scale.width - 140, 20);
    returnButton.add([buttonBg, buttonText]);
    returnButton.setSize(120, 40);
    returnButton.setInteractive();
    returnButton.setDepth(200);
    
    // Add hover effects
    returnButton.on('pointerover', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x87CEEB, 0.2);
      buttonBg.fillRoundedRect(0, 0, 120, 40, 8);
      buttonBg.lineStyle(2, 0x87CEEB, 1);
      buttonBg.strokeRoundedRect(0, 0, 120, 40, 8);
      buttonText.setColor('#FFFFFF');
    });
    
    returnButton.on('pointerout', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x333333, 0.8);
      buttonBg.fillRoundedRect(0, 0, 120, 40, 8);
      buttonBg.lineStyle(2, 0x87CEEB, 1);
      buttonBg.strokeRoundedRect(0, 0, 120, 40, 8);
      buttonText.setColor('#87CEEB');
    });
    
    // Add click handler
    returnButton.on('pointerdown', () => {
      this.returnToPreviousScene();
    });
    
    console.log(`🔙 Return button created`);
  }

  /**
   * Create the dialogue container and its components
   */
  protected createDialogueContainer(): void {
    this.dialogueContainer = this.add.container(0, 0);
    this.dialogueContainer.setDepth(100);

    // Create dialogue background
    this.dialogueBackground = this.add.graphics();
    this.dialogueBackground.fillStyle(0x000000, 0.9);
    this.dialogueBackground.fillRoundedRect(
      20, this.scale.height - 150, 
      this.scale.width - 40, 120, 
      10
    );

    // Create speaker text
    this.speakerText = this.add.text(40, this.scale.height - 145, '', {
      fontSize: '16px',
      color: '#FFD700',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    });

    // Create dialogue text
    this.dialogueText = this.add.text(40, this.scale.height - 120, '', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      wordWrap: { width: this.scale.width - 100, useAdvancedWrap: true }
    });

    // Add components to container
    this.dialogueContainer.add([
      this.dialogueBackground,
      this.speakerText,
      this.dialogueText
    ]);

    // Start hidden
    this.dialogueContainer.setVisible(false);

    console.log(`💬 Dialogue container created`);
  }

  /**
   * Fade in transition
   * @param config - Transition configuration
   */
  protected fadeIn(config: SceneTransitionConfig = {}): Promise<void> {
    return new Promise((resolve) => {
      if (this.isTransitioning) {
        resolve();
        return;
      }

      this.isTransitioning = true;
      
      // Create fade overlay if it doesn't exist
      if (!this.fadeOverlay) {
        this.fadeOverlay = this.add.graphics();
        this.fadeOverlay.setDepth(1000);
      }

      // Set up fade overlay
      this.fadeOverlay.clear();
      this.fadeOverlay.fillStyle(config.fadeColor || 0x000000);
      this.fadeOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
      this.fadeOverlay.setAlpha(1);

      // Fade out the overlay (fade in the scene)
      this.tweens.add({
        targets: this.fadeOverlay,
        alpha: 0,
        duration: config.duration || 1000,
        ease: config.ease || 'Power2',
        onComplete: () => {
          this.isTransitioning = false;
          if (this.fadeOverlay) {
            this.fadeOverlay.setVisible(false);
          }
          resolve();
          console.log(`🎬 Fade in transition completed`);
        }
      });

      console.log(`🎬 Fade in transition started`);
    });
  }

  /**
   * Fade out transition
   * @param config - Transition configuration
   */
  protected fadeOut(config: SceneTransitionConfig = {}): Promise<void> {
    return new Promise((resolve) => {
      if (this.isTransitioning) {
        resolve();
        return;
      }

      this.isTransitioning = true;

      // Create fade overlay if it doesn't exist
      if (!this.fadeOverlay) {
        this.fadeOverlay = this.add.graphics();
        this.fadeOverlay.setDepth(1000);
      }

      // Set up fade overlay
      this.fadeOverlay.clear();
      this.fadeOverlay.fillStyle(config.fadeColor || 0x000000);
      this.fadeOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
      this.fadeOverlay.setAlpha(0);
      this.fadeOverlay.setVisible(true);

      // Fade in the overlay (fade out the scene)
      this.tweens.add({
        targets: this.fadeOverlay,
        alpha: 1,
        duration: config.duration || 1000,
        ease: config.ease || 'Power2',
        onComplete: () => {
          this.isTransitioning = false;
          resolve();
          console.log(`🎬 Fade out transition completed`);
        }
      });

      console.log(`🎬 Fade out transition started`);
    });
  }

  /**
   * Return to the previous scene with optional data
   * @param returnData - Data to pass back to the previous scene
   * @param transitionConfig - Transition configuration
   */
  protected async returnToPreviousScene(returnData?: any, transitionConfig?: SceneTransitionConfig): Promise<void> {
    // Default to MainScene if no previous scene is set
    const targetScene = this.previousScene || 'MainScene';
    
    console.log(`🔄 Returning to scene: ${targetScene}`);

    // Fade out if transition is configured
    if (transitionConfig) {
      await this.fadeOut(transitionConfig);
    }

    // Prepare data for previous scene
    const sceneData = {
      ...this.sceneData,
      returnData,
      previousScene: this.scene.key
    };

    // Stop current scene and start the target scene
    console.log('🛑 Stopping current scene before returning');
    this.scene.stop();
    this.scene.start(targetScene, sceneData);
  }

  /**
   * Transition to a new scene with data
   * @param sceneKey - Key of the scene to transition to
   * @param data - Data to pass to the new scene
   * @param transitionConfig - Transition configuration
   */
  protected async transitionToScene(
    sceneKey: string, 
    data: SceneData = {}, 
    transitionConfig?: SceneTransitionConfig
  ): Promise<void> {
    console.log(`🎬 Transitioning to scene: ${sceneKey}`);

    // Fade out if transition is configured
    if (transitionConfig) {
      await this.fadeOut(transitionConfig);
    }

    // Prepare data for new scene
    const sceneData: SceneData = {
      ...data,
      previousScene: this.scene.key
    };

    // Start the new scene and stop this one
    this.scene.start(sceneKey, sceneData);
  }

  /**
   * Get data passed from previous scene
   * @param key - Key of the data to retrieve
   * @param defaultValue - Default value if key not found
   */
  protected getSceneData<T>(key: string, defaultValue?: T): T | undefined {
    return this.sceneData[key] !== undefined ? this.sceneData[key] : defaultValue;
  }

  /**
   * Set data for this scene (useful for passing to next scene)
   * @param key - Key of the data
   * @param value - Value to set
   */
  protected setSceneData(key: string, value: any): void {
    this.sceneData[key] = value;
  }

  /**
   * Clean up scene resources
   */
  destroy(): void {
    // Clear portraits
    this.clearAllPortraits();
    
    // Clean up dialogue
    if (this.dialogueContainer) {
      this.dialogueContainer.destroy();
    }
    
    // Clear choices
    this.clearChoices();
    
    // Clean up fade overlay
    if (this.fadeOverlay) {
      this.fadeOverlay.destroy();
    }
    
    console.log(`🧹 Visual Novel Scene cleaned up`);
    super.destroy();
  }
}