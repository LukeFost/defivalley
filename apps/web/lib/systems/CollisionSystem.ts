import * as Phaser from 'phaser';
import { TilemapUtils } from '../tilemap.config';
import { BuildingInteractionManager } from '../BuildingInteractionManager';
import { CropSystem } from '../CropSystem';

/**
 * CollisionSystem
 * 
 * Manages all collision detection in the game using a spatial grid system.
 * Optimizes collision checks by dividing the world into a grid and only
 * checking relevant cells.
 */
export class CollisionSystem {
  private scene: Phaser.Scene;
  private tileSize: number;
  private worldWidth: number;
  private worldHeight: number;
  
  // Collision grid for static objects (terrain, buildings)
  private collisionGrid: boolean[][];
  private gridWidth: number;
  private gridHeight: number;
  
  // Spatial index for dynamic objects (crops)
  private cropSpatialIndex: Map<string, Set<string>>; // cellKey -> Set of crop IDs
  
  // References to other systems
  private buildingManager?: BuildingInteractionManager;
  private cropSystem?: CropSystem;
  
  // Terrain layout reference
  private terrainLayout: string[][];
  
  // Performance optimization
  private lastGridUpdate: number = 0;
  private gridUpdateInterval: number = 1000; // Update grid every second

  constructor(
    scene: Phaser.Scene,
    worldWidth: number,
    worldHeight: number,
    tileSize: number = 32
  ) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.tileSize = tileSize;
    
    // Calculate grid dimensions
    this.gridWidth = Math.ceil(worldWidth / tileSize);
    this.gridHeight = Math.ceil(worldHeight / tileSize);
    
