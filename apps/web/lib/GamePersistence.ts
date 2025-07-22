/**
 * Game Persistence Layer - Saves and loads game state using localStorage
 * Handles offline progress calculation for crops
 */

import { CropData, CropType, GrowthStage, CROP_CONFIGS } from './CropSystem';
import { CropEconomyConfig } from './EconomyConfig';

export interface SavedGameState {
  version: number;
  lastSaved: number;
  player: {
    gold: number;
    level: number;
    experience: number;
  };
  plots: SavedPlotState[];
}

export interface SavedPlotState {
  plotId: string;
  gridX: number;
  gridY: number;
  crop?: SavedCropData;
}

export interface SavedCropData {
  id: string;
  type: CropType;
  plantedAt: number;
  lastWatered?: number;
  // We don't save stage or health as these are calculated on load
}

const STORAGE_KEY = 'defivalley_gamestate';
const CURRENT_VERSION = 1;

export class GamePersistence {
  /**
   * Save the current game state to localStorage
   */
  static saveGameState(
    playerGold: number,
    playerLevel: number = 1,
    playerExperience: number = 0,
    plots: Array<{ plotId: string; gridX: number; gridY: number; crop?: CropData }>
  ): void {
    try {
      const saveData: SavedGameState = {
        version: CURRENT_VERSION,
        lastSaved: Date.now(),
        player: {
          gold: playerGold,
          level: playerLevel,
          experience: playerExperience
        },
        plots: plots.map(plot => ({
          plotId: plot.plotId,
          gridX: plot.gridX,
          gridY: plot.gridY,
          crop: plot.crop ? {
            id: plot.crop.id,
            type: plot.crop.type,
            plantedAt: plot.crop.plantedAt,
            lastWatered: plot.crop.lastWatered
          } : undefined
        }))
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
      console.log('🎮 Game state saved:', saveData);
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  }

  /**
   * Load game state from localStorage
   */
  static loadGameState(): SavedGameState | null {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (!savedData) return null;

      const gameState = JSON.parse(savedData) as SavedGameState;
      
      // Version check for future compatibility
      if (gameState.version !== CURRENT_VERSION) {
        console.warn('Save file version mismatch, may need migration');
      }

      return gameState;
    } catch (error) {
      console.error('Failed to load game state:', error);
      return null;
    }
  }

  /**
   * Calculate the current growth stage based on planted time and growth duration
   */
  static calculateGrowthStage(plantedAt: number, cropType: CropType): GrowthStage {
    const now = Date.now();
    const elapsed = now - plantedAt;
    const growthTimeMs = (CropEconomyConfig[cropType]?.growthTime || 30) * 1000;
    
    const progress = Math.min(elapsed / growthTimeMs, 1);
    
    if (progress >= 1) return 'ready';
    if (progress >= 0.75) return 'mature';
    if (progress >= 0.5) return 'growing';
    if (progress >= 0.25) return 'sprout';
    return 'seed';
  }

  /**
   * Calculate crop health based on last watered time
   * (Simple implementation - crops don't die, just grow slower)
   */
  static calculateCropHealth(lastWatered?: number): number {
    if (!lastWatered) return 100; // Full health if never watered (generous for MVP)
    
    const now = Date.now();
    const timeSinceWater = now - lastWatered;
    const hoursWithoutWater = timeSinceWater / (1000 * 60 * 60);
    
    // Lose 10% health per hour without water, minimum 20%
    const health = Math.max(20, 100 - (hoursWithoutWater * 10));
    return Math.round(health);
  }

  /**
   * Restore a saved crop to its current state with offline progress
   */
  static restoreCrop(savedCrop: SavedCropData, x: number, y: number): CropData {
    const stage = this.calculateGrowthStage(savedCrop.plantedAt, savedCrop.type);
    const health = this.calculateCropHealth(savedCrop.lastWatered);

    return {
      id: savedCrop.id,
      type: savedCrop.type,
      x: x,
      y: y,
      plantedAt: savedCrop.plantedAt,
      stage: stage,
      lastWatered: savedCrop.lastWatered,
      health: health
    };
  }

  /**
   * Clear saved game state
   */
  static clearSaveData(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🎮 Save data cleared');
  }

  /**
   * Check if any crops became ready while offline
   */
  static getOfflineHarvestableCount(savedState: SavedGameState): number {
    let count = 0;
    
    savedState.plots.forEach(plot => {
      if (plot.crop) {
        const stage = this.calculateGrowthStage(plot.crop.plantedAt, plot.crop.type);
        if (stage === 'ready') {
          count++;
        }
      }
    });

    return count;
  }
}