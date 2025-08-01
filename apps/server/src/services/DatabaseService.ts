import Database from 'better-sqlite3';
import { join } from 'path';
import { SeedType } from '../types/game.types';
import { MigrationService } from './MigrationService';

export interface Player {
  id: string;
  name: string;
  xp: number;
  created_at: string;
  updated_at: string;
}

export interface Crop {
  id: string;
  player_id: string;
  seed_type: SeedType;
  x: number;
  y: number;
  grid_x?: number;
  grid_y?: number;
  planted_at: string;
  growth_time: number;
  investment_amount: number;
  harvested: boolean;
  yield_amount?: number;
  harvested_at?: string;
  created_at: string;
  updated_at: string;
}

export class DatabaseService {
  public db: Database.Database;
  private migrationService: MigrationService;
  private readonly GRID_SIZE = 100; // Grid cell size in game units

  constructor() {
    // Create database in configurable location
    const dbDir = process.env.DATABASE_DIR || join(__dirname, '..', '..');
    const dbPath = join(dbDir, 'defivalley.db');
    console.log(`📁 Database location: ${dbPath}`);
    
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Enable Write-Ahead Logging for better concurrency
    
    // Initialize migration service
    this.migrationService = new MigrationService(this.db);
    
    this.init();
  }

  private init() {
    // Create initial tables if they don't exist
    // The migration system will handle schema updates
    
    // Create players table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        xp INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Initial crops table (migrations will update it)
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
    // Create performance indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_crops_player_id ON crops (player_id);
      CREATE INDEX IF NOT EXISTS idx_crops_harvested ON crops (harvested);
      -- Spatial grid indexes will be created by migration 002
      -- Additional optimized indexes for world queries
      CREATE INDEX IF NOT EXISTS idx_crops_player_harvested ON crops(player_id, harvested) WHERE harvested = FALSE;
      CREATE INDEX IF NOT EXISTS idx_players_updated_at ON players(updated_at DESC);
    `);

    // Run any pending migrations
    try {
      this.migrationService.runMigrations();
    } catch (error) {
      console.error('❌ Failed to run migrations:', error);
      // Continue without migrations - database might still work
    }
  }

  /**
   * Get or create a player by ID
   */
  getPlayer(playerId: string, playerName: string): Player {
    const selectStmt = this.db.prepare('SELECT * FROM players WHERE id = ?');
    let player = selectStmt.get(playerId) as Player | undefined;

    if (!player) {
      const insertStmt = this.db.prepare(`
        INSERT INTO players (id, name, xp, created_at, updated_at)
        VALUES (?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      insertStmt.run(playerId, playerName);
      player = selectStmt.get(playerId) as Player;
    }

    return player;
  }

