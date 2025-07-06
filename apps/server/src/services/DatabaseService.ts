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

export interface Transaction {
  id: string;
  player_id: string;
  type: 'plant_seed' | 'harvest_seed' | 'claim_yield';
  status: 'preparing' | 'wallet_confirm' | 'saga_pending' | 'axelar_processing' | 'arbitrum_pending' | 'completed' | 'failed';
  saga_tx_hash?: string;
  arbitrum_tx_hash?: string;
  axelar_tx_id?: string;
  axelar_tx_hash?: string;
  start_time: number;
  last_updated: number;
  estimated_completion_time?: number;
  error_message?: string;
  retry_count: number;
  seed_type?: number;
  seed_id?: number;
  amount?: string;
  gas_estimate?: string;
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
    // Create performance indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_crops_player_id ON crops (player_id);
      CREATE INDEX IF NOT EXISTS idx_crops_harvested ON crops (harvested);
      CREATE INDEX IF NOT EXISTS idx_crops_position ON crops (x, y);
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
   * Transaction Management Methods
   */

  /**
   * Save a transaction to the database
   */
  saveTransaction(transaction: Omit<Transaction, 'created_at' | 'updated_at'>): Transaction {
    try {
      const insertStmt = this.db.prepare(`
        INSERT INTO transactions (
          id, player_id, type, status, saga_tx_hash, arbitrum_tx_hash, 
          axelar_tx_id, axelar_tx_hash, start_time, last_updated, 
          estimated_completion_time, error_message, retry_count, 
          seed_type, seed_id, amount, gas_estimate, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      
      insertStmt.run(
        transaction.id,
        transaction.player_id,
        transaction.type,
        transaction.status,
        transaction.saga_tx_hash || null,
        transaction.arbitrum_tx_hash || null,
        transaction.axelar_tx_id || null,
        transaction.axelar_tx_hash || null,
        transaction.start_time,
        transaction.last_updated,
        transaction.estimated_completion_time || null,
        transaction.error_message || null,
        transaction.retry_count,
        transaction.seed_type || null,
        transaction.seed_id || null,
        transaction.amount || null,
        transaction.gas_estimate || null
      );

      // Return the saved transaction
      return this.getTransaction(transaction.id)!;
    } catch (error) {
      console.error(`❌ Error saving transaction ${transaction.id}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing transaction
   */
  updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at'>>): Transaction | null {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        updateFields.push(`${key} = ?`);
        values.push(value);
      });

      if (updateFields.length === 0) {
        return this.getTransaction(id);
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const updateStmt = this.db.prepare(`
        UPDATE transactions 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `);
      
      updateStmt.run(...values);
      return this.getTransaction(id);
    } catch (error) {
      console.error(`❌ Error updating transaction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get a transaction by ID
   */
  getTransaction(id: string): Transaction | null {
    try {
      const selectStmt = this.db.prepare('SELECT * FROM transactions WHERE id = ?');
      return selectStmt.get(id) as Transaction | null;
    } catch (error) {
      console.error(`❌ Error getting transaction ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all transactions for a player with pagination
   */
  getPlayerTransactions(playerId: string, limit: number = 50, offset: number = 0): Transaction[] {
    try {
      const selectStmt = this.db.prepare(`
        SELECT * FROM transactions 
        WHERE player_id = ? 
        ORDER BY start_time DESC 
        LIMIT ? OFFSET ?
      `);
      return selectStmt.all(playerId, limit, offset) as Transaction[];
    } catch (error) {
      console.error(`❌ Error getting transactions for player ${playerId}:`, error);
      return [];
    }
  }

  /**
   * Get active (non-completed/failed) transactions for a player
   */
  getActiveTransactions(playerId: string): Transaction[] {
    try {
      const selectStmt = this.db.prepare(`
        SELECT * FROM transactions 
        WHERE player_id = ? AND status NOT IN ('completed', 'failed')
        ORDER BY start_time DESC
      `);
      return selectStmt.all(playerId) as Transaction[];
    } catch (error) {
      console.error(`❌ Error getting active transactions for player ${playerId}:`, error);
      return [];
    }
  }

  /**
   * Get transactions by status across all players (for monitoring)
   */
  getTransactionsByStatus(status: string, limit: number = 100): Transaction[] {
    try {
      const selectStmt = this.db.prepare(`
        SELECT * FROM transactions 
        WHERE status = ? 
        ORDER BY last_updated DESC 
        LIMIT ?
      `);
      return selectStmt.all(status, limit) as Transaction[];
    } catch (error) {
      console.error(`❌ Error getting transactions by status ${status}:`, error);
      return [];
    }
  }

  /**
   * Clean up old completed/failed transactions (keep last 100 per player)
   */
  cleanupOldTransactions(): number {
    try {
      const deleteStmt = this.db.prepare(`
        DELETE FROM transactions 
        WHERE status IN ('completed', 'failed') 
        AND id NOT IN (
          SELECT id FROM transactions 
          WHERE status IN ('completed', 'failed') 
          ORDER BY start_time DESC 
          LIMIT 100
        )
      `);
      const result = deleteStmt.run();
      return result.changes;
    } catch (error) {
      console.error('❌ Error cleaning up old transactions:', error);
      return 0;
    }
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