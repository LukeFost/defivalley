import Database from 'better-sqlite3';
import { join } from 'path';

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
  seed_type: string;
  x: number;
  y: number;
  planted_at: string;
  growth_time: number;
  investment_amount: number;
  harvested: boolean;
  created_at: string;
  updated_at: string;
}

export class DatabaseService {
  public db: Database.Database;

  constructor() {
    // Create database in the server directory
    const dbPath = join(__dirname, '..', '..', 'defivalley.db');
    this.db = new Database(dbPath);
    this.init();
  }

  private init() {
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

    // Create crops table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS crops (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        seed_type TEXT NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        planted_at DATETIME NOT NULL,
        growth_time INTEGER NOT NULL,
        investment_amount INTEGER NOT NULL,
        harvested BOOLEAN DEFAULT FALSE,
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
   * Check if a position is occupied by a crop
   */
  isPositionOccupied(x: number, y: number): boolean {
    const selectStmt = this.db.prepare('SELECT COUNT(*) as count FROM crops WHERE x = ? AND y = ? AND harvested = FALSE');
    const result = selectStmt.get(x, y) as { count: number };
    return result.count > 0;
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