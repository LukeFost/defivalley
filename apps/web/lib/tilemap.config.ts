/**
 * Tilemap configuration for LPC cliffs grass tileset
 * This configuration defines how to use the tileset for creating natural terrain
 */

export interface TileConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  collision: boolean;
}

// Simplified tile index mapping for green.png tileset
// Green tileset: 32px wide = 1 tile per row (32/32=1)
// Single grass tile at index 0
export const TileIndexMap = {
  // Single grass tile - all terrain types use the same green tile
  grass_main: 0,
  grass_pure: 0,
  grass_with_cliff_base: 0,
  grass_cliff_left: 0,
  grass_cliff_right: 0,
  grass_cliff_bottom: 0,
  
  // Cliffs also use grass tile (no collision for simplified version)
  cliff_tall_1: 0,
  cliff_tall_2: 0,
  cliff_round: 0,
  cliff_large: 0,
  cliff_small: 0,
  cliff_thin: 0,
  
  // Decorations use grass tile
  ladder: 0,
  sticks: 0,
  rocks_brown: 0,
  rocks_dark: 0,
} as const;

export const TilesetConfig = {
  // Tileset image dimensions and tile size (updated for green.png)
  image: {
    width: 256,
    height: 256,
    tileSize: 32,
    tilesPerRow: 8  // 256/32 = 8 tiles per row
  },

  // Define specific tile regions from the tileset (using different areas of 256x256 green.png)
  tiles: {
    // Grass variants using different tiles from the tileset
    grass_main: { x: 0, y: 0, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.grass_main },
    grass_pure: { x: 0, y: 0, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.grass_pure },
    grass_with_cliff_base: { x: 0, y: 0, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.grass_with_cliff_base },
    
    // Cliff formations use grass tile (no collision for simplified version)
    cliff_tall_1: { x: 0, y: 0, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.cliff_tall_1 },
    cliff_tall_2: { x: 0, y: 0, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.cliff_tall_2 },
    cliff_round: { x: 0, y: 0, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.cliff_round },
    cliff_large: { x: 0, y: 0, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.cliff_large },
    cliff_small: { x: 0, y: 0, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.cliff_small },
    cliff_thin: { x: 0, y: 0, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.cliff_thin },
    
    // Grass areas with natural cliff transitions
    grass_cliff_left: { x: 0, y: 0, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.grass_cliff_left },
    grass_cliff_right: { x: 0, y: 0, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.grass_cliff_right },
    grass_cliff_bottom: { x: 0, y: 0, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.grass_cliff_bottom },
    
    // Decorative elements use grass tile
    ladder: { x: 0, y: 0, width: 32, height: 32, type: 'decoration', collision: false, index: TileIndexMap.ladder },
    sticks: { x: 0, y: 0, width: 32, height: 32, type: 'decoration', collision: false, index: TileIndexMap.sticks },
    rocks_brown: { x: 0, y: 0, width: 32, height: 32, type: 'decoration', collision: false, index: TileIndexMap.rocks_brown },
    rocks_dark: { x: 0, y: 0, width: 32, height: 32, type: 'decoration', collision: false, index: TileIndexMap.rocks_dark },
  } as Record<string, TileConfig & { index: number }>,

  // Terrain patterns for different areas (updated with correct tile names)
  patterns: {
    border_cliff: ['cliff_tall_1', 'cliff_tall_2', 'cliff_thin'],
    interior_cliff: ['cliff_round', 'cliff_large', 'cliff_small'],
    grass_area: ['grass_main', 'grass_pure', 'grass_with_cliff_base'],
    transition_zone: ['grass_cliff_left', 'grass_cliff_right', 'grass_cliff_bottom'],
    decorations: ['ladder', 'sticks', 'rocks_brown', 'rocks_dark']
  },

  // Collision layers (updated for green.png - all tiles are walkable grass)
  collisionLayers: {
    cliffs: [], // No collision tiles in simplified version
    walkable: ['grass_main', 'grass_pure', 'grass_with_cliff_base', 'grass_cliff_left', 'grass_cliff_right', 'grass_cliff_bottom', 'cliff_tall_1', 'cliff_tall_2', 'cliff_round', 'cliff_large', 'cliff_small', 'cliff_thin', 'ladder', 'sticks', 'rocks_brown', 'rocks_dark'], // All tiles are walkable
    decorative: [] // No special decorative layer
  }
};

