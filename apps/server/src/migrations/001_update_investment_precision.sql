-- Migration: Update investment_amount to REAL for better precision
-- This migration updates the crops table to use REAL instead of INTEGER for investment amounts

-- Create a new temporary table with the correct schema
CREATE TABLE IF NOT EXISTS crops_new (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  seed_type TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  planted_at DATETIME NOT NULL,
  growth_time INTEGER NOT NULL,
  investment_amount REAL NOT NULL,
  harvested BOOLEAN DEFAULT FALSE,
  yield_amount REAL DEFAULT NULL,
  harvested_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
);

-- Copy data from old table if it exists
INSERT INTO crops_new 
SELECT 
  id,
  player_id,
  seed_type,
  x,
  y,
  planted_at,
  growth_time,
  CAST(investment_amount AS REAL),
  harvested,
  CAST(yield_amount AS REAL),
  harvested_at,
  created_at,
  updated_at
FROM crops
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='crops');

-- Drop old table if it exists
DROP TABLE IF EXISTS crops;

-- Rename new table
ALTER TABLE crops_new RENAME TO crops;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_crops_player_id ON crops (player_id);
CREATE INDEX IF NOT EXISTS idx_crops_harvested ON crops (harvested);
CREATE INDEX IF NOT EXISTS idx_crops_position ON crops (x, y);