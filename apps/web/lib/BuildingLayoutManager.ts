/**
 * BuildingLayoutManager - Intelligent building placement system
 * Ensures buildings are positioned within safe bounds and provides layout presets
 */

export interface BuildingPosition {
  x: number;
  y: number;
}

export interface BuildingBounds {
  width: number;
  height: number;
  offsetY?: number; // For buildings with bottom-center origin
}

export interface BuildingLayout {
  bank: BuildingPosition;
  marketplace: BuildingPosition;
  pepe?: BuildingPosition;
}

export class BuildingLayoutManager {
  private worldWidth: number;
  private worldHeight: number;
  private safeMargin: number = 200; // Pixels from edge

  constructor(worldWidth: number, worldHeight: number) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  /**
   * Get safe building positions that won't be cut off
   */
  public getSafeFlowLayout(): BuildingLayout {
    // Estimate building sizes based on sprite scale
    const buildingHeight = 400; // Approximate height with scale 0.4
    const buildingWidth = 300;  // Approximate width

    return {
      bank: {
        x: 500,
        y: this.safeMargin + buildingHeight // Move down from top edge
      },
      marketplace: {
        x: 500,
        y: this.worldHeight / 2 // Center of map
      },
      pepe: {
        x: 750,
        y: this.worldHeight - this.safeMargin - buildingHeight // Safe from bottom
      }
    };
  }

  /**
   * Get a grid-based layout for multiple buildings
   */
  public getGridLayout(buildingCount: number, startX: number, startY: number): BuildingPosition[] {
    const positions: BuildingPosition[] = [];
    const spacing = 400; // Space between buildings
    const columnsPerRow = 3;

    for (let i = 0; i < buildingCount; i++) {
      const row = Math.floor(i / columnsPerRow);
      const col = i % columnsPerRow;
      
      positions.push({
        x: startX + (col * spacing),
        y: startY + (row * spacing)
      });
    }

    return positions;
  }

  /**
   * Check if a position is safe (not cut off by edges)
   */
  public isPositionSafe(position: BuildingPosition, bounds: BuildingBounds): boolean {
    const topEdge = position.y - bounds.height - (bounds.offsetY || 0);
    const bottomEdge = position.y + (bounds.offsetY || 0);
    const leftEdge = position.x - bounds.width / 2;
    const rightEdge = position.x + bounds.width / 2;

    return (
      topEdge >= this.safeMargin &&
      bottomEdge <= this.worldHeight - this.safeMargin &&
      leftEdge >= this.safeMargin &&
      rightEdge <= this.worldWidth - this.safeMargin
    );
  }

  /**
   * Get a circular layout for buildings around a center point
   */
  public getCircularLayout(centerX: number, centerY: number, radius: number, buildingCount: number): BuildingPosition[] {
    const positions: BuildingPosition[] = [];
    const angleStep = (Math.PI * 2) / buildingCount;

    for (let i = 0; i < buildingCount; i++) {
      const angle = angleStep * i;
      positions.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      });
    }

    return positions;
  }
}