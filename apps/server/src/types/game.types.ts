// Game-specific type definitions

export type SeedType = 'usdc_sprout' | 'premium_tree' | 'whale_forest';

export interface SeedConfig {
  minInvestment: number;
  growthTime: number; // in milliseconds
  xpGain: number;
  baseYieldRate: number; // APY as decimal (e.g., 0.05 for 5%)
}

export const SEED_CONFIGS: Record<SeedType, SeedConfig> = {
  'usdc_sprout': { 
    minInvestment: 10, 
    growthTime: 24 * 60 * 60 * 1000, // 24 hours
    xpGain: 1,
    baseYieldRate: 0.05 // 5% APY
  },
  'premium_tree': { 
    minInvestment: 100, 
    growthTime: 48 * 60 * 60 * 1000, // 48 hours
    xpGain: 10,
    baseYieldRate: 0.05 // 5% APY
  },
  'whale_forest': { 
    minInvestment: 1000, 
    growthTime: 72 * 60 * 60 * 1000, // 72 hours
    xpGain: 100,
    baseYieldRate: 0.05 // 5% APY
  }
};

export interface PlantSeedMessage {
  seedType: SeedType;
  x: number;
  y: number;
  investmentAmount: number;
}

export interface HarvestCropMessage {
  cropId: string;
}

export interface GameError {
  code: string;
  message: string;
  details?: any;
}

export const ERROR_CODES = {
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  INVALID_REQUEST: 'INVALID_REQUEST',
  POSITION_OCCUPIED: 'POSITION_OCCUPIED',
  INVALID_SEED_TYPE: 'INVALID_SEED_TYPE',
  INSUFFICIENT_INVESTMENT: 'INSUFFICIENT_INVESTMENT',
  CROP_NOT_FOUND: 'CROP_NOT_FOUND',
  CROP_NOT_READY: 'CROP_NOT_READY',
  CROP_ALREADY_HARVESTED: 'CROP_ALREADY_HARVESTED',
  DATABASE_ERROR: 'DATABASE_ERROR'
} as const;

// Position validation constants
export const CROP_COLLISION_RADIUS = 50; // pixels