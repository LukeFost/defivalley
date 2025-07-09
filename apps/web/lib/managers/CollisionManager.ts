import { BuildingManager } from './BuildingManager';
import { TilemapUtils } from '../tilemap.config';

export class CollisionManager {
  private scene: Phaser.Scene;
  private buildingManager: BuildingManager;
  private collisionGrid: boolean[][] = [];
  private tileSize: number = 32;

  constructor(scene: Phaser.Scene, buildingManager: BuildingManager) {
    this.scene = scene;
    this.buildingManager = buildingManager;
  }

  public computeCollisionGrid(terrainLayout: string[][]): void {
    if (terrainLayout.length === 0) return;
    const height = terrainLayout.length;
    const width = terrainLayout[0].length;
    this.collisionGrid = Array.from({ length: height }, () => Array(width).fill(false));

    // 1. Mark terrain collisions
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (TilemapUtils.hasCollision(terrainLayout[y][x])) {
          this.collisionGrid[y][x] = true;
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
          if (y >= 0 && y < height && x >= 0 && x < width) {
            this.collisionGrid[y][x] = true;
          }
        }
      }
    }
    console.log('Collision grid computed.');
  }

  public isPositionSolid(worldX: number, worldY: number): boolean {
    if (this.collisionGrid.length === 0) return false; // Default to non-solid if grid not computed

    const tileCoords = TilemapUtils.worldToTile(worldX, worldY, this.tileSize);
    if (tileCoords.y < 0 || tileCoords.y >= this.collisionGrid.length || tileCoords.x < 0 || tileCoords.x >= this.collisionGrid[0].length) {
      return true; // Out of bounds is solid
    }

    return this.collisionGrid[tileCoords.y][tileCoords.x];
  }
}