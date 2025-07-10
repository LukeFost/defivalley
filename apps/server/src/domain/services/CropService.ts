import { Crop } from '../entities/Crop';
import { Player } from '../entities/Player';
import { IUnitOfWork } from '../../repositories/interfaces/IUnitOfWork';
import { YieldCalculator } from './YieldCalculator';
import { SpatialService } from './SpatialService';
import { SeedType, SEED_CONFIGS, CROP_COLLISION_RADIUS } from '../../types/game.types';

export interface PlantCropResult {
  success: boolean;
  crop?: Crop;
  error?: string;
}

export interface HarvestCropResult {
  success: boolean;
  yieldAmount?: number;
  xpGained?: number;
  error?: string;
}

export class CropService {
  private yieldCalculator: YieldCalculator;
  private spatialService: SpatialService;

  constructor(
    private unitOfWork: IUnitOfWork,
    gridSize: number = 100
  ) {
    this.yieldCalculator = new YieldCalculator();
    this.spatialService = new SpatialService(gridSize);
  }

  /**
   * Plant a new crop
   */
  plantCrop(
    playerId: string,
    seedType: SeedType,
    x: number,
    y: number,
    investmentAmount: number
  ): PlantCropResult {
    // Validate seed type
    const seedConfig = SEED_CONFIGS[seedType];
    if (!seedConfig) {
      return { success: false, error: 'Invalid seed type' };
    }

    // Validate investment amount
    if (!this.yieldCalculator.validateInvestment(seedType, investmentAmount)) {
      return { 
        success: false, 
        error: `Minimum investment for ${seedType} is ${seedConfig.minInvestment} USDC` 
      };
    }

    // Check if position is occupied
    const nearbyProps = this.unitOfWork.crops.findAtPosition(x, y, CROP_COLLISION_RADIUS);
    if (nearbyProps.length > 0) {
      return { success: false, error: 'Position is already occupied' };
    }

    // Create and save the crop
    const crop = Crop.create(
      playerId,
      seedType,
      x,
      y,
      seedConfig.growthTime,
      investmentAmount
    );

    // Calculate XP gain and update player
    const xpGain = this.yieldCalculator.calculateXPGain(investmentAmount);
    
    // Execute in transaction
    this.unitOfWork.transaction(() => {
      // Save crop
      this.unitOfWork.crops.save(crop);
      
      // Update player XP
      const player = this.unitOfWork.players.findById(playerId);
      if (player) {
        player.addXP(xpGain);
        this.unitOfWork.players.save(player);
      }
    });

    return { success: true, crop };
  }

  /**
   * Harvest a crop
   */
  harvestCrop(cropId: string, playerId: string): HarvestCropResult {
    const crop = this.unitOfWork.crops.findById(cropId);
    
    if (!crop) {
      return { success: false, error: 'Crop not found' };
    }

    if (crop.playerId !== playerId) {
      return { success: false, error: 'You do not own this crop' };
    }

    if (crop.harvested) {
      return { success: false, error: 'Crop already harvested' };
    }

    if (!crop.isReady()) {
      return { success: false, error: 'Crop is not ready for harvest' };
    }

    // Calculate yield
    const yieldAmount = this.yieldCalculator.calculateYield(
      crop.investmentAmount,
      crop.plantedAt,
      crop.seedType
    );

    // Execute harvest in transaction
    this.unitOfWork.transaction(() => {
      crop.harvest(yieldAmount);
      this.unitOfWork.crops.save(crop);
    });

    return { 
      success: true, 
      yieldAmount,
      xpGained: 0 // XP is only gained when planting
    };
  }

  /**
   * Get all crops for a player
   */
  getPlayerCrops(playerId: string): Crop[] {
    return this.unitOfWork.crops.findByPlayerId(playerId);
  }

  /**
   * Get unharvested crops for a player
   */
  getUnharvestedCrops(playerId: string): Crop[] {
    return this.unitOfWork.crops.findUnharvestedByPlayerId(playerId);
  }

  /**
   * Get crops in a specific area
   */
  getCropsInArea(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    playerId?: string
  ): Crop[] {
    return this.unitOfWork.crops.findInArea(minX, minY, maxX, maxY, playerId);
  }

  /**
   * Check if a position is available for planting
   */
  isPositionAvailable(x: number, y: number, radius: number = CROP_COLLISION_RADIUS): boolean {
    const nearbyProps = this.unitOfWork.crops.findAtPosition(x, y, radius);
    return nearbyProps.length === 0;
  }

  /**
   * Get world data for a player
   */
  getWorldData(worldOwnerId: string): { player: Player | null; crops: Crop[] } {
    return this.unitOfWork.transaction(() => {
      try {
        // Get or create player
        const player = this.unitOfWork.players.findByIdOrCreate(
          worldOwnerId,
          `Player_${worldOwnerId.slice(0, 8)}`
        );
        
        // Get all unharvested crops for this player
        const crops = this.getUnharvestedCrops(worldOwnerId);
        
        return { player, crops };
      } catch (error) {
        console.error(`❌ Error loading world data for ${worldOwnerId}:`, error);
        return { player: null, crops: [] };
      }
    });
  }
}