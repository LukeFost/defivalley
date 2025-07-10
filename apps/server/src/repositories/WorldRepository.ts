import Database from 'better-sqlite3';
import { IWorldRepository, WorldSummary } from './interfaces/IWorldRepository';

export class WorldRepository implements IWorldRepository {
  constructor(private db: Database.Database) {}

  getActiveWorlds(limit: number = 20, offset: number = 0, search?: string): WorldSummary[] {
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
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => ({
      playerId: row.playerId,
      playerName: row.playerName,
      cropCount: row.cropCount,
      lastActivity: new Date(row.lastActivity)
    }));
  }

  getTotalWorldsCount(search?: string): number {
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
  }
}