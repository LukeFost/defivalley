/**
 * InteractiveFarmPlot - Interactive farming plot with context menu support
 * Allows players to plant, water, and harvest crops
 */

import { CropData, CropType, CROP_CONFIGS } from './CropSystem';
import { eventBus } from './systems/EventBus';

export interface PlotState {
  id: string;
  gridX: number;
  gridY: number;
  isEmpty: boolean;
  crop?: CropData;
  isHovered: boolean;
  isSelected: boolean;
}

export class InteractiveFarmPlot extends Phaser.GameObjects.Container {
  private plotState: PlotState;
  private plotGraphics: Phaser.GameObjects.Graphics;
  private cropSprite?: Phaser.GameObjects.Sprite;
  private cropGraphics?: Phaser.GameObjects.Graphics;
  private hoverGraphics: Phaser.GameObjects.Graphics;
  private plotSize: number;
  private interactive: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number, gridX: number, gridY: number, plotSize: number = 80) {
    super(scene, x, y);
    
    this.plotSize = plotSize;
    this.plotState = {
      id: `plot_${gridX}_${gridY}`,
      gridX,
      gridY,
      isEmpty: true,
      isHovered: false,
      isSelected: false
    };

    // Bind methods to preserve context
    this.harvestCrop = this.harvestCrop.bind(this);
    this.plantCrop = this.plantCrop.bind(this);
    this.waterCrop = this.waterCrop.bind(this);

    // Create plot background
    this.plotGraphics = scene.add.graphics();
    this.drawPlot();
    this.add(this.plotGraphics);

    // Create hover overlay
    this.hoverGraphics = scene.add.graphics();
    this.hoverGraphics.setVisible(false);
    this.add(this.hoverGraphics);

    // Set up interactivity
    this.setSize(plotSize, plotSize);
    this.setInteractive();
    this.setupEventHandlers();

    scene.add.existing(this);
  }

  private drawPlot(): void {
    this.plotGraphics.clear();
    
    // Draw soil background
    this.plotGraphics.fillStyle(0x654321, 0.8);
    this.plotGraphics.fillRect(-this.plotSize / 2, -this.plotSize / 2, this.plotSize, this.plotSize);
    
    // Draw border
    this.plotGraphics.lineStyle(2, 0x8B4513, 1);
    this.plotGraphics.strokeRect(-this.plotSize / 2, -this.plotSize / 2, this.plotSize, this.plotSize);
    
    // Draw grid lines for visual appeal
    this.plotGraphics.lineStyle(1, 0x8B4513, 0.3);
    const gridLines = 4;
    const gridSize = this.plotSize / gridLines;
    
    for (let i = 1; i < gridLines; i++) {
      // Vertical lines
      const x = -this.plotSize / 2 + i * gridSize;
      this.plotGraphics.moveTo(x, -this.plotSize / 2);
      this.plotGraphics.lineTo(x, this.plotSize / 2);
      
      // Horizontal lines
      const y = -this.plotSize / 2 + i * gridSize;
      this.plotGraphics.moveTo(-this.plotSize / 2, y);
      this.plotGraphics.lineTo(this.plotSize / 2, y);
    }
    this.plotGraphics.strokePath();
  }

  private drawHoverEffect(): void {
    this.hoverGraphics.clear();
    
    if (this.plotState.isHovered) {
      // Draw glowing border
      this.hoverGraphics.lineStyle(3, 0x00FF00, 0.8);
      this.hoverGraphics.strokeRect(-this.plotSize / 2, -this.plotSize / 2, this.plotSize, this.plotSize);
      
      // Draw corner indicators
      const cornerSize = 8;
      this.hoverGraphics.fillStyle(0x00FF00, 0.8);
      
      // Top-left corner
      this.hoverGraphics.fillRect(-this.plotSize / 2, -this.plotSize / 2, cornerSize, cornerSize);
      // Top-right corner
      this.hoverGraphics.fillRect(this.plotSize / 2 - cornerSize, -this.plotSize / 2, cornerSize, cornerSize);
      // Bottom-left corner
      this.hoverGraphics.fillRect(-this.plotSize / 2, this.plotSize / 2 - cornerSize, cornerSize, cornerSize);
      // Bottom-right corner
      this.hoverGraphics.fillRect(this.plotSize / 2 - cornerSize, this.plotSize / 2 - cornerSize, cornerSize, cornerSize);
    }
  }

  private setupEventHandlers(): void {
    // Hover effects
    this.on('pointerover', () => {
      if (!this.interactive) return;
      this.plotState.isHovered = true;
      this.hoverGraphics.setVisible(true);
      this.drawHoverEffect();
      this.scene.input.setDefaultCursor('pointer');
    });

    this.on('pointerout', () => {
      this.plotState.isHovered = false;
      this.hoverGraphics.setVisible(false);
      this.scene.input.setDefaultCursor('default');
    });

    // Click handling
    this.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.interactive) return;
      
      if (pointer.rightButtonDown()) {
        // Right click - open context menu
        this.openContextMenu(pointer);
      } else {
        // Left click - select plot
        this.selectPlot();
      }
    });
  }

  private openContextMenu(pointer: Phaser.Input.Pointer): void {
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    
    eventBus.emit('plot:contextMenu', {
      plotId: this.plotState.id,
      x: worldPoint.x,
      y: worldPoint.y,
      screenX: pointer.x,
      screenY: pointer.y,
      isEmpty: this.plotState.isEmpty,
      crop: this.plotState.crop,
      gridX: this.plotState.gridX,
      gridY: this.plotState.gridY
    });
  }

  private selectPlot(): void {
    this.plotState.isSelected = !this.plotState.isSelected;
    
    eventBus.emit('plot:selected', {
      plotId: this.plotState.id,
      isSelected: this.plotState.isSelected,
      gridX: this.plotState.gridX,
      gridY: this.plotState.gridY
    });
  }

  public plantCrop(cropType: CropType, cropData: CropData): void {
    if (!this.plotState.isEmpty) {
      console.warn('Plot already has a crop!');
      return;
    }

    this.plotState.isEmpty = false;
    this.plotState.crop = cropData;

    // Check if the crops texture is loaded
    if (!this.scene.textures.exists('crops')) {
      console.error('Crops texture not loaded! Falling back to simple graphics.');
      // Fallback to simple graphics
      this.cropGraphics = this.scene.add.graphics();
      this.cropGraphics.fillStyle(this.getCropColor(cropType), 0.8);
      
      // Size based on growth stage
      let size = 10; // seed
      if (cropData.stage === 'sprout') size = 15;
      else if (cropData.stage === 'growing') size = 20;
      else if (cropData.stage === 'mature') size = 25;
      else if (cropData.stage === 'ready') size = 30;
      
      this.cropGraphics.fillCircle(0, 0, size);
      this.add(this.cropGraphics);
    } else {
      // Create proper sprite from crops.png
      const config = CROP_CONFIGS[cropType];
      const stageIndex = config.stages[cropData.stage];
      
      // Calculate the actual frame index in the sprite sheet
      // The sprite sheet has 32 columns per row (1024px / 32px = 32 columns)
      const frameIndex = config.spriteIndex * 32 + stageIndex;
      
      console.log(`🌱 Planting ${cropType} with frame ${frameIndex} (row ${config.spriteIndex}, stage ${stageIndex})`);
      
      // Create the sprite
      this.cropSprite = this.scene.add.sprite(0, 0, 'crops', frameIndex);
      this.cropSprite.setOrigin(0.5, 0.5);
      this.cropSprite.setScale(1.5); // Make crops slightly bigger
      this.add(this.cropSprite);
      
      // Add subtle animation
      this.scene.tweens.add({
        targets: this.cropSprite,
        scaleX: 1.6,
        scaleY: 1.4,
        duration: 2000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // Emit event
    eventBus.emit('plot:planted', {
      plotId: this.plotState.id,
      cropType,
      cropData
    });
  }

  public harvestCrop(): CropData | null {
    if (this.plotState.isEmpty || !this.plotState.crop) {
      return null;
    }

    const harvestedCrop = this.plotState.crop;
    
    // Clear the plot state but keep the plot
    this.plotState.isEmpty = true;
    this.plotState.crop = undefined;
    
    // Only remove the crop visual, not the entire plot
    if (this.cropSprite) {
      this.cropSprite.destroy();
      this.cropSprite = undefined;
    }
    if (this.cropGraphics) {
      this.cropGraphics.destroy();
      this.cropGraphics = undefined;
    }

    // Emit event
    eventBus.emit('plot:harvested', {
      plotId: this.plotState.id,
      cropData: harvestedCrop
    });

    return harvestedCrop;
  }

  public waterCrop(): void {
    if (this.plotState.isEmpty || !this.plotState.crop) {
      return;
    }

    // Update crop's last watered time
    this.plotState.crop.lastWatered = Date.now();

    // Visual feedback - water droplet animation
    const waterDrop = this.scene.add.circle(0, -20, 5, 0x0080FF, 0.8);
    this.add(waterDrop);

    this.scene.tweens.add({
      targets: waterDrop,
      y: 0,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => waterDrop.destroy()
    });

    // Emit event
    eventBus.emit('plot:watered', {
      plotId: this.plotState.id,
      cropData: this.plotState.crop
    });
  }
  
  public updateCropGrowth(newStage: 'seed' | 'sprout' | 'growing' | 'mature' | 'ready'): void {
    if (!this.plotState.crop) return;
    
    // Update the crop data
    this.plotState.crop.stage = newStage;
    
    if (this.cropSprite) {
      // Update the sprite to show new growth stage
      const config = CROP_CONFIGS[this.plotState.crop.type];
      const stageIndex = config.stages[newStage];
      const frameIndex = config.spriteIndex * 32 + stageIndex;
      
      this.cropSprite.setFrame(frameIndex);
      
      // Add growth animation
      this.scene.tweens.add({
        targets: this.cropSprite,
        scaleX: 1.8,
        scaleY: 1.8,
        duration: 300,
        yoyo: true,
        ease: 'Back.easeOut'
      });
    } else if (this.cropGraphics) {
      // Update the graphics-based crop
      this.cropGraphics.clear();
      this.cropGraphics.fillStyle(this.getCropColor(this.plotState.crop.type), 0.8);
      
      // Size based on growth stage
      let size = 10; // seed
      if (newStage === 'sprout') size = 15;
      else if (newStage === 'growing') size = 20;
      else if (newStage === 'mature') size = 25;
      else if (newStage === 'ready') size = 30;
      
      this.cropGraphics.fillCircle(0, 0, size);
      
      // Add simple scale animation
      this.scene.tweens.add({
        targets: this.cropGraphics,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 300,
        yoyo: true,
        ease: 'Back.easeOut'
      });
    }
  }

  private getCropColor(cropType: CropType): number {
    const colors: Record<CropType, number> = {
      potato: 0x8B4513,
      carrot: 0xFF6B35,
      lettuce: 0x90EE90,
      cabbage: 0x228B22,
      tomato: 0xFF6347,
      strawberry: 0xFF1493,
      watermelon: 0x2E8B57,
      corn: 0xFFD700,
      pumpkin: 0xFF8C00,
      pepper: 0xFF0000
    };
    return colors[cropType] || 0x808080;
  }

  public getPlotState(): PlotState {
    return { ...this.plotState };
  }

  public setInteractivity(enabled: boolean): void {
    this.interactive = enabled;
    this.setInteractive(enabled);
  }

  public destroy(): void {
    this.removeAllListeners();
    super.destroy();
  }
}
