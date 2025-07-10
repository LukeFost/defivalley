import { BaseInteractiveBuilding } from './BaseInteractiveBuilding';

/**
 * BankBuilding - Interactive bank structure for Morpho deposits
 * Extends BaseInteractiveBuilding to leverage common interaction functionality
 */
export class BankBuilding extends BaseInteractiveBuilding {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
  }

  // Implement abstract methods
  protected getSpriteTexture(): string {
    return 'bank';
  }

  protected getGlowColor(): number {
    return 0x00ff00; // Green glow for bank
  }

  protected getPromptText(): string {
    return 'Press E to enter bank';
  }

  protected getEventName(): string {
    return 'bankInteraction';
  }

  protected getBuildingName(): string {
    return '🏦 Bank';
  }

  // Override checkInteraction to add custom visual feedback
  public checkInteraction(): boolean {
    const result = super.checkInteraction();
    
    if (result) {
      // Add custom visual feedback for bank interaction
      this.scene.tweens.add({
        targets: this.buildingSprite,
        scaleX: this.getSpriteScale() * 0.9,
        scaleY: this.getSpriteScale() * 0.9,
        duration: 100,
        yoyo: true,
        ease: "Power2",
      });
    }
    
    return result;
  }

  // Override getCollisionBounds for custom collision size
  public getCollisionBounds(): Phaser.Geom.Rectangle {
    // Return a rectangle slightly smaller than the sprite for better collision feel
    const width = this.buildingSprite.displayWidth * 0.8;
    const height = this.buildingSprite.displayHeight * 0.8;
    return new Phaser.Geom.Rectangle(
      this.x - width / 2,
      this.y - height / 2,
      width,
      height
    );
  }
}
