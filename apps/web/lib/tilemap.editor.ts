/**
 * Tilemap Editor Utility
 * Provides runtime editing capabilities for the terrain tilemap
 */

import { TilesetConfig, TilemapUtils } from './tilemap.config';

export interface TerrainEdit {
  x: number;
  y: number;
  oldTileType: string;
  newTileType: string;
  timestamp: number;
}

export class TilemapEditor {
  private editHistory: TerrainEdit[] = [];
  private maxHistorySize = 50;

  /**
   * Edit a single tile in the terrain layout
   */
  static editTile(
    terrainLayout: string[][],
    tileX: number,
    tileY: number,
    newTileType: string
  ): { success: boolean; oldTileType?: string; error?: string } {
    // Validate bounds
    if (tileY < 0 || tileY >= terrainLayout.length || 
        tileX < 0 || tileX >= terrainLayout[0].length) {
      return {
        success: false,
        error: `Tile position (${tileX}, ${tileY}) is out of bounds`
      };
    }

    // Validate tile type
    if (!TilesetConfig.tiles[newTileType]) {
      return {
        success: false,
        error: `Unknown tile type: ${newTileType}`
      };
    }

    const oldTileType = terrainLayout[tileY][tileX];
    terrainLayout[tileY][tileX] = newTileType;

    return {
      success: true,
      oldTileType
    };
  }

