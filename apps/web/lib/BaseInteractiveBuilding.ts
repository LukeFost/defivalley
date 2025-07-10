import * as Phaser from 'phaser';

export abstract class BaseInteractiveBuilding extends Phaser.GameObjects.Container {
  protected buildingSprite!: Phaser.GameObjects.Sprite;
  protected glowEffect?: Phaser.GameObjects.Graphics;
  protected interactionZone: Phaser.Geom.Circle;
  protected isPlayerNear: boolean = false;
  protected interactionRadius: number = 250;
  protected interactionKey?: Phaser.Input.Keyboard.Key;
  protected promptText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    
    // Create the building sprite using abstract method
    this.buildingSprite = scene.add.sprite(0, 0, this.getSpriteTexture());
    this.buildingSprite.setScale(this.getSpriteScale());
    
    // Set sprite origin to bottom-center for proper 2.5D depth sorting
    this.buildingSprite.setOrigin(0.5, 1);
    
    // Apply optional tint
    const tint = this.getSpriteTint();
    if (tint) {
      this.buildingSprite.setTint(tint);
    }
    
    // Handle animated sprites
    if (this.isAnimatedSprite()) {
      this.setupAnimation();
    }
    
    // Add sprite to container
    this.add(this.buildingSprite);
    
    // Remove fixed depth - will be handled by depth group sorting
    // this.setDepth(10);
    
    // Create interaction zone (circular area around building)
    this.interactionZone = new Phaser.Geom.Circle(0, 0, this.interactionRadius);
    
    // Add to scene
    scene.add.existing(this);
    
    // Setup keyboard listener
    this.interactionKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    
    // Log creation
    console.log(`[${this.getBuildingName()}] Created at position (${x}, ${y})`);
  }

  protected createGlowEffect(): void {
    if (this.glowEffect) {
      this.glowEffect.destroy();
    }

    this.glowEffect = this.scene.add.graphics();
    this.glowEffect.lineStyle(4, this.getGlowColor(), 0.5);
    this.glowEffect.strokeCircle(0, 0, this.interactionRadius);
    this.add(this.glowEffect);
    this.sendToBack(this.glowEffect);

    // Create pulsing animation
    this.scene.tweens.add({
      targets: this.glowEffect,
      alpha: { from: 0.3, to: 0.8 },
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  protected createPromptText(): void {
    if (this.promptText) {
      this.promptText.destroy();
    }

    const promptY = this.buildingSprite.displayHeight / 2 + 40;
    
    this.promptText = this.scene.add.text(0, promptY, this.getPromptText(), {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: this.getPromptBackgroundColor(),
      padding: { x: 10, y: 5 },
      align: 'center'
    });
    
    this.promptText.setOrigin(0.5);
    this.add(this.promptText);

    // Fade in animation
    this.promptText.setAlpha(0);
    this.scene.tweens.add({
      targets: this.promptText,
      alpha: 1,
      duration: 200,
      ease: 'Power2'
    });
  }

  public checkPlayerProximity(playerX: number, playerY: number): boolean {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    const wasNear = this.isPlayerNear;
    this.isPlayerNear = distance <= this.interactionRadius;

    if (this.isPlayerNear && !wasNear) {
      this.onPlayerEnterRange();
    } else if (!this.isPlayerNear && wasNear) {
      this.onPlayerExitRange();
    }

    return this.isPlayerNear;
  }

  protected onPlayerEnterRange(): void {
    console.log(`[${this.getBuildingName()}] Player entered interaction range`);
    this.createGlowEffect();
    this.createPromptText();
    
    // Scale up animation
    this.scene.tweens.add({
      targets: this.buildingSprite,
      scaleX: this.getSpriteScale() * 1.05,
      scaleY: this.getSpriteScale() * 1.05,
      duration: 200,
      ease: 'Back.easeOut'
    });
  }

  protected onPlayerExitRange(): void {
    console.log(`[${this.getBuildingName()}] Player exited interaction range`);
    
    if (this.glowEffect) {
      this.scene.tweens.killTweensOf(this.glowEffect);
      this.glowEffect.destroy();
      this.glowEffect = undefined;
    }
    
    if (this.promptText) {
      this.scene.tweens.add({
        targets: this.promptText,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          this.promptText?.destroy();
          this.promptText = undefined;
        }
      });
    }
    
    // Scale back to normal
    this.scene.tweens.add({
      targets: this.buildingSprite,
      scaleX: this.getSpriteScale(),
      scaleY: this.getSpriteScale(),
      duration: 200,
      ease: 'Back.easeIn'
    });
  }

  public checkInteraction(): boolean {
    if (this.isPlayerNear && this.interactionKey?.isDown) {
      console.log(`[${this.getBuildingName()}] Interaction triggered`);
      this.scene.events.emit(this.getEventName());
      return true;
    }
    return false;
  }

  public getCollisionBounds(): Phaser.Geom.Rectangle {
    const bounds = this.buildingSprite.getBounds();
    return new Phaser.Geom.Rectangle(
      this.x - bounds.width / 2,
      this.y - bounds.height / 2,
      bounds.width,
      bounds.height
    );
  }

  public checkCollision(x: number, y: number): boolean {
    const bounds = this.getCollisionBounds();
    return bounds.contains(x, y);
  }

  public update(): void {
    // Override in subclasses if needed
  }

  // Abstract methods that subclasses must implement
  protected abstract getSpriteTexture(): string;
  protected abstract getGlowColor(): number;
  protected abstract getPromptText(): string;
  protected abstract getEventName(): string;
  protected abstract getBuildingName(): string;
  
  // Virtual methods with defaults that can be overridden
  protected getSpriteScale(): number {
    return 0.4;
  }
  
  protected getPromptBackgroundColor(): string {
    return '#000000aa';
  }
  
  protected getSpriteTint(): number | null {
    return null;
  }
  
  protected isAnimatedSprite(): boolean {
    return false;
  }
  
  protected setupAnimation(): void {
    // Override in subclasses for animated sprites
  }
}