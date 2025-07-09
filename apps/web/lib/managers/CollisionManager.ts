import { BuildingManager } from './BuildingManager';
import { TilemapUtils } from '../tilemap.config';
import { GameConfig } from '../GameConfig';

// Bit-packed grid for memory-efficient collision storage
class BitGrid {
  private grid: Uint8Array;
  private width: number;

  constructor(width: number, height: number) {
    this.width = width;
    const size = Math.ceil(width * height / 8);
    this.grid = new Uint8Array(size);
  }

  public set(x: number, y: number, value: boolean): void {
    const index = y * this.width + x;
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;

    if (value) {
      this.grid[byteIndex] |= (1 << bitIndex);
    } else {
      this.grid[byteIndex] &= ~(1 << bitIndex);
    }
  }

  public get(x: number, y: number): boolean {
    const index = y * this.width + x;
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;

    return (this.grid[byteIndex] & (1 << bitIndex)) !== 0;
  }
}

export class CollisionManager {
  private scene: Phaser.Scene;
  private buildingManager: BuildingManager;
  private collisionGrid!: BitGrid;
  private gridWidth: number = 0;
  private gridHeight: number = 0;
  private tileSize: number = GameConfig.TILE_SIZE;

  constructor(scene: Phaser.Scene, buildingManager: BuildingManager) {
    this.scene = scene;
    this.buildingManager = buildingManager;
  }

  public computeCollisionGrid(terrainLayout: string[][]): void {
    if (terrainLayout.length === 0) return;
    this.gridHeight = terrainLayout.length;
    this.gridWidth = terrainLayout[0].length;
    this.collisionGrid = new BitGrid(this.gridWidth, this.gridHeight);

    // 1. Mark terrain collisions
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (TilemapUtils.hasCollision(terrainLayout[y][x])) {
          this.collisionGrid.set(x, y, true);
        }
      }
    }

    // 2. Mark building collisions
    const buildings = this.buildingManager.getBuildings();
    for (const building of buildings) {
      const bounds = building.getCollisionBounds();
      const startTile = TilemapUtils.worldToTile(bounds.x, bounds.y, this.tileSize);
      const endTile = TilemapUtils.worldToTile(bounds.right, bounds.bottom, this.tileSize);

      for (let y = startTile.y; y <= endTile.y; y++) {
        for (let x = startTile.x; x <= endTile.x; x++) {
          if (y >= 0 && y < this.gridHeight && x >= 0 && x < this.gridWidth) {
            this.collisionGrid.set(x, y, true);
          }
        }
      }
    }
    console.log('Collision grid computed.');
  }

  public isPositionSolid(worldX: number, worldY: number): boolean {
    if (!this.collisionGrid || this.gridWidth === 0 || this.gridHeight === 0) {
      console.log('[CollisionManager] Grid not initialized, returning false');
      return false; // Default to non-solid if grid not computed
    }

    const tileCoords = TilemapUtils.worldToTile(worldX, worldY, this.tileSize);
    if (tileCoords.y < 0 || tileCoords.y >= this.gridHeight || tileCoords.x < 0 || tileCoords.x >= this.gridWidth) {
      console.log(`[CollisionManager] Out of bounds at tile (${tileCoords.x}, ${tileCoords.y})`);
      return true; // Out of bounds is solid
    }

    const isSolid = this.collisionGrid.get(tileCoords.x, tileCoords.y);
    if (isSolid) {
      console.log(`[CollisionManager] Collision detected at tile (${tileCoords.x}, ${tileCoords.y})`);
    }
    return isSolid;
  }
}