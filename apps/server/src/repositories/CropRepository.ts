import Database from 'better-sqlite3';
import { Crop } from '../domain/entities/Crop';
import { ICropRepository } from './interfaces/ICropRepository';
import { SpatialService } from '../domain/services/SpatialService';
import { SeedType } from '../types/game.types';

export class CropRepository implements ICropRepository {
  private spatialService: SpatialService;

  constructor(
    private db: Database.Database,
    private gridSize: number = 100
  ) {
    this.spatialService = new SpatialService(gridSize);
  }

  findById(id: string): Crop | undefined {
    const stmt = this.db.prepare('SELECT * FROM crops WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return undefined;
    
    return this.rowToCrop(row);
  }

  findAll(): Crop[] {
    const stmt = this.db.prepare('SELECT * FROM crops');
    const rows = stmt.all() as any[];
    
    return rows.map(row => this.rowToCrop(row));
  }

  findByPlayerId(playerId: string): Crop[] {
    const stmt = this.db.prepare('SELECT * FROM crops WHERE player_id = ?');
    const rows = stmt.all(playerId) as any[];
    
    return rows.map(row => this.rowToCrop(row));
  }

  findUnharvestedByPlayerId(playerId: string): Crop[] {
    const stmt = this.db.prepare('SELECT * FROM crops WHERE player_id = ? AND harvested = FALSE');
    const rows = stmt.all(playerId) as any[];
    
    return rows.map(row => this.rowToCrop(row));
  }

  findInArea(minX: number, minY: number, maxX: number, maxY: number, playerId?: string): Crop[] {
    const bounds = this.spatialService.calculateGridBoundsForArea({ minX, minY, maxX, maxY });
    
    let query = `
      SELECT * FROM crops 
      WHERE harvested = FALSE 
      AND grid_x BETWEEN ? AND ?
      AND grid_y BETWEEN ? AND ?
      AND x BETWEEN ? AND ?
      AND y BETWEEN ? AND ?
    `;
    
    const params: any[] = [
      bounds.minGrid.gridX, bounds.maxGrid.gridX,
      bounds.minGrid.gridY, bounds.maxGrid.gridY,
      minX, maxX,
      minY, maxY
    ];
    
    if (playerId) {
      query += ' AND player_id = ?';
      params.push(playerId);
    }
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => this.rowToCrop(row));
  }

  findAtPosition(x: number, y: number, radius: number): Crop[] {
    const gridBounds = this.spatialService.calculateGridBounds(x, y, radius);
    
    const stmt = this.db.prepare(`
      SELECT * FROM crops 
      WHERE harvested = FALSE 
      AND grid_x BETWEEN ? AND ?
      AND grid_y BETWEEN ? AND ?
      AND ((x - ?) * (x - ?) + (y - ?) * (y - ?)) <= ? * ?
    `);
    
    const rows = stmt.all(
      gridBounds.minGridX,
      gridBounds.maxGridX,
      gridBounds.minGridY,
      gridBounds.maxGridY,
      x, x, y, y, radius, radius
    ) as any[];
    
    return rows.map(row => this.rowToCrop(row));
  }

  save(crop: Crop): void {
    const existingCrop = this.findById(crop.id);
    
    if (existingCrop) {
      // Update existing crop
      const stmt = this.db.prepare(`
        UPDATE crops 
        SET 
          harvested = ?,
          yield_amount = ?,
          harvested_at = ?,
          updated_at = ?
        WHERE id = ?
      `);
      stmt.run(
        crop.harvested ? 1 : 0,
        crop.yieldAmount,
        crop.harvestedAt?.toISOString() || null,
        crop.updatedAt.toISOString(),
        crop.id
      );
    } else {
      // Insert new crop
      const stmt = this.db.prepare(`
        INSERT INTO crops (
          id, player_id, seed_type, x, y, grid_x, grid_y, 
          planted_at, growth_time, investment_amount, harvested, 
          yield_amount, harvested_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        crop.id,
        crop.playerId,
        crop.seedType,
        crop.x,
        crop.y,
        crop.gridX,
        crop.gridY,
        crop.plantedAt.toISOString(),
        crop.growthTime,
        crop.investmentAmount,
        crop.harvested ? 1 : 0,
        crop.yieldAmount,
        crop.harvestedAt?.toISOString() || null,
        crop.createdAt.toISOString(),
        crop.updatedAt.toISOString()
      );
    }
  }

  markAsHarvested(cropId: string): void {
    const stmt = this.db.prepare(`
      UPDATE crops 
      SET harvested = TRUE, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(cropId);
  }

  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM crops WHERE id = ?');
    stmt.run(id);
  }

  exists(id: string): boolean {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM crops WHERE id = ?');
    const result = stmt.get(id) as { count: number };
    return result.count > 0;
  }

  countByPlayerId(playerId: string, harvested?: boolean): number {
    let query = 'SELECT COUNT(*) as count FROM crops WHERE player_id = ?';
    const params: any[] = [playerId];
    
    if (harvested !== undefined) {
      query += ' AND harvested = ?';
      params.push(harvested ? 1 : 0);
    }
    
    const stmt = this.db.prepare(query);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  private rowToCrop(row: any): Crop {
    return new Crop(
      row.id,
      row.player_id,
      row.seed_type as SeedType,
      row.x,
      row.y,
      new Date(row.planted_at),
      row.growth_time,
      row.investment_amount,
      row.harvested === 1,
      row.yield_amount,
      row.harvested_at ? new Date(row.harvested_at) : null,
      new Date(row.created_at),
      new Date(row.updated_at),
      row.grid_x,
      row.grid_y
    );
  }
}