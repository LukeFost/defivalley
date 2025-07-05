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
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_crops_player_id ON crops (player_id);
      CREATE INDEX IF NOT EXISTS idx_crops_harvested ON crops (harvested);
      CREATE INDEX IF NOT EXISTS idx_crops_position ON crops (x, y);
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
   * Save a new crop
   */
  saveCrop(crop: Omit<Crop, 'id' | 'created_at' | 'updated_at'>): string {
    const cropId = `crop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const insertStmt = this.db.prepare(`
      INSERT INTO crops (id, player_id, seed_type, x, y, planted_at, growth_time, investment_amount, harvested, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    insertStmt.run(
      cropId,
      crop.player_id,
      crop.seed_type,
      crop.x,
      crop.y,
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
   */
  isPositionOccupied(x: number, y: number, radius: number = 50): boolean {
    // Check for crops within the collision radius
    const selectStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM crops 
      WHERE harvested = FALSE 
      AND ((x - ?) * (x - ?) + (y - ?) * (y - ?)) <= ? * ?
    `);
    const result = selectStmt.get(x, x, y, y, radius, radius) as { count: number };
    return result.count > 0;
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
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();