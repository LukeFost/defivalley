import { BaseInteractiveBuilding } from './BaseInteractiveBuilding';

/**
 * PepeBuilding - A unified building that combines Pepe character interaction with Flow pump launch functionality
 * This building serves as both a character encounter and a functional DeFi launchpad
 */
export class PepeBuilding extends BaseInteractiveBuilding {
  private static readonly ANIMATION_KEY = 'pepe_building_idle';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
  }

  // Abstract method implementations
  protected getSpriteTexture(): string {
    return 'pepe_building_anim';
  }

  protected getGlowColor(): number {
    return 0x32cd32; // Pepe green
  }

  protected getPromptText(): string {
    return "Press E for Pepe's Pump Launchpad";
  }

  protected getEventName(): string {
    return 'pepeInteraction';
  }

  protected getBuildingName(): string {
    return '🐸 Pepe\'s Pump Launchpad';
  }

  // Override virtual methods
  protected getSpriteScale(): number {
    return 1.2; // Increased sprite size by 1.5x (0.8 * 1.5 = 1.2)
  }

  protected getPromptBackgroundColor(): string {
    return '#228b22'; // Dark green background
  }

  protected isAnimatedSprite(): boolean {
    return true; // This is an animated sprite
  }

  protected setupAnimation(): void {
    // Create the animation from the loaded atlas if it doesn't already exist
    if (!this.scene.anims.exists(PepeBuilding.ANIMATION_KEY)) {
      this.scene.anims.create({
        key: PepeBuilding.ANIMATION_KEY,
        frames: this.scene.anims.generateFrameNames('pepe_building_anim', {
          prefix: 'Untitled_Artwork-',
          suffix: '.png',
          start: 1,
          end: 15, // There are 15 frames in the building_pepe.json
        }),
        frameRate: 10,
        repeat: -1, // Loop forever
      });
    }

    // Play the animation
    this.buildingSprite.play(PepeBuilding.ANIMATION_KEY);
  }

  // Override collision bounds to use the original algorithm
  public getCollisionBounds(): Phaser.Geom.Rectangle {
    // Use original sprite size (before 1.2x scaling) for collision bounds
    const originalWidth = this.buildingSprite.width * 0.8;
    const originalHeight = this.buildingSprite.height * 0.8;
    return new Phaser.Geom.Rectangle(
      this.x - originalWidth / 2, 
      this.y - originalHeight / 2, 
      originalWidth, 
      originalHeight
    );
  }

  // Override checkInteraction to use JustDown for single trigger
  public checkInteraction(): boolean {
    if (this.isPlayerNear && this.interactionKey && Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      console.log(`[${this.getBuildingName()}] Interaction triggered!`);
      this.scene.events.emit(this.getEventName());
      return true;
    }
    return false;
  }

  // Override the prompt text positioning
  protected createPromptText(): void {
    if (this.promptText) {
      this.promptText.destroy();
    }

    // Position above the building
    this.promptText = this.scene.add.text(0, -60, this.getPromptText(), {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: this.getPromptBackgroundColor(),
      padding: { x: 8, y: 4 },
      align: 'center'
    });
    
    this.promptText.setOrigin(0.5);
    this.promptText.setAlpha(0);
    this.add(this.promptText);

    // Fade in animation
    this.scene.tweens.add({
      targets: this.promptText,
      alpha: 1,
      duration: 200,
      ease: 'Power2'
    });
  }

  // Override glow effect for custom alpha values
  protected createGlowEffect(): void {
    if (this.glowEffect) {
      this.glowEffect.destroy();
    }

    this.glowEffect = this.scene.add.graphics();
    this.glowEffect.lineStyle(4, this.getGlowColor(), 0.9); // Higher alpha for Pepe
    this.glowEffect.strokeCircle(0, 0, this.interactionRadius);
    this.add(this.glowEffect);
    this.sendToBack(this.glowEffect);

    // Create pulsing animation with custom alpha range
    this.scene.tweens.add({
      targets: this.glowEffect,
      alpha: { from: 0.4, to: 0.9 },
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  // Override to use simpler alpha transitions without scale animations
  protected onPlayerEnterRange(): void {
    console.log(`[${this.getBuildingName()}] Player entered interaction range`);
    if (this.glowEffect) this.glowEffect.setAlpha(1);
    if (this.promptText) this.promptText.setAlpha(1);
  }

  protected onPlayerExitRange(): void {
    console.log(`[${this.getBuildingName()}] Player exited interaction range`);
    if (this.glowEffect) this.glowEffect.setAlpha(0);
    if (this.promptText) this.promptText.setAlpha(0);
  }
}