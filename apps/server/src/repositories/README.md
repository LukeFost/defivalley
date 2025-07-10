# Repository Pattern Implementation

This directory contains the repository pattern implementation for DeFi Valley's database layer.

## Overview

The repository pattern provides an abstraction layer between the domain logic and data access, offering:

- **Separation of Concerns**: Data access logic is separated from business logic
- **Testability**: Easy to mock repositories for unit testing
- **Flexibility**: Can switch database implementations without changing business logic
- **Type Safety**: Full TypeScript support with domain entities

## Architecture

```
┌─────────────────────┐
│   GameRoom/API      │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ DatabaseService     │ (Facade)
│ Refactored          │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Domain Services    │
│  - CropService      │
│  - YieldCalculator  │
│  - SpatialService   │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   Unit of Work      │
│  - Transactions     │
│  - Repository Access│
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   Repositories      │
│  - PlayerRepository │
│  - CropRepository   │
│  - WorldRepository  │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│    Database         │
│  (better-sqlite3)   │
└─────────────────────┘
```

## Components

### Domain Entities (`/domain/entities/`)
- **Player**: Rich domain entity with XP management and level calculation
- **Crop**: Domain entity with growth progress, harvest logic, and state management

### Domain Services (`/domain/services/`)
- **CropService**: Handles crop planting, harvesting, and world data
- **YieldCalculator**: Calculates yields, XP gains, and validates investments
- **SpatialService**: Manages spatial calculations, grid coordinates, and collision detection

### Repositories (`/repositories/`)
- **PlayerRepository**: CRUD operations for players
- **CropRepository**: CRUD operations for crops with spatial queries
- **WorldRepository**: Aggregated queries for world browser
- **UnitOfWork**: Transaction management and repository coordination

### Interfaces (`/repositories/interfaces/`)
- **IRepository**: Base repository interface
- **IPlayerRepository**: Player-specific operations
- **ICropRepository**: Crop-specific operations with spatial queries
- **IWorldRepository**: World aggregation operations
- **IUnitOfWork**: Transaction and repository management

## Usage

### Basic Usage (Through DatabaseServiceRefactored)
```typescript
import { DatabaseServiceRefactored } from './services/DatabaseServiceRefactored';

const dbService = new DatabaseServiceRefactored();

// Plant a crop
const cropId = dbService.saveCrop({
  player_id: 'player123',
  seed_type: 'usdc_sprout',
  x: 100,
  y: 200,
  planted_at: new Date().toISOString(),
  growth_time: 86400000,
  investment_amount: 10,
  harvested: false
});

// Harvest a crop
dbService.harvestCrop(cropId);
```

### Advanced Usage (Direct Repository Access)
```typescript
import { UnitOfWork } from './repositories/UnitOfWork';
import { CropService } from './domain/services/CropService';

const unitOfWork = new UnitOfWork(db);
const cropService = new CropService(unitOfWork);

// Plant with full validation
const result = await cropService.plantCrop(
  'player123',
  'premium_tree',
  150,
  250,
  100 // investment amount
);

if (result.success) {
  console.log('Planted:', result.crop);
} else {
  console.error('Failed:', result.error);
}
```

### Transaction Example
```typescript
unitOfWork.transaction(() => {
  // All operations in this block are atomic
  const player = unitOfWork.players.findById('player123');
  player.addXP(10);
  unitOfWork.players.save(player);
  
  const crop = Crop.create(/* ... */);
  unitOfWork.crops.save(crop);
  
  // If any operation fails, all are rolled back
});
```

## Benefits

1. **Clean Architecture**: Clear separation between data access and business logic
2. **Testability**: Mock repositories for unit tests without database
3. **Performance**: Same SQLite performance with better query organization
4. **Maintainability**: Easy to understand and modify
5. **Scalability**: Can add new repositories without affecting existing code
6. **Type Safety**: Full TypeScript support throughout

## Migration

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed migration instructions from the old DatabaseService.

## Testing

```typescript
// Example unit test with mocked repository
const mockCropRepo: ICropRepository = {
  findById: jest.fn().mockReturnValue(testCrop),
  save: jest.fn(),
  // ... other methods
};

const cropService = new CropService({ 
  crops: mockCropRepo,
  // ... other repos
} as IUnitOfWork);

// Test business logic without database
const result = cropService.harvestCrop('crop123', 'player123');
expect(result.success).toBe(true);
expect(mockCropRepo.save).toHaveBeenCalled();
```