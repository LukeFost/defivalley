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

export const TilesetConfig = {
  // Tileset image dimensions and tile size
  image: {
    width: 288,
    height: 224,
    tileSize: 32
  },

  // Define specific tile regions from the tileset
  tiles: {
    // Cliff tiles (estimated positions from the tileset)
    cliff_top: { x: 0, y: 0, width: 32, height: 32, type: 'cliff', collision: true },
    cliff_face: { x: 32, y: 0, width: 32, height: 32, type: 'cliff', collision: true },
    cliff_corner: { x: 64, y: 0, width: 32, height: 32, type: 'cliff', collision: true },
    
    // Grass tiles
    grass_full: { x: 96, y: 0, width: 32, height: 32, type: 'grass', collision: false },
    grass_sparse: { x: 128, y: 0, width: 32, height: 32, type: 'grass', collision: false },
    
    // Transition tiles
    cliff_grass_transition: { x: 0, y: 32, width: 32, height: 32, type: 'transition', collision: false },
    grass_cliff_transition: { x: 32, y: 32, width: 32, height: 32, type: 'transition', collision: false },
    
    // Large cliff formations
    cliff_large: { x: 64, y: 32, width: 64, height: 64, type: 'cliff', collision: true },
    
    // Additional decorative elements
    ladder: { x: 160, y: 32, width: 16, height: 32, type: 'decoration', collision: false },
    rocks: { x: 0, y: 64, width: 32, height: 16, type: 'decoration', collision: false },
  } as Record<string, TileConfig>,

  // Terrain patterns for different areas
  patterns: {
    border_cliff: ['cliff_top', 'cliff_face'],
    interior_cliff: ['cliff_corner', 'cliff_large'],
    grass_area: ['grass_full', 'grass_sparse'],
    transition_zone: ['cliff_grass_transition', 'grass_cliff_transition']
  },

  // Collision layers
  collisionLayers: {
    cliffs: ['cliff_top', 'cliff_face', 'cliff_corner', 'cliff_large'],
    walkable: ['grass_full', 'grass_sparse', 'cliff_grass_transition', 'grass_cliff_transition'],
    decorative: ['ladder', 'rocks']
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
   * Generate a natural terrain layout
   */
  static generateTerrainLayout(width: number, height: number): string[][] {
    const layout: string[][] = [];
    
    // Initialize with grass
    for (let y = 0; y < height; y++) {
      layout[y] = [];
      for (let x = 0; x < width; x++) {
        layout[y][x] = 'grass_full';
      }
    }

    // Add border cliffs
    for (let x = 0; x < width; x++) {
      layout[0][x] = 'cliff_top';
      layout[1][x] = 'cliff_face';
      if (height > 2) {
        layout[2][x] = 'cliff_grass_transition';
      }
    }

    // Add side cliffs
    for (let y = 0; y < Math.min(8, height); y++) {
      layout[y][0] = 'cliff_corner';
      layout[y][width - 1] = 'cliff_corner';
      if (width > 2) {
        layout[y][1] = 'cliff_grass_transition';
        layout[y][width - 2] = 'cliff_grass_transition';
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
              layout[tileY][tileX] = 'cliff_corner';
              
              // Add transitions around the island
              for (let ty = -1; ty <= island.size; ty++) {
                for (let tx = -1; tx <= island.size; tx++) {
                  const transX = island.x + tx;
                  const transY = island.y + ty;
                  if (transX >= 0 && transX < width && transY >= 0 && transY < height) {
                    if (tx === -1 || tx === island.size || ty === -1 || ty === island.size) {
                      if (layout[transY][transX] === 'grass_full') {
                        layout[transY][transX] = 'grass_cliff_transition';
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