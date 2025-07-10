/**
 * FlowMarketplaceBuilding - Interactive marketplace structure for Flow DeFi
 * Handles Flow marketplace sprite, collision detection, and player interaction
 * Supports FLOW->FROTH swaps and PunchSwap integration
 */

import { BaseInteractiveBuilding } from './BaseInteractiveBuilding';

export class FlowMarketplaceBuilding extends BaseInteractiveBuilding {
  protected getSpriteTexture(): string {
    return "flow_market";
  }

  protected getGlowColor(): number {
    return 0xff00ff; // Purple/magenta glow for Flow
  }

  protected getPromptText(): string {
    return "Press E for Flow DeFi";
  }

  protected getPromptBackgroundColor(): string {
    return "#9932cc"; // Purple background for Flow
  }

  protected getEventName(): string {
    return "flowMarketplaceInteraction";
  }

  protected getBuildingName(): string {
    return "🟣 Flow Marketplace";
  }

  // Override checkInteraction to add custom visual feedback
  public checkInteraction(): boolean {
    if (this.isPlayerNear && this.interactionKey && Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      console.log(`[${this.getBuildingName()}] interaction triggered!`);
      this.scene.events.emit(this.getEventName());

      // Custom visual feedback for interaction
      this.scene.tweens.add({
        targets: this.buildingSprite,
        scaleX: this.getSpriteScale() * 0.9,
        scaleY: this.getSpriteScale() * 0.9,
        duration: 100,
        yoyo: true,
        ease: "Power2",
      });

      return true;
    }
    return false;
  }
}