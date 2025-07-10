import { CROP_COLLISION_RADIUS } from '../../types/game.types';

export interface GridCoordinates {
  gridX: number;
  gridY: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class SpatialService {
  constructor(private readonly gridSize: number = 100) {}

  /**
   * Calculate grid coordinates for a position
   */
  calculateGridCoordinates(x: number, y: number): GridCoordinates {
    return {
      gridX: Math.floor(x / this.gridSize),
      gridY: Math.floor(y / this.gridSize)
    };
  }

  /**
   * Calculate grid bounds for an area with a radius
   */
  calculateGridBounds(x: number, y: number, radius: number): {
    minGridX: number;
    maxGridX: number;
    minGridY: number;
    maxGridY: number;
  } {
    const { gridX, gridY } = this.calculateGridCoordinates(x, y);
    const gridRadius = Math.ceil(radius / this.gridSize);
    
    return {
      minGridX: gridX - gridRadius,
      maxGridX: gridX + gridRadius,
      minGridY: gridY - gridRadius,
      maxGridY: gridY + gridRadius
    };
  }

  /**
   * Calculate grid bounds for a bounding box
   */
  calculateGridBoundsForArea(box: BoundingBox): {
    minGrid: GridCoordinates;
    maxGrid: GridCoordinates;
  } {
    return {
      minGrid: this.calculateGridCoordinates(box.minX, box.minY),
      maxGrid: this.calculateGridCoordinates(box.maxX, box.maxY)
    };
  }

  /**
   * Check if two positions are within collision radius
   */
  checkCollision(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    radius: number = CROP_COLLISION_RADIUS
  ): boolean {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const distanceSquared = dx * dx + dy * dy;
    const radiusSquared = radius * radius;
    return distanceSquared <= radiusSquared;
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }
}