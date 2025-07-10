import Database from 'better-sqlite3';
import { join } from 'path';
import { MigrationService } from './MigrationService';
import { UnitOfWork } from '../repositories/UnitOfWork';
import { CropService } from '../domain/services/CropService';
import { Player } from '../domain/entities/Player';
import { Crop } from '../domain/entities/Crop';
import { SeedType } from '../types/game.types';

/**
 * Refactored DatabaseService using Repository Pattern and Domain Services
 * This class now acts as a facade over the domain layer
 */
export class DatabaseServiceRefactored {
  private db: Database.Database;
  private migrationService: MigrationService;
  private unitOfWork: UnitOfWork;
  private cropService: CropService;
  private readonly GRID_SIZE = 100;

  constructor() {
    // Create database in configurable location
    const dbDir = process.env.DATABASE_DIR || join(__dirname, '..', '..');
    const dbPath = join(dbDir, 'defivalley.db');
    console.log(`📁 Database location: ${dbPath}`);
    
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Enable Write-Ahead Logging for better concurrency
    
    // Initialize migration service
    this.migrationService = new MigrationService(this.db);
    
    // Initialize repository pattern
    this.unitOfWork = new UnitOfWork(this.db);
    this.cropService = new CropService(this.unitOfWork, this.GRID_SIZE);
    
    this.init();
  }

