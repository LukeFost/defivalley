/**
 * Crop System - Handles both farming game mechanics and portfolio visualization
 * - Farming game: Plant, grow, and harvest crops for Gold
 * - Portfolio visualizer: Read-only display of on-chain DeFi positions
 */

import { CropEconomyConfig } from './EconomyConfig';
import { EventBus, GameEvents } from '../game/EventBus';

export interface CropData {
  id: string;
  type: CropType;
  x: number;
  y: number;
  plantedAt: number;
  stage: GrowthStage;
  lastWatered?: number;
  health: number;
  // Portfolio-specific data
  positionValue?: number; // in USD
  vbUSDCAmount?: number;
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

// Mapping based on crop_sprite_bounds_full.json
// Rows in JSON are 1-indexed, so we subtract 1 for 0-indexed array
// We pick 5 frames evenly distributed across available growth stages
export const CROP_CONFIGS: Record<CropType, CropConfig> = {
  potato: {
    name: 'Potato',
    growthTime: 30, // 30 seconds for MVP demo
    spriteIndex: 0, // Row 1 in JSON = index 0 (Russet potatoes)
    stages: { seed: 0, sprout: 1, growing: 2, mature: 3, ready: 4 }
  },
  carrot: {
    name: 'Carrot',
    growthTime: 30,
    spriteIndex: 6, // Row 7 in JSON = index 6 (Carrots)
    stages: { seed: 0, sprout: 8, growing: 16, mature: 24, ready: 31 }
  },
  lettuce: {
    name: 'Lettuce',
    growthTime: 30,
    spriteIndex: 14, // Row 15 in JSON = index 14 (Green onion as placeholder)
    stages: { seed: 0, sprout: 1, growing: 2, mature: 3, ready: 4 }
  },
  cabbage: {
    name: 'Cabbage',
    growthTime: 30,
    spriteIndex: 11, // Row 12 in JSON = index 11 (Beets as placeholder)
    stages: { seed: 0, sprout: 1, growing: 2, mature: 3, ready: 4 }
  },
  tomato: {
    name: 'Tomato',
    growthTime: 30,
    spriteIndex: 18, // Row 19 in JSON = index 18 (Red bell pepper as placeholder)
    stages: { seed: 0, sprout: 2, growing: 4, mature: 6, ready: 8 }
  },
  strawberry: {
    name: 'Strawberry',
    growthTime: 30,
    spriteIndex: 12, // Row 13 in JSON = index 12 (Turnips as placeholder)
    stages: { seed: 0, sprout: 1, growing: 2, mature: 3, ready: 4 }
  },
  watermelon: {
    name: 'Watermelon',
    growthTime: 30,
    spriteIndex: 25, // Row 26 in JSON = index 25 (Watermelon)
    stages: { seed: 29, sprout: 30, growing: 31, mature: 31, ready: 31 }
  },
  corn: {
    name: 'Corn',
    growthTime: 30,
    spriteIndex: 23, // Row 24 in JSON = index 23 (Acorn squash as placeholder)
    stages: { seed: 29, sprout: 30, growing: 31, mature: 31, ready: 31 }
  },
  pumpkin: {
    name: 'Pumpkin',
    growthTime: 30,
    spriteIndex: 24, // Row 25 in JSON = index 24 (Cantaloupe as placeholder)
    stages: { seed: 29, sprout: 30, growing: 31, mature: 31, ready: 31 }
  },
  pepper: {
    name: 'Pepper',
    growthTime: 30,
    spriteIndex: 17, // Row 18 in JSON = index 17 (Hot pepper)
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
   * Sync portfolio positions with on-chain data
   * Creates/updates/removes crops based on current positions
   */
  syncPositions(portfolioData: any) {
    if (!portfolioData) return;
    
    console.log('🔄 Syncing portfolio positions:', portfolioData);
    
    // For now, we'll visualize the vbUSDC position as a single crop
    const positionId = 'morpho_vbETH_position';
    const existingCrop = this.crops.get(positionId);
    
    if (portfolioData.vbUSDCAmount > 0) {
      // Position exists - create or update crop
      if (!existingCrop) {
        // Find an empty plot for the new position
        const emptyPlot = this.findEmptyPlot();
        if (emptyPlot) {
          const cropData: CropData = {
            id: positionId,
            type: this.getCropTypeByValue(portfolioData.vbUSDCAmount),
            x: emptyPlot.x,
            y: emptyPlot.y,
            plantedAt: Date.now(),
            stage: 'ready', // Portfolio positions are always "ready"
            health: 100,
            positionValue: portfolioData.vbUSDCAmount,
            vbUSDCAmount: portfolioData.vbUSDCAmount
          };
          
          this.crops.set(positionId, cropData);
          this.createCropSprite(cropData);
          console.log(`🌱 Created portfolio crop at (${emptyPlot.x}, ${emptyPlot.y})`);
        }
      } else {
        // Update existing crop
        existingCrop.positionValue = portfolioData.vbUSDCAmount;
        existingCrop.vbUSDCAmount = portfolioData.vbUSDCAmount;
        
        // Update crop appearance based on value
        const sprite = this.cropSprites.get(positionId);
        if (sprite) {
          // Scale based on position value (1x to 2x scale)
          const scale = 1 + Math.min(portfolioData.vbUSDCAmount / 1000, 1);
          sprite.setScale(scale);
        }
      }
    } else if (existingCrop) {
      // Position closed - remove crop
      this.removePortfolioCrop(positionId);
    }
    
    this.saveCropsToStorage();
  }

  /**
   * Find an empty plot for a new position
   */
  private findEmptyPlot(): { x: number; y: number } | null {
    // Define farm plot grid
    const plotSize = 64;
    const startX = 200;
    const startY = 300;
    const cols = 5;
    const rows = 3;
    
    // Check each plot position
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * plotSize + plotSize / 2;
        const y = startY + row * plotSize + plotSize / 2;
        
        // Check if this position is empty
        if (!this.getCropAtPosition(x, y, 32)) {
          return { x, y };
        }
      }
    }
    
    return null; // No empty plots
  }
  
