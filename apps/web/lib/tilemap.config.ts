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

// Corrected tile index mapping for Phaser Tilemap system
// LPC tileset: 288px wide = 9 tiles per row (288/32=9)
// Index = (row * 9) + col, counting left-to-right, top-to-bottom from 0
export const TileIndexMap = {
  // Row 0 (y=0): Cliff formations
  cliff_tall_1: 0,    // (0,0) = (0*9)+0 = 0
  cliff_tall_2: 1,    // (32,0) = (0*9)+1 = 1  
  cliff_round: 2,     // (64,0) = (0*9)+2 = 2 (64x64, top-left index)
  cliff_large: 4,     // (128,0) = (0*9)+4 = 4 (64x64, top-left index)
  cliff_small: 6,     // (192,0) = (0*9)+6 = 6
  cliff_thin: 7,      // (224,0) = (0*9)+7 = 7
  
  // Row 2 (y=64): Grass-cliff transitions
  grass_cliff_left: 18,    // (0,64) = (2*9)+0 = 18
  grass_cliff_right: 19,   // (32,64) = (2*9)+1 = 19  
  grass_cliff_bottom: 20,  // (64,96) = (3*9)+2 = 29, but let's use simpler transition
  
  // Row 2-3: Main grass areas  
  grass_main: 21,     // (96,80) = (2*9)+3 = 21 (approximately, using row 2 col 3)
  grass_pure: 22,     // (128,80) = (2*9)+4 = 22 
  grass_with_cliff_base: 23, // Use next available grass variant
  
  // Decorations
  ladder: 25,         // (224,64) = (2*9)+7 = 25
  sticks: 26,         // (256,64) = (2*9)+8 = 26  
  rocks_brown: 45,    // (0,160) = (5*9)+0 = 45
  rocks_dark: 46,     // (32,160) = (5*9)+1 = 46
} as const;

export const TilesetConfig = {
  // Tileset image dimensions and tile size
  image: {
    width: 288,
    height: 224,
    tileSize: 32,
    tilesPerRow: 9  // 288 / 32 = 9 tiles per row
  },

  // Define specific tile regions from the tileset (actual pixel coordinates)
  tiles: {
    // Main grass areas from the large middle section
    grass_main: { x: 96, y: 80, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.grass_main },
    grass_pure: { x: 128, y: 80, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.grass_pure },
    grass_with_cliff_base: { x: 160, y: 120, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.grass_with_cliff_base },
    
    // Cliff formations from top row (correct heights)
    cliff_tall_1: { x: 0, y: 0, width: 32, height: 64, type: 'cliff', collision: true, index: TileIndexMap.cliff_tall_1 },
    cliff_tall_2: { x: 32, y: 0, width: 32, height: 64, type: 'cliff', collision: true, index: TileIndexMap.cliff_tall_2 },
    cliff_round: { x: 64, y: 0, width: 64, height: 64, type: 'cliff', collision: true, index: TileIndexMap.cliff_round },
    cliff_large: { x: 128, y: 0, width: 64, height: 64, type: 'cliff', collision: true, index: TileIndexMap.cliff_large },
    cliff_small: { x: 192, y: 0, width: 32, height: 32, type: 'cliff', collision: true, index: TileIndexMap.cliff_small },
    cliff_thin: { x: 224, y: 0, width: 32, height: 64, type: 'cliff', collision: true, index: TileIndexMap.cliff_thin },
    
    // Grass areas with natural cliff transitions
    grass_cliff_left: { x: 0, y: 64, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.grass_cliff_left },
    grass_cliff_right: { x: 32, y: 64, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.grass_cliff_right },
    grass_cliff_bottom: { x: 64, y: 96, width: 32, height: 32, type: 'grass', collision: false, index: TileIndexMap.grass_cliff_bottom },
    
    // Decorative elements  
    ladder: { x: 224, y: 64, width: 32, height: 32, type: 'decoration', collision: false, index: TileIndexMap.ladder },
    sticks: { x: 256, y: 64, width: 32, height: 32, type: 'decoration', collision: false, index: TileIndexMap.sticks },
    rocks_brown: { x: 0, y: 160, width: 32, height: 32, type: 'decoration', collision: false, index: TileIndexMap.rocks_brown },
    rocks_dark: { x: 32, y: 160, width: 32, height: 32, type: 'decoration', collision: false, index: TileIndexMap.rocks_dark },
  } as Record<string, TileConfig & { index: number }>,

  // Terrain patterns for different areas (updated with correct tile names)
  patterns: {
    border_cliff: ['cliff_tall_1', 'cliff_tall_2', 'cliff_thin'],
    interior_cliff: ['cliff_round', 'cliff_large', 'cliff_small'],
    grass_area: ['grass_main', 'grass_pure', 'grass_with_cliff_base'],
    transition_zone: ['grass_cliff_left', 'grass_cliff_right', 'grass_cliff_bottom'],
    decorations: ['ladder', 'sticks', 'rocks_brown', 'rocks_dark']
  },

  // Collision layers (updated with correct tile names)
  collisionLayers: {
    cliffs: ['cliff_tall_1', 'cliff_tall_2', 'cliff_round', 'cliff_large', 'cliff_small', 'cliff_thin'],
    walkable: ['grass_main', 'grass_pure', 'grass_with_cliff_base', 'grass_cliff_left', 'grass_cliff_right', 'grass_cliff_bottom'],
    decorative: ['ladder', 'sticks', 'rocks_brown', 'rocks_dark']
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

  /**
   * Generate terrain (alias for generateTerrainLayout)
   */
  static generateTerrain(width: number, height: number): string[][] {
    return TilemapUtils.generateTerrainLayout(width, height);
  }

  /**
   * Generate collision map from terrain layout
   */
  static generateCollisionMap(layout: string[][]): boolean[][] {
    const collisionMap: boolean[][] = [];
    
    for (let y = 0; y < layout.length; y++) {
      collisionMap[y] = [];
      for (let x = 0; x < layout[y].length; x++) {
        const tileType = layout[y][x];
        collisionMap[y][x] = TilemapUtils.hasCollision(tileType);
      }
    }
    
    return collisionMap;
  }
}