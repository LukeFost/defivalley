-- Migration: Add spatial grid indexing for optimized position queries
-- This migration adds grid_x and grid_y columns to crops table for efficient spatial indexing

-- Add grid columns to crops table
ALTER TABLE crops ADD COLUMN grid_x INTEGER;
ALTER TABLE crops ADD COLUMN grid_y INTEGER;

-- Update existing crops with calculated grid coordinates
-- Using grid size of 100 units (adjustable based on your game's scale)
UPDATE crops 
SET 
  grid_x = CAST(x / 100 AS INTEGER),
  grid_y = CAST(y / 100 AS INTEGER);

-- Create optimized spatial index on grid coordinates
CREATE INDEX IF NOT EXISTS idx_crops_spatial_grid ON crops (grid_x, grid_y, harvested);

-- Create composite index for efficient grid-based queries with player filtering
CREATE INDEX IF NOT EXISTS idx_crops_player_grid ON crops (player_id, grid_x, grid_y, harvested) 
WHERE harvested = FALSE;

-- Drop old position index as it's replaced by spatial grid
DROP INDEX IF EXISTS idx_crops_position;

-- Create new optimized position index for exact position lookups
CREATE INDEX IF NOT EXISTS idx_crops_exact_position ON crops (x, y) WHERE harvested = FALSE;