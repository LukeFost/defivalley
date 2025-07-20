/**
 * Crop System - Manages crop planting, growth, and harvesting
 * Handles crop state, sprite management, and interaction logic
 */

export interface CropData {
  id: string;
  type: CropType;
  x: number;
  y: number;
  plantedAt: number;
  stage: GrowthStage;
  lastWatered?: number;
  health: number;
}

export type CropType = 'potato' | 'carrot' | 'lettuce' | 'cabbage' | 'tomato' | 'strawberry' | 'watermelon' | 'corn' | 'pumpkin' | 'pepper';

export type GrowthStage = 
  | 'seed'
  | 'sprout'
  | 'growing'
  | 'mature'
  | 'ready';

export interface CropConfig {
  name: string;
  growthTime: number; // in seconds
  spriteIndex: number;
  stages: {
    seed: number;
    sprout: number;
    growing: number;
    mature: number;
    ready: number;
  };
}

export const CROP_CONFIGS: Record<CropType, CropConfig> = {
  potato: {
    name: 'Potato',
    growthTime: 30, // 30 seconds for MVP demo
    spriteIndex: 0,
    stages: { seed: 0, sprout: 1, growing: 2, mature: 3, ready: 4 }
  },
  carrot: {
    name: 'Carrot',
    growthTime: 30,
    spriteIndex: 1,
    stages: { seed: 0, sprout: 1, growing: 2, mature: 3, ready: 4 }
  },
  lettuce: {
    name: 'Lettuce',
    growthTime: 30,
    spriteIndex: 2,
    stages: { seed: 0, sprout: 1, growing: 2, mature: 3, ready: 4 }
  },
  cabbage: {
    name: 'Cabbage',
    growthTime: 30,
    spriteIndex: 3,
    stages: { seed: 0, sprout: 1, growing: 2, mature: 3, ready: 4 }
  },
  tomato: {
    name: 'Tomato',
    growthTime: 30,
    spriteIndex: 4,
    stages: { seed: 0, sprout: 1, growing: 2, mature: 3, ready: 4 }
  },
  strawberry: {
    name: 'Strawberry',
    growthTime: 30,
    spriteIndex: 5,
    stages: { seed: 0, sprout: 1, growing: 2, mature: 3, ready: 4 }
  },
  watermelon: {
    name: 'Watermelon',
    growthTime: 30,
    spriteIndex: 6,
    stages: { seed: 0, sprout: 1, growing: 2, mature: 3, ready: 4 }
  },
  corn: {
    name: 'Corn',
    growthTime: 30,
    spriteIndex: 7,
    stages: { seed: 0, sprout: 1, growing: 2, mature: 3, ready: 4 }
  },
  pumpkin: {
    name: 'Pumpkin',
    growthTime: 30,
    spriteIndex: 8,
    stages: { seed: 0, sprout: 1, growing: 2, mature: 3, ready: 4 }
  },
  pepper: {
    name: 'Pepper',
    growthTime: 30,
    spriteIndex: 9,
    stages: { seed: 0, sprout: 1, growing: 2, mature: 3, ready: 4 }
  }
};

export interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export class CropSystem {
  private crops: Map<string, CropData> = new Map();
  private scene: Phaser.Scene;
  private cropSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private cropSpritesheet: string = 'crops';
  private viewportPadding: number = 50; // Extra padding for viewport culling
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.loadCropsFromStorage();
  }

  preload() {
    // Load crop spritesheet
    this.scene.load.spritesheet(this.cropSpritesheet, '/sprites/crops-v2/crops.png', {
      frameWidth: 32,
      frameHeight: 32
    });
  }

  /**
   * Check if a position is within the viewport bounds
   */
  private isInViewport(x: number, y: number, bounds: ViewportBounds): boolean {
    return x >= bounds.left - this.viewportPadding &&
           x <= bounds.right + this.viewportPadding &&
           y >= bounds.top - this.viewportPadding &&
           y <= bounds.bottom + this.viewportPadding;
  }

  /**
   * Get current viewport bounds from camera
   */
  private getViewportBounds(): ViewportBounds {
    const camera = this.scene.cameras.main;
    return {
      left: camera.scrollX,
      right: camera.scrollX + camera.width,
      top: camera.scrollY,
      bottom: camera.scrollY + camera.height
    };
  }

  create() {
    // Create crop sprites from loaded data
    const viewportBounds = this.getViewportBounds();
    this.crops.forEach((crop) => {
      // Only create sprites for crops within viewport
      if (this.isInViewport(crop.x, crop.y, viewportBounds)) {
        this.createCropSprite(crop);
      }
    });
  }

  /**
   * Plant a crop at the specified position
   */
  plantCrop(x: number, y: number, cropType: CropType = 'potato'): string {
    const cropId = `crop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const cropData: CropData = {
      id: cropId,
      type: cropType,
      x,
      y,
      plantedAt: Date.now(),
      stage: 'seed',
      health: 100
    };

    this.crops.set(cropId, cropData);
    
    // Only create sprite if within viewport
    const viewportBounds = this.getViewportBounds();
    if (this.isInViewport(x, y, viewportBounds)) {
      this.createCropSprite(cropData);
    }
    
    this.saveCropsToStorage();
    
    console.log(`🌱 Planted ${cropType} at (${x}, ${y})`);
    return cropId;
  }

  /**
   * Remove a crop from the field
   */
  removeCrop(cropId: string): boolean {
    const crop = this.crops.get(cropId);
    if (!crop) return false;

    // Remove sprite
    const sprite = this.cropSprites.get(cropId);
    if (sprite) {
      sprite.destroy();
      this.cropSprites.delete(cropId);
    }

    // Remove from data
    this.crops.delete(cropId);
    this.saveCropsToStorage();
    
    console.log(`🗑️ Removed crop ${cropId}`);
    return true;
  }

  /**
   * Harvest a crop (only if ready)
   */
  harvestCrop(cropId: string): { success: boolean; reward?: string; goldReward?: number } {
    const crop = this.crops.get(cropId);
    if (!crop) return { success: false };
    
    if (crop.stage !== 'ready') {
      console.log(`🚫 Cannot harvest ${crop.type} - not ready yet (${crop.stage})`);
      return { success: false };
    }

    // Remove the crop
    this.removeCrop(cropId);
    
    // Calculate harvest reward - simple MVP: 10 gold per potato
    const config = CROP_CONFIGS[crop.type];
    const goldReward = 10; // Hardcoded for MVP
    const reward = `Harvested ${config.name}! +${goldReward} Gold`;
    
    console.log(`🚜 Harvested ${crop.type}: ${reward}`);
    
    // Show harvest animation at crop location
    this.showHarvestEffect(crop.x, crop.y);
    
    // Emit harvest event with gold reward
    this.scene.events.emit('cropHarvested', { cropId, goldReward });
    
    return { success: true, reward, goldReward };
  }

  /**
   * Get crop at specific position (for context menu detection)
   */
  getCropAtPosition(x: number, y: number, tolerance: number = 16): CropData | null {
    const crops = Array.from(this.crops.values());
    for (const crop of crops) {
      const distance = Math.sqrt(
        Math.pow(crop.x - x, 2) + Math.pow(crop.y - y, 2)
      );
      if (distance <= tolerance) {
        return crop;
      }
    }
    return null;
  }

  /**
   * Update crop growth stages
   */
  update(viewportBounds?: ViewportBounds) {
    const now = Date.now();
    let updated = false;

    // Get viewport bounds if not provided
    const bounds = viewportBounds || this.getViewportBounds();

    const crops = Array.from(this.crops.values());
    crops.forEach((crop) => {
      const isInView = this.isInViewport(crop.x, crop.y, bounds);
      const hasSprite = this.cropSprites.has(crop.id);

      // Handle sprite creation/destruction based on viewport
      if (isInView && !hasSprite) {
        // Crop entered viewport - create sprite
        this.createCropSprite(crop);
      } else if (!isInView && hasSprite) {
        // Crop left viewport - destroy sprite
        const sprite = this.cropSprites.get(crop.id);
        if (sprite) {
          sprite.destroy();
          this.cropSprites.delete(crop.id);
        }
      }

      // Only update crops within viewport
      if (!isInView) {
        return; // Skip animation updates for off-screen crops
      }

      const config = CROP_CONFIGS[crop.type];
      const timeElapsed = (now - crop.plantedAt) / 1000; // Convert to seconds
      const growthProgress = Math.min(timeElapsed / config.growthTime, 1);

      let newStage: GrowthStage;
      if (growthProgress >= 1) {
        newStage = 'ready';
      } else if (growthProgress >= 0.8) {
        newStage = 'mature';
      } else if (growthProgress >= 0.5) {
        newStage = 'growing';
      } else if (growthProgress >= 0.2) {
        newStage = 'sprout';
      } else {
        newStage = 'seed';
      }

      if (newStage !== crop.stage) {
        crop.stage = newStage;
        this.updateCropSprite(crop);
        updated = true;
      }
    });

    if (updated) {
      this.saveCropsToStorage();
    }
  }

  /**
   * Create visual sprite for crop
   */
  private createCropSprite(crop: CropData) {
    // Check if sprite already exists
    if (this.cropSprites.has(crop.id)) {
      return;
    }

    const config = CROP_CONFIGS[crop.type];
    const stageIndex = config.stages[crop.stage];
    
    const sprite = this.scene.add.sprite(crop.x, crop.y, this.cropSpritesheet, stageIndex);
    sprite.setOrigin(0.5, 0.5);
    sprite.setScale(1.5); // Make crops slightly bigger
    
    // Make sprite interactive for clicks
    sprite.setInteractive();
    
    // Add hover effects
    sprite.on('pointerover', () => {
      sprite.setTint(0xdddddd);
    });
    
    sprite.on('pointerout', () => {
      sprite.clearTint();
    });
    
    // Add click handler for crop information and harvesting
    sprite.on('pointerdown', () => {
      console.log(`🌱 Clicked crop: ${crop.type} (${crop.stage})`);
      
      // If crop is ready, harvest it
      if (crop.stage === 'ready') {
        this.harvestCrop(crop.id);
      } else {
        // Show growth progress
        const config = CROP_CONFIGS[crop.type];
        const timeElapsed = (Date.now() - crop.plantedAt) / 1000;
        const growthProgress = Math.min(timeElapsed / config.growthTime, 1);
        const percentComplete = Math.floor(growthProgress * 100);
        console.log(`🌱 Crop growth: ${percentComplete}% complete`);
      }
      
      // Emit event for crop info display
      this.scene.events.emit('cropClicked', crop);
    });
    
    // Add subtle animations
    this.scene.tweens.add({
      targets: sprite,
      scaleX: 1.6,
      scaleY: 1.4,
      duration: 2000 + Math.random() * 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.cropSprites.set(crop.id, sprite);
  }

  /**
   * Update crop sprite to match growth stage
   */
  private updateCropSprite(crop: CropData) {
    const sprite = this.cropSprites.get(crop.id);
    if (!sprite) return;

    const config = CROP_CONFIGS[crop.type];
    const stageIndex = config.stages[crop.stage];
    
    sprite.setFrame(stageIndex);
    
    // Add growth animation
    this.scene.tweens.add({
      targets: sprite,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 300,
      yoyo: true,
      ease: 'Back.easeOut'
    });
  }

  /**
   * Check if position is suitable for planting
   */
  canPlantAt(x: number, y: number): boolean {
    // Check if there's already a crop nearby
    const existingCrop = this.getCropAtPosition(x, y, 32);
    if (existingCrop) return false;

    // Check if position is within farming area bounds
    // Updated to match our 4x4 plot grid location
    const farmingArea = {
      minX: 600,
      maxX: 960,
      minY: 400,
      maxY: 760
    };

    return (
      x >= farmingArea.minX &&
      x <= farmingArea.maxX &&
      y >= farmingArea.minY &&
      y <= farmingArea.maxY
    );
  }

  /**
   * Get all crops
   */
  getAllCrops(): CropData[] {
    return Array.from(this.crops.values());
  }

  /**
   * Get crop by ID
   */
  getCrop(cropId: string): CropData | undefined {
    return this.crops.get(cropId);
  }

  /**
   * Get crop statistics
   */
  getCropStats() {
    const crops = Array.from(this.crops.values());
    return {
      total: crops.length,
      ready: crops.filter(crop => crop.stage === 'ready').length,
      growing: crops.filter(crop => crop.stage !== 'ready').length,
      byStage: {
        seed: crops.filter(crop => crop.stage === 'seed').length,
        sprout: crops.filter(crop => crop.stage === 'sprout').length,
        growing: crops.filter(crop => crop.stage === 'growing').length,
        mature: crops.filter(crop => crop.stage === 'mature').length,
        ready: crops.filter(crop => crop.stage === 'ready').length,
      }
    };
  }

  /**
   * Save crops to localStorage
   */
  private saveCropsToStorage() {
    if (typeof window === 'undefined') return;
    
    const cropsData = Array.from(this.crops.values());
    localStorage.setItem('defi-valley-crops', JSON.stringify(cropsData));
  }

  /**
   * Load crops from localStorage
   */
  private loadCropsFromStorage() {
    if (typeof window === 'undefined') return;
    
    const savedCrops = localStorage.getItem('defi-valley-crops');
    if (savedCrops) {
      try {
        const cropsData: CropData[] = JSON.parse(savedCrops);
        cropsData.forEach((crop) => {
          this.crops.set(crop.id, crop);
        });
      } catch (error) {
        console.error('Error loading crops from storage:', error);
      }
    }
  }

  /**
   * Show harvest effect animation
   */
  private showHarvestEffect(x: number, y: number) {
    // Create floating text effect
    const harvestText = this.scene.add.text(x, y, '🎉 +10 Gold!', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold'
    });
    harvestText.setOrigin(0.5);
    harvestText.setStroke('#000000', 4);
    
    // Animate the text
    this.scene.tweens.add({
      targets: harvestText,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        harvestText.destroy();
      }
    });
    
    // Create sparkle effect
    for (let i = 0; i < 6; i++) {
      const sparkle = this.scene.add.circle(
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 40,
        3,
        0xFFD700
      );
      
      this.scene.tweens.add({
        targets: sparkle,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 500 + Math.random() * 500,
        delay: Math.random() * 200,
        ease: 'Power2',
        onComplete: () => {
          sparkle.destroy();
        }
      });
    }
  }

  /**
   * Clear all crops (for development/reset)
   */
  clearAllCrops() {
    const crops = Array.from(this.crops.values());
    crops.forEach((crop) => {
      this.removeCrop(crop.id);
    });
    localStorage.removeItem('defi-valley-crops');
  }

  /**
   * Handle camera movement to update visible crops
   * Call this when the camera moves significantly
   */
  onCameraMove() {
    const viewportBounds = this.getViewportBounds();
    
    // Check all crops for viewport changes
    this.crops.forEach((crop) => {
      const isInView = this.isInViewport(crop.x, crop.y, viewportBounds);
      const hasSprite = this.cropSprites.has(crop.id);

      if (isInView && !hasSprite) {
        // Crop entered viewport - create sprite
        this.createCropSprite(crop);
      } else if (!isInView && hasSprite) {
        // Crop left viewport - destroy sprite
        const sprite = this.cropSprites.get(crop.id);
        if (sprite) {
          sprite.destroy();
          this.cropSprites.delete(crop.id);
        }
      }
    });
  }

  /**
   * Get number of active sprites (for debugging)
   */
  getActiveSpriteCount(): number {
    return this.cropSprites.size;
  }

  /**
   * Get total number of crops
   */
  getTotalCropCount(): number {
    return this.crops.size;
  }


  /**
   * Get a specific crop by ID
   */
  getCropById(cropId: string): CropData | undefined {
    return this.crops.get(cropId);
  }
}