    // Initialize collision grid
    this.collisionGrid = this.createEmptyGrid();
    this.cropSpatialIndex = new Map();
    this.terrainLayout = [];
  }

  /**
   * Initialize the collision system with references to other systems
   */
  public initialize(
    buildingManager: BuildingInteractionManager,
    cropSystem: CropSystem,
    terrainLayout?: string[][]
  ): void {
    this.buildingManager = buildingManager;
    this.cropSystem = cropSystem;
    this.terrainLayout = terrainLayout || [];
    
    // Compute initial collision grid
    this.computeCollisionGrid();
  }

  /**
   * Create an empty collision grid
   */
  private createEmptyGrid(): boolean[][] {
    return Array.from({ length: this.gridHeight }, () => 
      Array(this.gridWidth).fill(false)
    );
  }

  /**
   * Compute the collision grid from terrain and buildings
   */
  public computeCollisionGrid(): void {
    // Reset grid
    this.collisionGrid = this.createEmptyGrid();
    
    // 1. Mark terrain collisions
    this.markTerrainCollisions();
    
    // 2. Mark building collisions
    this.markBuildingCollisions();
    
    // 3. Update crop spatial index
    this.updateCropSpatialIndex();
    
    console.log('[CollisionSystem] Collision grid computed:', {
      gridSize: `${this.gridWidth}x${this.gridHeight}`,
      terrainTiles: this.terrainLayout.length > 0,
      buildings: this.buildingManager ? true : false
    });
  }

  /**
   * Mark terrain tiles as collision areas
   */
  private markTerrainCollisions(): void {
    if (this.terrainLayout.length === 0) return;
    
    const terrainHeight = this.terrainLayout.length;
    const terrainWidth = this.terrainLayout[0].length;
    
    for (let y = 0; y < terrainHeight; y++) {
      for (let x = 0; x < terrainWidth; x++) {
        const tileType = this.terrainLayout[y][x];
        if (TilemapUtils.hasCollision(tileType)) {
          // Mark this tile as solid in the collision grid
          if (y < this.gridHeight && x < this.gridWidth) {
            this.collisionGrid[y][x] = true;
          }
        }
      }
    }
  }

  /**
   * Mark building areas as collision zones
   */
  private markBuildingCollisions(): void {
    if (!this.buildingManager) return;
    
    const buildingBounds = this.buildingManager.getCollisionBounds();
    
    for (const bounds of buildingBounds) {
      const startTile = this.worldToGrid(bounds.x, bounds.y);
      const endTile = this.worldToGrid(bounds.right, bounds.bottom);
      
      for (let y = startTile.y; y <= endTile.y; y++) {
        for (let x = startTile.x; x <= endTile.x; x++) {
          if (this.isValidGridPosition(x, y)) {
            this.collisionGrid[y][x] = true;
          }
        }
      }
    }
  }

  /**
   * Update spatial index for crops
   */
  private updateCropSpatialIndex(): void {
    if (!this.cropSystem) return;
    
    // Clear existing index
    this.cropSpatialIndex.clear();
    
    // Add all crops to spatial index
    const crops = this.cropSystem.getAllCrops();
    for (const crop of crops) {
      const gridPos = this.worldToGrid(crop.x, crop.y);
      const cellKey = this.getCellKey(gridPos.x, gridPos.y);
      
      if (!this.cropSpatialIndex.has(cellKey)) {
        this.cropSpatialIndex.set(cellKey, new Set());
      }
      this.cropSpatialIndex.get(cellKey)!.add(crop.id);
    }
  }

  /**
   * Check if a world position collides with any solid object
   */
  public checkPointCollision(worldX: number, worldY: number): boolean {
    // 1. Check static collision grid (terrain + buildings)
    if (this.checkStaticCollision(worldX, worldY)) {
      return true;
    }
    
    // 2. Check dynamic collisions (crops)
    if (this.checkCropCollision(worldX, worldY)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check collision with static objects (terrain, buildings)
   */
  private checkStaticCollision(worldX: number, worldY: number): boolean {
    const gridPos = this.worldToGrid(worldX, worldY);
    
    if (!this.isValidGridPosition(gridPos.x, gridPos.y)) {
      return true; // Out of bounds is solid
    }
    
    return this.collisionGrid[gridPos.y][gridPos.x];
  }

  /**
   * Check collision with tile terrain
   */
  public checkTileCollision(worldX: number, worldY: number): boolean {
    if (this.terrainLayout.length === 0) {
      return false; // No terrain to collide with
    }
    
    const tilePos = TilemapUtils.worldToTile(worldX, worldY, this.tileSize);
    
    if (tilePos.x < 0 || tilePos.x >= this.terrainLayout[0].length ||
        tilePos.y < 0 || tilePos.y >= this.terrainLayout.length) {
      return true; // Out of bounds
    }
    
    const tileType = this.terrainLayout[tilePos.y][tilePos.x];
    return TilemapUtils.hasCollision(tileType);
  }

  /**
   * Check collision with buildings
   */
  public checkBuildingCollision(worldX: number, worldY: number): boolean {
    if (!this.buildingManager) return false;
    return this.buildingManager.checkCollision(worldX, worldY);
  }

  /**
   * Check collision with crops
   */
  public checkCropCollision(worldX: number, worldY: number): boolean {
    if (!this.cropSystem) return false;
    
    // Get the grid cell for this position
    const gridPos = this.worldToGrid(worldX, worldY);
    const cellKey = this.getCellKey(gridPos.x, gridPos.y);
    
    // Check if there are any crops in this cell
    const cropsInCell = this.cropSpatialIndex.get(cellKey);
    if (!cropsInCell || cropsInCell.size === 0) {
      return false;
    }
    
    // Check collision with each crop in the cell
    const cropIds = Array.from(cropsInCell);
    for (const cropId of cropIds) {
      const crop = this.cropSystem.getCropById(cropId);
      if (crop && this.isPointInCrop(worldX, worldY, crop)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if a point is inside a crop's collision area
   */
  private isPointInCrop(x: number, y: number, crop: any): boolean {
    const cropRadius = 16; // Crop collision radius
    const dx = x - crop.x;
    const dy = y - crop.y;
    return (dx * dx + dy * dy) <= (cropRadius * cropRadius);
  }

  /**
   * Check player collision with optimized grid lookup
   */
  public checkPlayerCollision(centerX: number, centerY: number, playerSize: number = 16): boolean {
    // Check all four corners of the player's collision box
    const corners = [
      { x: centerX - playerSize, y: centerY - playerSize }, // Top-left
      { x: centerX + playerSize, y: centerY - playerSize }, // Top-right
      { x: centerX - playerSize, y: centerY + playerSize }, // Bottom-left
      { x: centerX + playerSize, y: centerY + playerSize }  // Bottom-right
    ];
    
    // Check each corner for collision
    for (const corner of corners) {
      if (this.checkPointCollision(corner.x, corner.y)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get nearby collision cells for broad-phase collision detection
   */
  public getNearbyCells(worldX: number, worldY: number, radius: number): string[] {
    const cells: string[] = [];
    const gridPos = this.worldToGrid(worldX, worldY);
    const cellRadius = Math.ceil(radius / this.tileSize);
    
    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const x = gridPos.x + dx;
        const y = gridPos.y + dy;
        if (this.isValidGridPosition(x, y)) {
          cells.push(this.getCellKey(x, y));
        }
      }
    }
    
    return cells;
  }

  /**
   * Convert world coordinates to grid coordinates
   */
  private worldToGrid(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / this.tileSize),
      y: Math.floor(worldY / this.tileSize)
    };
  }

  /**
   * Check if a grid position is valid
   */
  private isValidGridPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
  }

  /**
   * Get a unique key for a grid cell
   */
  private getCellKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * Update the collision system (called periodically)
   */
  public update(time: number): void {
    // Periodically update the crop spatial index
    if (time - this.lastGridUpdate > this.gridUpdateInterval) {
      this.updateCropSpatialIndex();
      this.lastGridUpdate = time;
    }
  }

  /**
   * Debug: Visualize the collision grid
   */
  public renderDebug(graphics: Phaser.GameObjects.Graphics): void {
    graphics.clear();
    
    // Draw static collision grid
    graphics.lineStyle(1, 0xff0000, 0.5);
    graphics.fillStyle(0xff0000, 0.2);
    
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.collisionGrid[y][x]) {
          const worldX = x * this.tileSize;
          const worldY = y * this.tileSize;
          graphics.fillRect(worldX, worldY, this.tileSize, this.tileSize);
          graphics.strokeRect(worldX, worldY, this.tileSize, this.tileSize);
        }
      }
    }
    
    // Draw crop collision areas
    if (this.cropSystem) {
      graphics.lineStyle(1, 0x00ff00, 0.5);
      graphics.fillStyle(0x00ff00, 0.2);
      
      const crops = this.cropSystem.getAllCrops();
      for (const crop of crops) {
        graphics.fillCircle(crop.x, crop.y, 16);
        graphics.strokeCircle(crop.x, crop.y, 16);
      }
    }
  }

  /**
   * Get collision statistics for debugging
   */
  public getStats(): { static: number; crops: number; total: number } {
    let staticCount = 0;
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.collisionGrid[y][x]) staticCount++;
      }
    }
    
    let cropCount = 0;
    this.cropSpatialIndex.forEach(crops => {
      cropCount += crops.size;
    });
    
    return {
      static: staticCount,
      crops: cropCount,
      total: staticCount + cropCount
    };
  }
}