  /**
   * Paint an area with a specific tile type
   */
  static paintArea(
    terrainLayout: string[][],
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    tileType: string
  ): { success: boolean; editCount?: number; error?: string } {
    // Validate tile type
    if (!TilesetConfig.tiles[tileType]) {
      return {
        success: false,
        error: `Unknown tile type: ${tileType}`
      };
    }

    let editCount = 0;
    const minX = Math.max(0, Math.min(startX, endX));
    const maxX = Math.min(terrainLayout[0].length - 1, Math.max(startX, endX));
    const minY = Math.max(0, Math.min(startY, endY));
    const maxY = Math.min(terrainLayout.length - 1, Math.max(startY, endY));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (terrainLayout[y][x] !== tileType) {
          terrainLayout[y][x] = tileType;
          editCount++;
        }
      }
    }

    return {
      success: true,
      editCount
    };
  }

  /**
   * Create a smooth transition between two tile types
   */
  static createTransition(
    terrainLayout: string[][],
    fromTileType: string,
    toTileType: string,
    transitionTileType: string
  ): { success: boolean; transitionCount?: number; error?: string } {
    if (!TilesetConfig.tiles[transitionTileType]) {
      return {
        success: false,
        error: `Unknown transition tile type: ${transitionTileType}`
      };
    }

    let transitionCount = 0;

    for (let y = 0; y < terrainLayout.length; y++) {
      for (let x = 0; x < terrainLayout[y].length; x++) {
        if (terrainLayout[y][x] === fromTileType) {
          // Check adjacent tiles for the target type
          const adjacent = [
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
          ];

          const hasAdjacentTarget = adjacent.some(({ dx, dy }) => {
            const newX = x + dx;
            const newY = y + dy;
            return newX >= 0 && newX < terrainLayout[0].length &&
                   newY >= 0 && newY < terrainLayout.length &&
                   terrainLayout[newY][newX] === toTileType;
          });

          if (hasAdjacentTarget) {
            terrainLayout[y][x] = transitionTileType;
            transitionCount++;
          }
        }
      }
    }

    return {
      success: true,
      transitionCount
    };
  }

  /**
   * Generate a natural island formation
   */
  static createIsland(
    terrainLayout: string[][],
    centerX: number,
    centerY: number,
    radius: number,
    coreTileType: string,
    edgeTileType: string
  ): { success: boolean; tilesChanged?: number; error?: string } {
    if (!TilesetConfig.tiles[coreTileType] || !TilesetConfig.tiles[edgeTileType]) {
      return {
        success: false,
        error: 'Unknown tile types'
      };
    }

    let tilesChanged = 0;

    for (let y = 0; y < terrainLayout.length; y++) {
      for (let x = 0; x < terrainLayout[y].length; x++) {
        const distance = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );

        if (distance <= radius) {
          if (distance <= radius * 0.6) {
            // Core area
            terrainLayout[y][x] = coreTileType;
            tilesChanged++;
          } else {
            // Edge area
            terrainLayout[y][x] = edgeTileType;
            tilesChanged++;
          }
        }
      }
    }

    return {
      success: true,
      tilesChanged
    };
  }

  /**
   * Validate terrain layout for logical consistency
   */
  static validateTerrain(terrainLayout: string[][]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let y = 0; y < terrainLayout.length; y++) {
      for (let x = 0; x < terrainLayout[y].length; x++) {
        const tileType = terrainLayout[y][x];

        // Check if tile type exists
        if (!TilesetConfig.tiles[tileType]) {
          errors.push(`Unknown tile type '${tileType}' at (${x}, ${y})`);
          continue;
        }

        // Check for floating cliff tiles
        if (tileType.includes('cliff')) {
          const isSupported = this.checkCliffSupport(terrainLayout, x, y);
          if (!isSupported) {
            warnings.push(`Unsupported cliff tile at (${x}, ${y})`);
          }
        }

        // Check for isolated tiles
        if (this.isIsolatedTile(terrainLayout, x, y, tileType)) {
          warnings.push(`Isolated ${tileType} tile at (${x}, ${y})`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if a cliff tile has proper support
   */
  private static checkCliffSupport(
    terrainLayout: string[][],
    x: number,
    y: number
  ): boolean {
    const adjacent = [
      { dx: 0, dy: 1 },  // Below
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 0 },  // Right
    ];

    return adjacent.some(({ dx, dy }) => {
      const newX = x + dx;
      const newY = y + dy;
      if (newX >= 0 && newX < terrainLayout[0].length &&
          newY >= 0 && newY < terrainLayout.length) {
        const adjacentTile = terrainLayout[newY][newX];
        return adjacentTile.includes('cliff') || adjacentTile.includes('transition');
      }
      return false;
    });
  }

  /**
   * Check if a tile is isolated (no similar neighbors)
   */
  private static isIsolatedTile(
    terrainLayout: string[][],
    x: number,
    y: number,
    tileType: string
  ): boolean {
    const neighbors = [
      { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy: 0 },                     { dx: 1, dy: 0 },
      { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 }
    ];

    const similarNeighbors = neighbors.filter(({ dx, dy }) => {
      const newX = x + dx;
      const newY = y + dy;
      if (newX >= 0 && newX < terrainLayout[0].length &&
          newY >= 0 && newY < terrainLayout.length) {
        const neighborTile = terrainLayout[newY][newX];
        // Consider tiles similar if they're the same type or compatible types
        return neighborTile === tileType ||
               (tileType.includes('cliff') && neighborTile.includes('cliff')) ||
               (tileType.includes('grass') && neighborTile.includes('grass'));
      }
      return false;
    });

    return similarNeighbors.length === 0;
  }

  /**
   * Export terrain layout to JSON
   */
  static exportTerrain(terrainLayout: string[][]): string {
    return JSON.stringify({
      version: '1.0',
      width: terrainLayout[0].length,
      height: terrainLayout.length,
      layout: terrainLayout,
      metadata: {
        exported: new Date().toISOString(),
        tileTypes: [...new Set(terrainLayout.flat())],
        validation: this.validateTerrain(terrainLayout)
      }
    }, null, 2);
  }

  /**
   * Import terrain layout from JSON
   */
  static importTerrain(jsonData: string): {
    success: boolean;
    terrainLayout?: string[][];
    error?: string;
  } {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.layout || !Array.isArray(data.layout)) {
        return {
          success: false,
          error: 'Invalid terrain data format'
        };
      }

      // Validate the imported layout
      const validation = this.validateTerrain(data.layout);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid terrain: ${validation.errors.join(', ')}`
        };
      }

      return {
        success: true,
        terrainLayout: data.layout
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse JSON: ${error}`
      };
    }
  }
}