// apps/server/src/config/GameConfig.ts
export const GameConfig = {
  // Player settings
  PLAYER_SPEED: 540, // Adjusted for delta-time movement
  CAMERA_LERP_FACTOR: 0.1, // Camera smoothing

  // Network settings
  NETWORK_UPDATE_INTERVAL: 100, // ms, for player position sync
  NETWORK_SERVER_PORT: 2567,
  MAX_CLIENTS: 10,
  SIMULATION_INTERVAL: 100, // ms

  // Building settings
  BUILDING_INTERACTION_RADIUS: 250,
  BUILDING_CHECK_INTERVAL: 100, // ms
  BUILDING_SCALE: 0.4,
  BUILDING_DEPTH: 10,
  BUILDING_GLOW_LINE_WIDTH: 4,

  // Crop System settings
  CROP_UPDATE_INTERVAL: 500, // ms
  CROP_SPRITE_FRAME_WIDTH: 32,
  CROP_SPRITE_FRAME_HEIGHT: 32,
  CROP_SPRITE_SCALE: 1.5,
  CROP_INITIAL_HEALTH: 100,
  CROP_POSITION_TOLERANCE: 16, // pixels
  CROP_MIN_PLANTING_DISTANCE: 32, // pixels
  CROP_COLLISION_RADIUS: 50, // pixels
  
  // Farming area bounds
  FARMING_AREA_MIN_X: 100,
  FARMING_AREA_MAX_X: 700,
  FARMING_AREA_MIN_Y: 180,
  FARMING_AREA_MAX_Y: 500,

  // Animation settings
  HARVEST_ANIMATION_DURATION: 2000, // ms
  PLANT_ANIMATION_DURATION: 1000, // ms
  WITHER_ANIMATION_DURATION: 300, // ms
  TEXT_EFFECT_DURATION: 1000, // ms
  TEXT_EFFECT_Y_OFFSET: 40, // pixels

  // Particle effects
  SPARKLE_PARTICLE_COUNT: 6,
  SPARKLE_PARTICLE_RADIUS: 3,
  SPARKLE_PARTICLE_SPREAD: 40, // pixels

  // World settings
  WORLD_WIDTH: 5000,
  WORLD_HEIGHT: 4000,
  SERVER_WORLD_WIDTH: 3200, // Server-side world dimensions
  SERVER_WORLD_HEIGHT: 2400,
  TILE_SIZE: 32,

  // Tilemap settings
  TILESET_WIDTH: 288,
  TILESET_HEIGHT: 224,
  TILES_PER_ROW: 9,

  // API settings
  API_DEFAULT_PAGE: 1,
  API_DEFAULT_LIMIT: 20,

  // Color values
  FLOW_BANK_COLOR: 0xff6b35,
  FLOW_BANK_HOVER_COLOR: 0xffa500,
};