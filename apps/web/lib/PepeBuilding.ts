/**
 * PepeBuilding - A unified building that combines Pepe character interaction with Flow pump launch functionality
 * This building serves as both a character encounter and a functional DeFi launchpad
 */

import { GameConfig } from './GameConfig';

export class PepeBuilding extends Phaser.GameObjects.Container {
  private buildingSprite: Phaser.GameObjects.Sprite;
  private glowEffect?: Phaser.GameObjects.Graphics;
  private interactionZone: Phaser.Geom.Circle;
  private isPlayerNear: boolean = false;
  private interactionRadius: number = GameConfig.BUILDING_INTERACTION_RADIUS;
  public scene: Phaser.Scene;
  private interactionKey?: Phaser.Input.Keyboard.Key;
  private promptText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.scene = scene;

    // Define a unique key for the building animation
    const animKey = 'pepe_building_idle';

    // Create the animation from the loaded atlas if it doesn't already exist
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNames('pepe_building_anim', {
          prefix: 'Untitled_Artwork-',
          suffix: '.png',
          start: 1,
          end: 15, // There are 15 frames in your building_pepe.json
        }),
        frameRate: 10,
        repeat: -1, // Loop forever
      });
    }

    // Create the sprite using the new animation atlas and play the animation
    this.buildingSprite = scene.add.sprite(0, 0, 'pepe_building_anim');
    this.buildingSprite.setScale(1.2); // Increased sprite size by 1.5x (0.8 * 1.5 = 1.2)
    this.buildingSprite.play(animKey); // Play the animation
    this.add(this.buildingSprite);

    // Define interaction zone
    this.interactionZone = new Phaser.Geom.Circle(x, y, this.interactionRadius);

    this.createGlowEffect();
    this.createPromptText();

    this.interactionKey = scene.input.keyboard?.addKey("E");
    scene.add.existing(this);
    this.setDepth(GameConfig.BUILDING_DEPTH);

    console.log("🐸 Pepe's Pump Launchpad created at", x, y);
  }

  private createGlowEffect() {
    this.glowEffect = this.scene.add.graphics();
    this.glowEffect.lineStyle(GameConfig.BUILDING_GLOW_LINE_WIDTH, 0x32cd32, 0.9); // Pepe green glow
    this.glowEffect.strokeCircle(0, 0, this.interactionRadius);
    this.glowEffect.setAlpha(0);
    this.add(this.glowEffect);

    this.scene.tweens.add({
      targets: this.glowEffect,
      alpha: { from: 0.4, to: 0.9 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private createPromptText() {
    this.promptText = this.scene.add.text(0, -60, "Press E for Pepe's Pump Launchpad", {
      fontSize: "16px",
      color: "#ffffff",
      backgroundColor: "#228b22",
      padding: { x: 8, y: 4 },
    });
    this.promptText.setOrigin(0.5);
    this.promptText.setAlpha(0);
    this.add(this.promptText);
  }

  public checkPlayerProximity(playerX: number, playerY: number): boolean {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    const wasNear = this.isPlayerNear;
    this.isPlayerNear = distance <= this.interactionRadius;

    if (this.isPlayerNear !== wasNear) {
      this.isPlayerNear ? this.onPlayerEnterRange() : this.onPlayerExitRange();
    }
    return this.isPlayerNear;
  }

  private onPlayerEnterRange() {
    if (this.glowEffect) this.glowEffect.setAlpha(1);
    if (this.promptText) this.promptText.setAlpha(1);
  }

  private onPlayerExitRange() {
    if (this.glowEffect) this.glowEffect.setAlpha(0);
    if (this.promptText) this.promptText.setAlpha(0);
  }

  public checkInteraction(): boolean {
    if (this.isPlayerNear && this.interactionKey && Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      console.log("🐸 Pepe's Pump Launchpad interaction triggered!");
      this.scene.events.emit("pepeInteraction");
      return true;
    }
    return false;
  }
  
  public getCollisionBounds(): Phaser.Geom.Rectangle {
    // Use original sprite size (before 1.2x scaling) for collision bounds
    const originalWidth = this.buildingSprite.width * 0.8;
    const originalHeight = this.buildingSprite.height * 0.8;
    return new Phaser.Geom.Rectangle(this.x - originalWidth / 2, this.y - originalHeight / 2, originalWidth, originalHeight);
  }

  public checkCollision(x: number, y: number): boolean {
    return this.getCollisionBounds().contains(x, y);
  }
  
}