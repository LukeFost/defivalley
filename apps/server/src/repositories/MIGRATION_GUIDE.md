# Migration Guide: Database Service to Repository Pattern

This guide explains how to migrate from the monolithic `DatabaseService` to the new repository pattern implementation.

## Architecture Overview

### Old Architecture
- **DatabaseService**: Single class handling all database operations, business logic, and spatial calculations
- **Direct SQL**: All queries written directly in the service
- **Mixed Concerns**: Data access, business logic, and domain logic all in one place

### New Architecture
- **Repository Pattern**: Separate repositories for each entity (Player, Crop, World)
- **Unit of Work**: Manages transactions and provides access to all repositories
- **Domain Layer**: Business logic separated into domain services
- **Clean Architecture**: Clear separation of concerns

## Component Structure

```
src/
├── domain/
│   ├── entities/          # Domain entities (Player, Crop)
│   │   ├── Player.ts
│   │   └── Crop.ts
│   └── services/          # Business logic services
│       ├── YieldCalculator.ts
│       ├── SpatialService.ts
│       └── CropService.ts
├── repositories/
│   ├── interfaces/        # Repository interfaces
│   │   ├── IRepository.ts
│   │   ├── IPlayerRepository.ts
│   │   ├── ICropRepository.ts
│   │   ├── IWorldRepository.ts
│   │   └── IUnitOfWork.ts
│   ├── PlayerRepository.ts
│   ├── CropRepository.ts
│   ├── WorldRepository.ts
│   └── UnitOfWork.ts
└── services/
    ├── DatabaseService.ts          # Original (kept for compatibility)
    └── DatabaseServiceRefactored.ts # New facade over repositories
```

## Key Changes

### 1. Entity Classes
Domain entities now encapsulate their own behavior:

```typescript
// Old: Plain interface
interface Crop {
  id: string;
  // ... fields
}

// New: Rich domain entity
class Crop {
  isReady(): boolean { /* ... */ }
  getProgress(): number { /* ... */ }
  harvest(yieldAmount: number): void { /* ... */ }
}
```

### 2. Repository Pattern
Data access is now abstracted through repositories:

```typescript
// Old: Direct SQL in service
const stmt = db.prepare('SELECT * FROM crops WHERE id = ?');

// New: Repository method
const crop = unitOfWork.crops.findById(cropId);
```

### 3. Business Logic Separation
Business logic moved to domain services:

```typescript
// Old: Mixed in DatabaseService
calculateYield(investmentAmount, plantedAt, baseYieldRate) { /* ... */ }

// New: Dedicated YieldCalculator service
yieldCalculator.calculateYield(investmentAmount, plantedAt, seedType);
```

### 4. Transaction Management
Transactions now managed through Unit of Work:

```typescript
// Old: Direct transaction
db.transaction(() => { /* ... */ })();

// New: Unit of Work transaction
unitOfWork.transaction(() => {
  unitOfWork.crops.save(crop);
  unitOfWork.players.save(player);
});
```

## Migration Steps

### Step 1: Install Dependencies
No new dependencies required - uses existing `better-sqlite3`.

### Step 2: Update Imports
Replace DatabaseService imports:

```typescript
// Old
import { databaseService } from './services/DatabaseService';

// New (during migration)
import { DatabaseServiceRefactored } from './services/DatabaseServiceRefactored';
const databaseService = new DatabaseServiceRefactored();
```

### Step 3: Update GameRoom (Example)
The `DatabaseServiceRefactored` maintains the same API, so minimal changes needed:

```typescript
// Most code remains the same
// Only change is the import and instantiation
```

### Step 4: Gradual Migration
For a gradual migration:

1. Start using `DatabaseServiceRefactored` for new features
2. Keep existing `DatabaseService` for current code
3. Gradually update each usage
4. Remove old service when complete

## Benefits

1. **Testability**: Each repository can be easily mocked
2. **Maintainability**: Clear separation of concerns
3. **Scalability**: Easy to add new repositories or services
4. **Type Safety**: Rich domain entities with methods
5. **Transaction Safety**: Proper transaction boundaries
6. **Performance**: Same performance with better organization

## Advanced Usage

### Using Repositories Directly
For more control, use repositories directly:

```typescript
const unitOfWork = new UnitOfWork(db);
const cropService = new CropService(unitOfWork);

// Plant a crop with full domain logic
const result = cropService.plantCrop(
  playerId,
  seedType,
  x, y,
  investmentAmount
);

if (result.success) {
  console.log('Crop planted:', result.crop);
} else {
  console.error('Failed:', result.error);
}
```

### Custom Queries
Add new repository methods for custom queries:

```typescript
// In ICropRepository
findReadyForHarvest(playerId: string): Crop[];

// Implementation
findReadyForHarvest(playerId: string): Crop[] {
  const stmt = this.db.prepare(`
    SELECT * FROM crops 
    WHERE player_id = ? 
    AND harvested = FALSE 
    AND datetime(planted_at, '+' || (growth_time/1000) || ' seconds') <= datetime('now')
  `);
  const rows = stmt.all(playerId);
  return rows.map(row => this.rowToCrop(row));
}
```

## Testing

The new architecture makes testing much easier:

```typescript
// Mock repositories
const mockCropRepo: ICropRepository = {
  findById: jest.fn(),
  save: jest.fn(),
  // ...
};

// Test domain logic in isolation
const cropService = new CropService({ crops: mockCropRepo });
```

## Rollback Plan

If issues arise, you can instantly rollback by:
1. Change import back to original `DatabaseService`
2. No other code changes needed (API is compatible)