  /**
   * Update player XP
   */
  updatePlayerXP(playerId: string, xp: number): void {
    const updateStmt = this.db.prepare(`
      UPDATE players 
      SET xp = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    updateStmt.run(xp, playerId);
  }

  /**
   * Get all crops for a player
   */
  getPlayerCrops(playerId: string): Crop[] {
    const selectStmt = this.db.prepare('SELECT * FROM crops WHERE player_id = ?');
    return selectStmt.all(playerId) as Crop[];
  }

  /**
   * Get all unharvested crops for a player
   */
  getUnharvestedCrops(playerId: string): Crop[] {
    const selectStmt = this.db.prepare('SELECT * FROM crops WHERE player_id = ? AND harvested = FALSE');
    return selectStmt.all(playerId) as Crop[];
  }

  /**
   * Calculate grid coordinates for a position
   */
  private calculateGridCoordinates(x: number, y: number): { grid_x: number; grid_y: number } {
    return {
      grid_x: Math.floor(x / this.GRID_SIZE),
      grid_y: Math.floor(y / this.GRID_SIZE)
    };
  }

  /**
   * Save a new crop
   */
  saveCrop(crop: Omit<Crop, 'id' | 'created_at' | 'updated_at' | 'grid_x' | 'grid_y'>): string {
    const cropId = `crop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { grid_x, grid_y } = this.calculateGridCoordinates(crop.x, crop.y);
    
    const insertStmt = this.db.prepare(`
      INSERT INTO crops (id, player_id, seed_type, x, y, grid_x, grid_y, planted_at, growth_time, investment_amount, harvested, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    insertStmt.run(
      cropId,
      crop.player_id,
      crop.seed_type,
      crop.x,
      crop.y,
      grid_x,
      grid_y,
      crop.planted_at,
      crop.growth_time,
      crop.investment_amount,
      crop.harvested
    );

    return cropId;
  }

  /**
   * Update crop harvest status
   */
  harvestCrop(cropId: string): void {
    const updateStmt = this.db.prepare(`
      UPDATE crops 
      SET harvested = TRUE, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    updateStmt.run(cropId);
  }

  /**
   * Get crop by ID
   */
  getCrop(cropId: string): Crop | undefined {
    const selectStmt = this.db.prepare('SELECT * FROM crops WHERE id = ?');
    return selectStmt.get(cropId) as Crop | undefined;
  }

  /**
   * Check if a position is occupied by a crop (with radius checking)
   * Uses spatial grid indexing for optimized queries
   */
  isPositionOccupied(x: number, y: number, radius: number = 50): boolean {
    // Calculate which grid cells could contain overlapping crops
    const { grid_x, grid_y } = this.calculateGridCoordinates(x, y);
    const gridRadius = Math.ceil(radius / this.GRID_SIZE);
    
    // Query only crops in nearby grid cells
    const selectStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM crops 
      WHERE harvested = FALSE 
      AND grid_x BETWEEN ? AND ?
      AND grid_y BETWEEN ? AND ?
      AND ((x - ?) * (x - ?) + (y - ?) * (y - ?)) <= ? * ?
    `);
    
    const result = selectStmt.get(
      grid_x - gridRadius,
      grid_x + gridRadius,
      grid_y - gridRadius,
      grid_y + gridRadius,
      x, x, y, y, radius, radius
    ) as { count: number };
    
    return result.count > 0;
  }

  /**
   * Get crops in a specific area (optimized with spatial grid)
   */
  getCropsInArea(minX: number, minY: number, maxX: number, maxY: number, playerId?: string): Crop[] {
    const minGrid = this.calculateGridCoordinates(minX, minY);
    const maxGrid = this.calculateGridCoordinates(maxX, maxY);
    
    let query = `
      SELECT * FROM crops 
      WHERE harvested = FALSE 
      AND grid_x BETWEEN ? AND ?
      AND grid_y BETWEEN ? AND ?
      AND x BETWEEN ? AND ?
      AND y BETWEEN ? AND ?
    `;
    
    const params: any[] = [
      minGrid.grid_x, maxGrid.grid_x,
      minGrid.grid_y, maxGrid.grid_y,
      minX, maxX,
      minY, maxY
    ];
    
    if (playerId) {
      query += ' AND player_id = ?';
      params.push(playerId);
    }
    
    const selectStmt = this.db.prepare(query);
    return selectStmt.all(...params) as Crop[];
  }

  /**
   * Execute a database transaction
   */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  /**
   * Calculate yield for a crop based on time elapsed
   */
  calculateYield(investmentAmount: number, plantedAt: string, baseYieldRate: number): number {
    const plantedTime = new Date(plantedAt).getTime();
    const currentTime = Date.now();
    const timeElapsedMs = currentTime - plantedTime;
    const timeElapsedYears = timeElapsedMs / (365 * 24 * 60 * 60 * 1000);
    
    // Simple interest calculation for demo
    const yieldAmount = investmentAmount * baseYieldRate * timeElapsedYears;
    return Math.round(yieldAmount * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get complete world data for a player (player info + all crops) - Optimized
   */
  getWorldData(worldOwnerId: string): { player: Player | null; crops: Crop[] } {
    const transaction = this.db.transaction(() => {
      try {
        // Get player data (will create if doesn't exist)
        const player = this.getPlayer(worldOwnerId, `Player_${worldOwnerId.slice(0, 8)}`);
        
        // Get all unharvested crops for this player in same transaction
        const crops = this.getUnharvestedCrops(worldOwnerId);
        
        return { player, crops };
      } catch (error) {
        console.error(`❌ Error loading world data for ${worldOwnerId}:`, error);
        throw error; // Propagate error instead of swallowing
      }
    });
    
    try {
      return transaction();
    } catch (error) {
      // Return safe defaults if transaction fails
      return { player: null, crops: [] };
    }
  }

  /**
   * Get list of active worlds with pagination and search
   */
  getActiveWorlds(limit: number = 20, offset: number = 0, search?: string): Array<{ playerId: string; playerName: string; cropCount: number; lastActivity: string }> {
    try {
      let query = `
        SELECT 
          p.id as playerId,
          p.name as playerName,
          p.updated_at as lastActivity,
          COUNT(c.id) as cropCount
        FROM players p
        LEFT JOIN crops c ON p.id = c.player_id AND c.harvested = FALSE
      `;
      
      const params: any[] = [];
      
      if (search) {
        query += ` WHERE p.id LIKE ? OR p.name LIKE ?`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
      }
      
      query += `
        GROUP BY p.id, p.name, p.updated_at
        ORDER BY p.updated_at DESC
        LIMIT ? OFFSET ?
      `;
      
      params.push(limit, offset);
      
      const stmt = this.db.prepare(query);
      return stmt.all(...params) as Array<{ playerId: string; playerName: string; cropCount: number; lastActivity: string }>;
    } catch (error) {
      console.error('❌ Error getting active worlds:', error);
      throw error; // Propagate error for proper handling
    }
  }
  
  /**
   * Get total count of worlds for pagination
   */
  getTotalWorldsCount(search?: string): number {
    try {
      let query = 'SELECT COUNT(DISTINCT id) as count FROM players';
      const params: any[] = [];
      
      if (search) {
        query += ' WHERE id LIKE ? OR name LIKE ?';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
      }
      
      const stmt = this.db.prepare(query);
      const result = stmt.get(...params) as { count: number };
      return result.count;
    } catch (error) {
      console.error('❌ Error getting total worlds count:', error);
      throw error;
    }
  }

  /**
   * Check if a player exists in the database
   */
  playerExists(playerId: string): boolean {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM players WHERE id = ?');
      const result = stmt.get(playerId) as { count: number };
      return result.count > 0;
    } catch (error) {
      console.error(`❌ Error checking if player exists: ${playerId}`, error);
      return false;
    }
  }

  /**
   * Get player-specific crops only (for world isolation)
   */
  getPlayerWorldCrops(playerId: string): Crop[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM crops WHERE player_id = ? AND harvested = FALSE');
      return stmt.all(playerId) as Crop[];
    } catch (error) {
      console.error(`❌ Error getting crops for player ${playerId}:`, error);
      return [];
    }
  }

  /**
   * Update grid coordinates for all existing crops (utility method)
   * This is useful after changing GRID_SIZE or for maintenance
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
}

// Export singleton instance
export const databaseService = new DatabaseService();