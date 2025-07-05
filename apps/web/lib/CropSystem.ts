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

export type CropType = 
  | 'potato'
  | 'carrot'
  | 'tomato'
  | 'corn'
  | 'pumpkin'
  | 'watermelon'
  | 'strawberry'
  | 'cabbage'
  | 'lettuce'
  | 'pepper';

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
    growthTime: 30, // 30 seconds for demo
    spriteIndex: 0,
    stages: { seed: 0, sprout: 1, growing: 2, mature: 3, ready: 4 }
  },
  carrot: {
    name: 'Carrot',
    growthTime: 25,
    spriteIndex: 5,
    stages: { seed: 5, sprout: 6, growing: 7, mature: 8, ready: 9 }
  },
  tomato: {
    name: 'Tomato',
    growthTime: 40,
    spriteIndex: 10,
    stages: { seed: 10, sprout: 11, growing: 12, mature: 13, ready: 14 }
  },
  corn: {
    name: 'Corn',
    growthTime: 50,
    spriteIndex: 15,
    stages: { seed: 15, sprout: 16, growing: 17, mature: 18, ready: 19 }
  },
  pumpkin: {
    name: 'Pumpkin',
    growthTime: 60,
    spriteIndex: 20,
    stages: { seed: 20, sprout: 21, growing: 22, mature: 23, ready: 24 }
  },
  watermelon: {
    name: 'Watermelon',
    growthTime: 45,
    spriteIndex: 25,
    stages: { seed: 25, sprout: 26, growing: 27, mature: 28, ready: 29 }
  },
  strawberry: {
    name: 'Strawberry',
    growthTime: 20,
    spriteIndex: 30,
    stages: { seed: 30, sprout: 31, growing: 32, mature: 33, ready: 34 }
  },
  cabbage: {
    name: 'Cabbage',
    growthTime: 35,
    spriteIndex: 35,
    stages: { seed: 35, sprout: 36, growing: 37, mature: 38, ready: 39 }
  },
  lettuce: {
    name: 'Lettuce',
    growthTime: 15,
    spriteIndex: 40,
    stages: { seed: 40, sprout: 41, growing: 42, mature: 43, ready: 44 }
  },
  pepper: {
    name: 'Pepper',
    growthTime: 30,
    spriteIndex: 45,
    stages: { seed: 45, sprout: 46, growing: 47, mature: 48, ready: 49 }
  }
};

export class CropSystem {
  private crops: Map<string, CropData> = new Map();
  private scene: Phaser.Scene;
  private cropSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private cropSpritesheet: string = 'crops';
  
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

  create() {
    // Create crop sprites from loaded data
    this.crops.forEach((crop) => {
      this.createCropSprite(crop);
    });
  }

  /**
   * Plant a crop at the specified position
   */
  plantCrop(x: number, y: number, cropType: CropType): string {
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
    this.createCropSprite(cropData);
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
  harvestCrop(cropId: string): { success: boolean; reward?: string } {
    const crop = this.crops.get(cropId);
    if (!crop) return { success: false };
    
    if (crop.stage !== 'ready') {
      console.log(`🚫 Cannot harvest ${crop.type} - not ready yet (${crop.stage})`);
      return { success: false };
    }

    // Remove the crop
    this.removeCrop(cropId);
    
    // Calculate harvest reward
    const config = CROP_CONFIGS[crop.type];
    const reward = `Harvested ${config.name}!`;
    
    console.log(`🚜 Harvested ${crop.type}: ${reward}`);
    
    // Show harvest animation at crop location
    this.showHarvestEffect(crop.x, crop.y);
    
    return { success: true, reward };
  }

  /**
   * Get crop at specific position (for context menu detection)
   */
  getCropAtPosition(x: number, y: number, tolerance: number = 16): CropData | null {
    for (const crop of this.crops.values()) {
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
  update() {
    const now = Date.now();
    let updated = false;

    this.crops.forEach((crop) => {
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
    
    // Add click handler for crop information
    sprite.on('pointerdown', () => {
      console.log(`🌱 Clicked crop: ${crop.type} (${crop.stage})`);
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
    const farmingArea = {
      minX: 100,
      maxX: 700,
      minY: 180,
      maxY: 500
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
    const harvestText = this.scene.add.text(x, y, '🎉 Harvested!', {
      fontSize: '16px',
      color: '#FFD700',
      fontStyle: 'bold'
    });
    harvestText.setOrigin(0.5);
    
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
    this.crops.forEach((crop) => {
      this.removeCrop(crop.id);
    });
    localStorage.removeItem('defi-valley-crops');
  }
}