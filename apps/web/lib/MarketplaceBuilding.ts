/**
 * MarketplaceBuilding - Interactive marketplace structure
 * Extends BaseInteractiveBuilding to handle marketplace-specific interactions
 */

import { BaseInteractiveBuilding } from './BaseInteractiveBuilding';

export class MarketplaceBuilding extends BaseInteractiveBuilding {
  protected getSpriteTexture(): string {
    return 'market';
  }

  protected getGlowColor(): number {
    return 0x4444ff; // Blue glow for marketplace
  }

  protected getPromptText(): string {
    return 'Press E to enter marketplace';
  }

  protected getEventName(): string {
    return 'marketplaceInteraction';
  }

  protected getBuildingName(): string {
    return '🏪 Marketplace';
  }

  // Override checkInteraction to add custom animation
  public checkInteraction(): boolean {
    if (this.isPlayerNear && this.interactionKey && Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      console.log(`[${this.getBuildingName()}] Interaction triggered!`);
      this.scene.events.emit(this.getEventName());

      // Visual feedback for interaction - press down animation
      this.scene.tweens.add({
        targets: this.buildingSprite,
        scaleX: this.getSpriteScale() * 0.9,
        scaleY: this.getSpriteScale() * 0.9,
        duration: 100,
        yoyo: true,
        ease: 'Power2',
      });

      return true;
    }
    return false;
  }

  // Override getCollisionBounds for custom collision area
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