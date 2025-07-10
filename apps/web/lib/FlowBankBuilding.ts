/**
 * FlowBankBuilding - Interactive bank structure for Flow DeFi staking
 * Handles Flow bank sprite, collision detection, and player interaction
 * Supports FVIX staking and sFVIX vault operations
 */

import { BaseInteractiveBuilding } from './BaseInteractiveBuilding';

export class FlowBankBuilding extends BaseInteractiveBuilding {
  protected getSpriteTexture(): string {
    return "flow_bank";
  }

  protected getGlowColor(): number {
    return 0xffa500; // Orange glow for Flow vault
  }

  protected getPromptText(): string {
    return "Press E for Flow Vault";
  }

  protected getPromptBackgroundColor(): string {
    return "#ff6b35"; // Orange background to match the tint
  }

  protected getEventName(): string {
    return "flowBankInteraction";
  }

  protected getBuildingName(): string {
    return "🟠 Flow Bank";
  }

  protected getSpriteTint(): number | null {
    return 0xff6b35; // Orange tint for Flow DeFi vault
  }

  /**
   * Override checkInteraction to add visual feedback
   */
  public checkInteraction(): boolean {
    if (super.checkInteraction()) {
      // Visual feedback for interaction
      this.scene.tweens.add({
        targets: this.buildingSprite,
        scaleX: 0.36,
        scaleY: 0.36,
        duration: 100,
        yoyo: true,
        ease: "Power2",
      });
      return true;
    }
    return false;
  }
}