import Database from 'better-sqlite3';
import { Player } from '../domain/entities/Player';
import { IPlayerRepository } from './interfaces/IPlayerRepository';

export class PlayerRepository implements IPlayerRepository {
  constructor(private db: Database.Database) {}

  findById(id: string): Player | undefined {
    const stmt = this.db.prepare('SELECT * FROM players WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return undefined;
    
    return new Player(
      row.id,
      row.name,
      row.xp,
      new Date(row.created_at),
      new Date(row.updated_at)
    );
  }

  findByIdOrCreate(id: string, name: string): Player {
    let player = this.findById(id);
    
    if (!player) {
      player = Player.create(id, name);
      this.save(player);
    }
    
    return player;
  }

  findAll(): Player[] {
    const stmt = this.db.prepare('SELECT * FROM players');
    const rows = stmt.all() as any[];
    
    return rows.map(row => new Player(
      row.id,
      row.name,
      row.xp,
      new Date(row.created_at),
      new Date(row.updated_at)
    ));
  }

  save(player: Player): void {
    const existingPlayer = this.findById(player.id);
    
    if (existingPlayer) {
      // Update existing player
      const stmt = this.db.prepare(`
        UPDATE players 
        SET name = ?, xp = ?, updated_at = ? 
        WHERE id = ?
      `);
      stmt.run(
        player.name,
        player.xp,
        player.updatedAt.toISOString(),
        player.id
      );
    } else {
      // Insert new player
      const stmt = this.db.prepare(`
        INSERT INTO players (id, name, xp, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        player.id,
        player.name,
        player.xp,
        player.createdAt.toISOString(),
        player.updatedAt.toISOString()
      );
    }
  }

  updateXP(playerId: string, xp: number): void {
    const stmt = this.db.prepare(`
      UPDATE players 
      SET xp = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(xp, playerId);
  }

  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM players WHERE id = ?');
    stmt.run(id);
  }

  exists(id: string): boolean {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM players WHERE id = ?');
    const result = stmt.get(id) as { count: number };
    return result.count > 0;
  }
}