/**
 * Utility functions for tilemap operations
 */
export class TilemapUtils {
  
  /**
   * Convert world coordinates to tile coordinates
   */
  static worldToTile(worldX: number, worldY: number, tileSize: number = 32): { x: number, y: number } {
    return {
      x: Math.floor(worldX / tileSize),
      y: Math.floor(worldY / tileSize)
    };
  }

  /**
   * Convert tile coordinates to world coordinates
   */
  static tileToWorld(tileX: number, tileY: number, tileSize: number = 32): { x: number, y: number } {
    return {
      x: tileX * tileSize + tileSize / 2,
      y: tileY * tileSize + tileSize / 2
    };
  }

  /**
   * Check if a tile type has collision
   */
  static hasCollision(tileType: string): boolean {
    const tile = TilesetConfig.tiles[tileType];
    return tile ? tile.collision : false;
  }

  /**
   * Get random tile from a pattern
   */
  static getRandomTileFromPattern(pattern: string[]): string {
    return pattern[Math.floor(Math.random() * pattern.length)];
  }

  /**
   * Get tile index for Phaser Tilemap system
   */
  static getTileIndexByName(tileName: string): number {
    const tileConfig = TilesetConfig.tiles[tileName];
    return tileConfig?.index ?? -1;
  }

  /**
   * Generate a natural terrain layout
   */
  static generateTerrainLayout(width: number, height: number): string[][] {
    const layout: string[][] = [];
    
    // Initialize with main grass tile
    for (let y = 0; y < height; y++) {
      layout[y] = [];
      for (let x = 0; x < width; x++) {
        layout[y][x] = 'grass_main';
      }
    }

    // Add border cliffs with proper tile names
    for (let x = 0; x < width; x++) {
      if (x % 3 === 0) {
        layout[0][x] = 'cliff_tall_1';
      } else if (x % 3 === 1) {
        layout[0][x] = 'cliff_tall_2';
      } else {
        layout[0][x] = 'cliff_thin';
      }
      if (height > 1) {
        layout[1][x] = 'grass_cliff_bottom';
      }
    }

    // Add side cliffs with variety
    for (let y = 0; y < Math.min(6, height); y++) {
      if (y < 2) {
        layout[y][0] = 'cliff_small';
        layout[y][width - 1] = 'cliff_small';
      } else {
        layout[y][0] = 'grass_cliff_left';
        layout[y][width - 1] = 'grass_cliff_right';
      }
    }

    // Add interior cliff islands
    const islands = [
      { x: 5, y: 5, size: 2 },
      { x: width - 7, y: 4, size: 2 },
      { x: Math.floor(width / 2), y: 6, size: 1 }
    ];

    islands.forEach(island => {
      if (island.x + island.size < width && island.y + island.size < height) {
        for (let dy = 0; dy < island.size; dy++) {
          for (let dx = 0; dx < island.size; dx++) {
            const tileX = island.x + dx;
            const tileY = island.y + dy;
            if (tileX < width && tileY < height) {
              layout[tileY][tileX] = island.size > 1 ? 'cliff_large' : 'cliff_round';
              
              // Add transitions around the island
              for (let ty = -1; ty <= island.size; ty++) {
                for (let tx = -1; tx <= island.size; tx++) {
                  const transX = island.x + tx;
                  const transY = island.y + ty;
                  if (transX >= 0 && transX < width && transY >= 0 && transY < height) {
                    if (tx === -1 || tx === island.size || ty === -1 || ty === island.size) {
                      if (layout[transY][transX] === 'grass_main') {
                        // Add appropriate grass-cliff transition based on position
                        if (tx === -1) layout[transY][transX] = 'grass_cliff_left';
                        else if (tx === island.size) layout[transY][transX] = 'grass_cliff_right';
                        else layout[transY][transX] = 'grass_cliff_bottom';
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    return layout;
  }
}