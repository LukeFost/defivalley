/**
 * Centralized game configuration for DeFi Valley
 * All game constants and tunable parameters in one place
 */

export const GameConfig = {
  // World dimensions
  world: {
    width: 5000,
    height: 4000,
    tileSize: 32,
  },

  // Player movement
  player: {
    baseSpeed: 540, // pixels per second
    collisionBoxSize: 16, // half the player's collision box
    spawnPosition: { x: 300, y: 300 }, // Safe, open area
  },

  // Camera settings
  camera: {
    lerpFactor: 0.1, // smooth camera following
  },

  // Network settings
  network: {
    positionSyncInterval: 100, // ms between position updates (10Hz)
    port: '2567',
  },

  // Update intervals (in milliseconds)
  updateIntervals: {
    buildingCheck: 100, // 10 times per second
    cropUpdate: 500, // 2 times per second
  },

  // Building positions (Katana network)
  buildings: {
    katana: {
      bank: { x: 800, y: 600 },
      marketplace: { x: 800, y: 400 },
    },
    flow: {
      bank: { x: 500, y: 350 },
      marketplace: { x: 500, y: 750 },
      pepe: { x: 750, y: 800 },
    },
  },

  // Terrain generation
  terrain: {
    grassVariantChance: 0.2, // 20% chance for grass variants
    decorationChance: 0.02, // 2% chance for decorations
    cliffFormationCount: 5, // number of cliff outcrops
  },

  // Debug settings
  debug: {
    enabled: false,
    showPhysics: false,
    showTileGrid: false,
  },
} as const;