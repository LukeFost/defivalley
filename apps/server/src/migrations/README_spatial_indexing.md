# Spatial Grid Indexing Implementation

## Overview
This implementation adds spatial grid indexing to optimize position-based queries for crops in the database.

## Key Changes

### 1. Database Schema Updates (Migration 002)
- Added `grid_x` and `grid_y` columns to the `crops` table
- Grid coordinates are calculated by dividing world coordinates by GRID_SIZE (default: 100)
- Created optimized indexes for spatial queries

### 2. DatabaseService Updates
- Added `GRID_SIZE` constant (100 units) - adjustable based on game scale
- Updated `saveCrop()` to automatically calculate and store grid coordinates
- Optimized `isPositionOccupied()` to use grid-based queries
- Added `getCropsInArea()` for efficient area queries
- Added `updateAllGridCoordinates()` utility method for maintenance

### 3. Performance Benefits
- **Before**: O(n) scan of all crops for position checks
- **After**: O(1) index lookup to find relevant grid cells, then only check crops in those cells
- Dramatic performance improvement for worlds with many crops

## How It Works

1. **Grid Calculation**: When a crop is planted at position (x, y), grid coordinates are calculated:
   - `grid_x = floor(x / 100)`
   - `grid_y = floor(y / 100)`

2. **Position Queries**: When checking if a position is occupied:
   - Calculate which grid cells could contain overlapping crops
   - Use indexes to quickly find only crops in those grid cells
   - Check exact distance only for crops in relevant cells

3. **Indexes**: Multiple indexes optimize different query patterns:
   - `idx_crops_spatial_grid`: Basic spatial queries
   - `idx_crops_player_grid`: Player-specific spatial queries
   - `idx_crops_exact_position`: Exact position lookups

## Usage
The spatial indexing is transparent to the rest of the application. Simply continue using the existing methods:
- `isPositionOccupied(x, y, radius)`
- `saveCrop(crop)`
- `getCropsInArea(minX, minY, maxX, maxY)`

The database will automatically use the optimized indexes for better performance.