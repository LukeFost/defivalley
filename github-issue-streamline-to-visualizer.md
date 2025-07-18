# Streamline DeFi Valley to Portfolio Visualizer

## Overview
Remove transaction complexity and cross-chain mechanics to focus on being a beautiful, shareable portfolio visualizer for existing DeFi positions.

## Major Components to Remove

### 1. Cross-Chain Infrastructure ❌
**Remove completely:**
- `packages/contracts/*` - All smart contracts
- `apps/web/app/hooks/useCrossChainTx.ts`
- `apps/web/components/TransactionTracker.tsx`
- Axelar integration and gas payment logic
- Multi-network configuration (keep only Katana)

### 2. Transaction Mechanics ❌
**Remove these hooks:**
- `usePlantSeed()`
- `useHarvestSeed()` 
- `useClaimYield()`
- `useBatchHarvest()`
- All write operations to contracts

**Simplify BlockchainService:**
- Remove all transaction methods
- Keep only read methods for fetching positions
- Remove retry logic, gas estimation, network switching

### 3. Game Server Complexity ❌
**Remove from Colyseus:**
- Multi-world support
- Player authentication
- Real-time synchronization
- Chat system
- Player movement

**Keep only:**
- Local farm state
- Visual updates
- Decoration placement

### 4. UI Components for Transactions ❌
**Remove:**
- `PlantSeedDialog.tsx` / `FixedPlantSeedDialog.tsx`
- `TransactionTracker.tsx`
- `NetworkSelector.tsx` (if keeping single chain)
- Gas estimation UI

### 5. Building Interactions ❌
**Simplify buildings:**
- Remove `BaseInteractiveBuilding.ts`
- Remove `BuildingInteractionManager.ts`
- Remove all dialog prompts from buildings
- Keep buildings as decorative elements only

### 6. Database Layer ❌
**Remove entirely:**
- SQLite database
- All repositories and services
- World creation/management
- Player stats tracking
- API routes for worlds

## What to Keep and Enhance ✅

### Core Visualization
```typescript
// Keep these for rendering
- MainScene.ts (simplified)
- CropSystem.ts (repurposed for positions)
- tilemap.config.ts
- character.config.ts
- Phaser game engine
```

### Position Import System (NEW)
```typescript
// New hook to replace transaction hooks
export function usePortfolioPositions() {
  const { address } = useAccount();
  
  // Read Morpho positions
  const morphoPositions = useMorphoPosition();
  
  // Read SushiSwap LP tokens
  const lpPositions = useLPPositions();
  
  // Read other DeFi positions
  // ...
  
  return {
    positions: [...morphoPositions, ...lpPositions],
    totalValue: calculateTotal(),
    isLoading
  };
}
```

### Weather System (NEW)
```typescript
// Add market condition visualization
export function useMarketWeather() {
  const { data: volatility } = useMarketVolatility();
  
  return {
    weather: getWeatherFromVolatility(volatility),
    effects: getWeatherEffects()
  };
}
```

### Simplified Architecture
```
Before (Complex):
Wallet → Contracts → Cross-chain → Game Server → Database → UI

After (Simple):
Wallet → Read Positions → Visualize → Share
```

## Implementation Steps

### Phase 1: Remove Complexity (Week 1)
1. [ ] Delete `packages/contracts` directory
2. [ ] Remove all transaction hooks
3. [ ] Simplify BlockchainService to read-only
4. [ ] Remove TransactionTracker component
5. [ ] Remove building interaction system
6. [ ] Delete database layer

### Phase 2: Add Visualization (Week 2)
1. [ ] Create `usePortfolioPositions` hook
2. [ ] Convert positions to visual crops
3. [ ] Add weather system based on market
4. [ ] Implement decoration system
5. [ ] Add screenshot/share functionality

### Phase 3: Polish (Week 3)
1. [ ] Improve visual effects
2. [ ] Add more decoration options
3. [ ] Create tutorial flow
4. [ ] Add social features

## Benefits of Streamlining

1. **80% Less Code** - Easier to maintain
2. **No Gas Costs** - Just reading data
3. **Instant Loading** - No transaction wait times
4. **Broader Appeal** - Works with any DeFi position
5. **Faster Development** - Focus on fun, not infrastructure

## Example: Simplified Position Display

```typescript
// Before: Complex transaction flow
const { plantSeed } = useCrossChainTx();
await plantSeed({ seedType: 1, amount: "100" });
// Wait for cross-chain confirmation...

// After: Simple visualization
const { positions } = usePortfolioPositions();
positions.forEach(pos => {
  scene.addCrop({
    protocol: pos.protocol,
    value: pos.value,
    apy: pos.apy,
    visual: getCropVisual(pos)
  });
});
```

## Keep It Simple
The goal is to make DeFi portfolios as shareable as a gaming achievement. Remove everything that doesn't serve that vision.