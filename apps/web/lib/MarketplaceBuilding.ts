/**
 * MarketplaceBuilding - Interactive marketplace structure
 * Handles marketplace sprite, collision detection, and player interaction
 */

export class MarketplaceBuilding extends Phaser.GameObjects.Container {
  private marketplaceSprite: Phaser.GameObjects.Sprite;
  private glowEffect?: Phaser.GameObjects.Graphics;
  private interactionZone: Phaser.Geom.Circle;
  private isPlayerNear: boolean = false;
  private interactionRadius: number = 250; // Extra large radius for easy interaction
  public scene: Phaser.Scene; // Made public to match Phaser Container type
  private interactionKey?: Phaser.Input.Keyboard.Key;
  private promptText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.scene = scene;

    // Create marketplace sprite
    this.marketplaceSprite = scene.add.sprite(0, 0, "market");
    this.marketplaceSprite.setScale(0.4); // Same scale as bank
    this.add(this.marketplaceSprite);

    // Create interaction zone
    this.interactionZone = new Phaser.Geom.Circle(x, y, this.interactionRadius);

    // Create glow effect (initially hidden)
    this.createGlowEffect();

    // Create interaction prompt (initially hidden)
    this.createPromptText();

    // Set up interaction key
    this.interactionKey = scene.input.keyboard?.addKey("E");

    // Add this container to the scene
    scene.add.existing(this);

    // Set depth to be above ground but below UI
    this.setDepth(10);

    console.log("🏪 Marketplace building created at", x, y);
  }

  private createGlowEffect() {
    this.glowEffect = this.scene.add.graphics();
    this.glowEffect.lineStyle(4, 0x4444ff, 0.8); // Blue glow for marketplace
    this.glowEffect.strokeCircle(0, 0, this.interactionRadius);
    this.glowEffect.setAlpha(0);
    this.add(this.glowEffect);

    // Add pulsing animation
    this.scene.tweens.add({
      targets: this.glowEffect,
      alpha: { from: 0.3, to: 0.8 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private createPromptText() {
    this.promptText = this.scene.add.text(0, -60, "Press E to enter marketplace", {
      fontSize: "16px",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 8, y: 4 },
    });
    this.promptText.setOrigin(0.5);
    this.promptText.setAlpha(0);
    this.add(this.promptText);
  }

  /**
   * Check if a player is within interaction range
   */
  checkPlayerProximity(playerX: number, playerY: number): boolean {
    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      playerX,
      playerY
    );
    const wasNear = this.isPlayerNear;
    this.isPlayerNear = distance <= this.interactionRadius;

    // Update visual feedback
    if (this.isPlayerNear !== wasNear) {
      if (this.isPlayerNear) {
        this.onPlayerEnterRange();
      } else {
        this.onPlayerExitRange();
      }
    }

    return this.isPlayerNear;
  }

  private onPlayerEnterRange() {
    console.log("🏪 Player entered marketplace interaction range");

    // Show glow effect
    if (this.glowEffect) {
      this.scene.tweens.add({
        targets: this.glowEffect,
        alpha: 1,
        duration: 300,
        ease: "Power2",
      });
    }

    // Show prompt text
    if (this.promptText) {
      this.scene.tweens.add({
        targets: this.promptText,
        alpha: 1,
        y: -70,
        duration: 300,
        ease: "Back.easeOut",
      });
    }

    // Add slight scale animation to marketplace
    this.scene.tweens.add({
      targets: this.marketplaceSprite,
      scaleX: 0.42,
      scaleY: 0.42,
      duration: 300,
      ease: "Back.easeOut",
    });
  }

  private onPlayerExitRange() {
    console.log("🏪 Player exited marketplace interaction range");

    // Hide glow effect
    if (this.glowEffect) {
      this.scene.tweens.add({
        targets: this.glowEffect,
        alpha: 0,
        duration: 300,
        ease: "Power2",
      });
    }

    // Hide prompt text
    if (this.promptText) {
      this.scene.tweens.add({
        targets: this.promptText,
        alpha: 0,
        y: -60,
        duration: 300,
        ease: "Power2",
      });
    }

    // Reset marketplace scale
    this.scene.tweens.add({
      targets: this.marketplaceSprite,
      scaleX: 0.4,
      scaleY: 0.4,
      duration: 300,
      ease: "Power2",
    });
  }

  /**
   * Check if interaction key was pressed while player is near
   */
  checkInteraction(): boolean {
    if (
      this.isPlayerNear &&
      this.interactionKey &&
      Phaser.Input.Keyboard.JustDown(this.interactionKey)
    ) {
      console.log("🏪 Marketplace interaction triggered!");
      this.scene.events.emit("marketplaceInteraction");

      // Visual feedback for interaction
      this.scene.tweens.add({
        targets: this.marketplaceSprite,
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

  /**
   * Get the marketplace's collision bounds for physics
   */
  getCollisionBounds(): Phaser.Geom.Rectangle {
    // Return a rectangle slightly smaller than the sprite for better collision feel
    const width = this.marketplaceSprite.displayWidth * 0.8;
    const height = this.marketplaceSprite.displayHeight * 0.8;
    return new Phaser.Geom.Rectangle(
      this.x - width / 2,
      this.y - height / 2,
      width,
      height
    );
  }

  /**
   * Check if a point collides with the marketplace building
   */
  checkCollision(x: number, y: number): boolean {
    const bounds = this.getCollisionBounds();
    return bounds.contains(x, y);
  }

  /**
   * Update method to be called from scene update
   */
  update() {
    // Additional update logic if needed
  }

}