/**
 * Economy configuration for DeFi Valley
 * Defines costs, growth times, and rewards for crops
 */

import { CropType } from './CropSystem';

export interface CropEconomy {
  cost: number;           // Cost in Gold to plant
  growthTime: number;     // Time in seconds to fully grow
  harvestYield: number;   // Gold reward when harvested
  xpReward: number;       // Experience points for harvesting
}

/**
 * Crop economy configuration
 * Balanced for progressive difficulty and fair returns
 */
export const CropEconomyConfig: Record<CropType, CropEconomy> = {
  // Tier 1 - Beginner crops (fast growth, low profit)
  potato: {
    cost: 10,
    growthTime: 30,      // 30 seconds
    harvestYield: 15,    // 50% profit
    xpReward: 5
  },
  carrot: {
    cost: 15,
    growthTime: 45,      // 45 seconds
    harvestYield: 25,    // 67% profit
    xpReward: 8
  },
  
  // Tier 2 - Intermediate crops (medium growth, medium profit)
  lettuce: {
    cost: 25,
    growthTime: 60,      // 1 minute
    harvestYield: 45,    // 80% profit
    xpReward: 12
  },
  tomato: {
    cost: 40,
    growthTime: 90,      // 1.5 minutes
    harvestYield: 80,    // 100% profit
    xpReward: 20
  },
  
  // Tier 3 - Advanced crops (slower growth, higher profit)
  corn: {
    cost: 60,
    growthTime: 120,     // 2 minutes
    harvestYield: 150,   // 150% profit
    xpReward: 30
  },
  watermelon: {
    cost: 100,
    growthTime: 180,     // 3 minutes
    harvestYield: 300,   // 200% profit
    xpReward: 50
  },
  
  // Tier 4 - Premium crops (long growth, high profit)
  strawberry: {
    cost: 150,
    growthTime: 240,     // 4 minutes
    harvestYield: 500,   // 233% profit
    xpReward: 75
  },
  pepper: {
    cost: 200,
    growthTime: 300,     // 5 minutes
    harvestYield: 700,   // 250% profit
    xpReward: 100
  },
  
  // Tier 5 - Master crops (very long growth, massive profit)
  pumpkin: {
    cost: 300,
    growthTime: 420,     // 7 minutes
    harvestYield: 1200,  // 300% profit
    xpReward: 150
  },
  cabbage: {
    cost: 50,
    growthTime: 75,      // 1.25 minutes
    harvestYield: 100,   // 100% profit
    xpReward: 15
  }
};

/**
 * Player economy configuration
 */
export const PlayerEconomyConfig = {
  startingGold: 100,     // New players start with 100 gold
  dailyBonus: 50,        // Daily login bonus
  levelUpGoldBonus: 25   // Gold bonus per level up
};

/**
 * Get crop tier based on cost
 */
export function getCropTier(cropType: CropType): number {
  const cost = CropEconomyConfig[cropType].cost;
  if (cost <= 15) return 1;
  if (cost <= 40) return 2;
  if (cost <= 100) return 3;
  if (cost <= 200) return 4;
  return 5;
}

/**
 * Calculate profit margin for a crop
 */
export function getCropProfitMargin(cropType: CropType): number {
  const economy = CropEconomyConfig[cropType];
  return ((economy.harvestYield - economy.cost) / economy.cost) * 100;
}

/**
 * Get time until harvest in human-readable format
 */
export function getTimeUntilHarvest(plantedAt: number, cropType: CropType): string {
  const economy = CropEconomyConfig[cropType];
  const now = Date.now();
  const elapsedSeconds = (now - plantedAt) / 1000;
  const remainingSeconds = Math.max(0, economy.growthTime - elapsedSeconds);
  
  if (remainingSeconds === 0) return 'Ready!';
  
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = Math.floor(remainingSeconds % 60);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}