  private init() {
    // Create initial tables if they don't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        xp INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS crops (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        seed_type TEXT NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        planted_at DATETIME NOT NULL,
        growth_time INTEGER NOT NULL,
        investment_amount REAL NOT NULL,
        harvested BOOLEAN DEFAULT FALSE,
        yield_amount REAL DEFAULT NULL,
        harvested_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_crops_player_id ON crops (player_id);
      CREATE INDEX IF NOT EXISTS idx_crops_harvested ON crops (harvested);
      CREATE INDEX IF NOT EXISTS idx_crops_player_harvested ON crops(player_id, harvested) WHERE harvested = FALSE;
      CREATE INDEX IF NOT EXISTS idx_players_updated_at ON players(updated_at DESC);
    `);

    // Run any pending migrations
    try {
      this.migrationService.runMigrations();
    } catch (error) {
      console.error('❌ Failed to run migrations:', error);
    }
  }

  /**
   * Get or create a player by ID
   */
  getPlayer(playerId: string, playerName: string): Player {
    const player = this.unitOfWork.players.findByIdOrCreate(playerId, playerName);
    return player;
  }

  /**
   * Update player XP
   */
  updatePlayerXP(playerId: string, xp: number): void {
    this.unitOfWork.transaction(() => {
      const player = this.unitOfWork.players.findById(playerId);
      if (player) {
        player.xp = xp;
        player.updatedAt = new Date();
        this.unitOfWork.players.save(player);
      }
    });
  }

  /**
   * Get all crops for a player
   */
  getPlayerCrops(playerId: string): Crop[] {
    return this.cropService.getPlayerCrops(playerId);
  }

  /**
   * Get all unharvested crops for a player
   */
  getUnharvestedCrops(playerId: string): Crop[] {
    return this.cropService.getUnharvestedCrops(playerId);
  }

  /**
   * Save a new crop
   */
  saveCrop(crop: Omit<Crop, 'id' | 'created_at' | 'updated_at' | 'grid_x' | 'grid_y'>): string {
    const result = this.cropService.plantCrop(
      crop.player_id,
      crop.seed_type as SeedType,
      crop.x,
      crop.y,
      crop.investment_amount
    );

    if (!result.success || !result.crop) {
      throw new Error(result.error || 'Failed to plant crop');
    }

    return result.crop.id;
  }

  /**
   * Update crop harvest status
   */
  harvestCrop(cropId: string): void {
    const crop = this.unitOfWork.crops.findById(cropId);
    if (crop) {
      const result = this.cropService.harvestCrop(cropId, crop.playerId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to harvest crop');
      }
    }
  }

  /**
   * Get crop by ID
   */
  getCrop(cropId: string): Crop | undefined {
    return this.unitOfWork.crops.findById(cropId);
  }

  /**
   * Check if a position is occupied by a crop
   */
  isPositionOccupied(x: number, y: number, radius: number = 50): boolean {
    return !this.cropService.isPositionAvailable(x, y, radius);
  }

  /**
   * Get crops in a specific area
   */
  getCropsInArea(minX: number, minY: number, maxX: number, maxY: number, playerId?: string): Crop[] {
    return this.cropService.getCropsInArea(minX, minY, maxX, maxY, playerId);
  }

  /**
   * Execute a database transaction
   */
  transaction<T>(fn: () => T): T {
    return this.unitOfWork.transaction(fn);
  }

  /**
   * Calculate yield for a crop based on time elapsed
   * Note: This is now delegated to the YieldCalculator service
   */
  calculateYield(investmentAmount: number, plantedAt: string, baseYieldRate: number): number {
    const crop = this.unitOfWork.crops.findAll().find(c => 
      c.investmentAmount === investmentAmount && 
      c.plantedAt.toISOString() === plantedAt
    );
    
    if (!crop) {
      // Fallback calculation if crop not found
      const plantedTime = new Date(plantedAt).getTime();
      const currentTime = Date.now();
      const timeElapsedMs = currentTime - plantedTime;
      const timeElapsedYears = timeElapsedMs / (365 * 24 * 60 * 60 * 1000);
      const yieldAmount = investmentAmount * baseYieldRate * timeElapsedYears;
      return Math.round(yieldAmount * 100) / 100;
    }

    // Use domain service for calculation
    const yieldCalculator = new (await import('../domain/services/YieldCalculator')).YieldCalculator();
    return yieldCalculator.calculateYield(
      crop.investmentAmount,
      crop.plantedAt,
      crop.seedType
    );
  }

  /**
   * Get complete world data for a player
   */
  getWorldData(worldOwnerId: string): { player: Player | null; crops: Crop[] } {
    return this.cropService.getWorldData(worldOwnerId);
  }

  /**
   * Get list of active worlds with pagination and search
   */
  getActiveWorlds(limit: number = 20, offset: number = 0, search?: string): Array<{ playerId: string; playerName: string; cropCount: number; lastActivity: string }> {
    const worlds = this.unitOfWork.worlds.getActiveWorlds(limit, offset, search);
    return worlds.map(w => ({
      playerId: w.playerId,
      playerName: w.playerName,
      cropCount: w.cropCount,
      lastActivity: w.lastActivity.toISOString()
    }));
  }
  
  /**
   * Get total count of worlds for pagination
   */
  getTotalWorldsCount(search?: string): number {
    return this.unitOfWork.worlds.getTotalWorldsCount(search);
  }

  /**
   * Check if a player exists in the database
   */
  playerExists(playerId: string): boolean {
    return this.unitOfWork.players.exists(playerId);
  }

  /**
   * Get player-specific crops only
   */
  getPlayerWorldCrops(playerId: string): Crop[] {
    return this.unitOfWork.crops.findUnharvestedByPlayerId(playerId);
  }

  /**
   * Update grid coordinates for all existing crops
   */
  updateAllGridCoordinates(): void {
    const updateStmt = this.db.prepare(`
      UPDATE crops 
      SET 
        grid_x = CAST(x / ? AS INTEGER),
        grid_y = CAST(y / ? AS INTEGER),
        updated_at = CURRENT_TIMESTAMP
    `);
    
    const info = updateStmt.run(this.GRID_SIZE, this.GRID_SIZE);
    console.log(`✅ Updated grid coordinates for ${info.changes} crops`);
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get the underlying database instance (for migrations, etc.)
   */
  getDatabase(): Database.Database {
    return this.db;
  }
}