  /**
   * Get crop type based on position value
   */
  private getCropTypeByValue(value: number): CropType {
    // Map value ranges to different crop types
    if (value < 10) return 'potato';
    if (value < 50) return 'carrot';
    if (value < 100) return 'lettuce';
    if (value < 500) return 'tomato';
    if (value < 1000) return 'watermelon';
    if (value < 5000) return 'corn';
    if (value < 10000) return 'pumpkin';
    return 'pepper'; // Highest value crops
  }
  
  /**
   * Remove a portfolio crop
   */
  private removePortfolioCrop(cropId: string): boolean {
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
   * Harvest a crop and give gold reward
   */
  harvestCrop(cropId: string): { success: boolean; reward?: string; goldReward?: number; xpReward?: number } {
    const crop = this.crops.get(cropId);
    
    // Cannot harvest portfolio crops
    if (!crop || crop.id.startsWith('morpho_')) {
      return { success: false };
    }
    
    // Check if crop is ready to harvest
    if (crop.stage !== 'ready') {
      return { success: false };
    }
    
    // Get economy configuration
    const economy = CropEconomyConfig[crop.type];
    const goldReward = economy.harvestYield;
    const xpReward = economy.xpReward;
    
    // Remove the crop
    const sprite = this.cropSprites.get(cropId);
    if (sprite) {
      // Show harvest effect
      this.showHarvestEffect(crop.x, crop.y, goldReward);
      
      // Remove sprite
      sprite.destroy();
      this.cropSprites.delete(cropId);
    }
    
    // Remove from data
    this.crops.delete(cropId);
    this.saveCropsToStorage();
    
    // Emit event to update player's gold in UI
    EventBus.emit(GameEvents.PLAYER_GOLD_UPDATED, goldReward);
    EventBus.emit(GameEvents.CROP_HARVESTED, {
      cropType: crop.type,
      goldReward,
      xpReward
    });
    
    console.log(`🌾 Harvested ${crop.type} for ${goldReward} gold!`);
    
    return {
      success: true,
      reward: `+${goldReward} Gold`,
      goldReward,
      xpReward
    };
  }
  
  // Deprecated - portfolio visualizer is read-only
  removeCrop(cropId: string): boolean {
    // For legacy compatibility only
    const crop = this.crops.get(cropId);
    if (!crop) return false;
    
    const sprite = this.cropSprites.get(cropId);
    if (sprite) {
      sprite.destroy();
      this.cropSprites.delete(cropId);
    }
    
    this.crops.delete(cropId);
    this.saveCropsToStorage();
    return true;
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

      // Portfolio crops don't grow - they're always ready
      if (crop.id.startsWith('morpho_')) {
        return;
      }
      
      // Growth logic for farming game crops
      const config = CROP_CONFIGS[crop.type];
      const economyConfig = CropEconomyConfig[crop.type];
      const timeElapsed = (now - crop.plantedAt) / 1000; // Convert to seconds
      const growthProgress = Math.min(timeElapsed / economyConfig.growthTime, 1);

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
    
    // Calculate the actual frame index in the sprite sheet
    // The sprite sheet has 32 columns per row (1024px / 32px = 32 columns)
    const frameIndex = config.spriteIndex * 32 + stageIndex;
    
    const sprite = this.scene.add.sprite(crop.x, crop.y, this.cropSpritesheet, frameIndex);
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
        const economyConfig = CropEconomyConfig[crop.type];
        const timeElapsed = (Date.now() - crop.plantedAt) / 1000;
        const growthProgress = Math.min(timeElapsed / economyConfig.growthTime, 1);
        const percentComplete = Math.floor(growthProgress * 100);
        const timeRemaining = Math.max(0, economyConfig.growthTime - timeElapsed);
        console.log(`🌱 ${crop.type} growth: ${percentComplete}% complete (${Math.ceil(timeRemaining)}s remaining)`);
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
    
    // Calculate the actual frame index in the sprite sheet
    // The sprite sheet has 32 columns per row (1024px / 32px = 32 columns)
    const frameIndex = config.spriteIndex * 32 + stageIndex;
    
    sprite.setFrame(frameIndex);
    
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
   * Check if a position is valid for planting
   */
  canPlantAt(x: number, y: number): boolean {
    // Check if there's already a crop at this position
    const existingCrop = this.getCropAtPosition(x, y, 32);
    if (existingCrop) {
      return false;
    }
    
    // Check if position is within farm plot bounds
    // This is a simplified check - you may want to integrate with your farm plot system
    return true;
  }
  
  /**
   * Plant a new crop at the specified position
   */
  plantCrop(type: CropType, x: number, y: number, playerId: string): { success: boolean; error?: string } {
    // Check if position is valid
    if (!this.canPlantAt(x, y)) {
      return { success: false, error: 'Cannot plant here' };
    }
    
    // Create new crop
    const cropId = `${playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cropData: CropData = {
      id: cropId,
      type,
      x,
      y,
      plantedAt: Date.now(),
      stage: 'seed',
      health: 100
    };
    
    // Add to crops
    this.crops.set(cropId, cropData);
    
    // Create sprite if in viewport
    const bounds = this.getViewportBounds();
    if (this.isInViewport(x, y, bounds)) {
      this.createCropSprite(cropData);
    }
    
    // Save to storage
    this.saveCropsToStorage();
    
    // Emit event
    EventBus.emit(GameEvents.CROP_PLANTED, {
      cropType: type,
      position: { x, y }
    });
    
    console.log(`🌱 Planted ${type} at (${x}, ${y})`);
    
    return { success: true };
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
  private showHarvestEffect(x: number, y: number, goldReward: number = 10) {
    // Create floating text effect
    const harvestText = this.scene.add.text(x, y, `🎉 +${goldReward} Gold!`, {
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
      // Use removePortfolioCrop for portfolio positions
      if (crop.id.startsWith('morpho_')) {
        this.removePortfolioCrop(crop.id);
      } else {
        this.removeCrop(crop.id);
      }
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