# Unified Gamified DeFi Aggregator Design

## Vision
Transform DeFi Valley into a gamified aggregation protocol that simplifies DeFi interactions across multiple protocols on Katana network through an intuitive farming game interface.

## Core Concept: "Plant Once, Yield Everywhere"
Players plant seeds that automatically deploy capital across multiple DeFi protocols based on strategy, with visual growth representing yield accumulation from all sources.

## Asset Maturity Tracking System

### 1. Hybrid Time + Yield Maturity Model
```typescript
interface CropMaturity {
  // Time-based components
  plantedAt: number;          // Timestamp when planted
  minGrowthTime: number;      // Minimum time before harvest (e.g., 24 hours)
  optimalHarvestTime: number; // Best time for harvest (e.g., 72 hours)
  
  // Yield-based components
  targetYield: number;        // Expected yield at optimal harvest
  currentYield: number;       // Actual accumulated yield
  yieldSources: YieldSource[]; // Breakdown by protocol
  
  // Visual maturity (0-100%)
  visualGrowth: number;       // Based on time
  yieldMaturity: number;      // Based on yield vs target
  overallMaturity: number;    // Weighted combination
}

interface YieldSource {
  protocol: 'morpho' | 'sushiswap' | 'aave' | 'compound';
  amount: number;
  apy: number;
  lastUpdated: number;
}
```

### 2. Maturity Calculation
```typescript
class MaturityCalculator {
  calculateMaturity(crop: Crop): CropMaturity {
    const now = Date.now();
    const age = now - crop.plantedAt;
    
    // Time-based maturity (0-100%)
    const timeProgress = Math.min(age / crop.optimalHarvestTime, 1) * 100;
    
    // Yield-based maturity (0-100%)
    const yieldProgress = (crop.currentYield / crop.targetYield) * 100;
    
    // Visual growth stages based on combined maturity
    const overallMaturity = (timeProgress * 0.6) + (yieldProgress * 0.4);
    
    return {
      visualGrowth: timeProgress,
      yieldMaturity: yieldProgress,
      overallMaturity,
      stage: this.getGrowthStage(overallMaturity)
    };
  }
  
  getGrowthStage(maturity: number): GrowthStage {
    if (maturity < 25) return 'seedling';
    if (maturity < 50) return 'sprout';
    if (maturity < 75) return 'growing';
    if (maturity < 100) return 'mature';
    return 'ready';
  }
}
```

## Protocol Aggregation Layer

### 1. Strategy Engine
```typescript
interface PlantingStrategy {
  id: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  protocols: ProtocolAllocation[];
  minDeposit: number;
  expectedAPY: number;
}

interface ProtocolAllocation {
  protocol: string;
  percentage: number;
  vault?: string;
  params?: any;
}

// Example strategies
const strategies: PlantingStrategy[] = [
  {
    id: 'safe-harvest',
    name: 'Safe Harvest',
    description: 'Low risk, stable yields from lending',
    riskLevel: 'low',
    protocols: [
      { protocol: 'morpho', percentage: 70, vault: 'vbETH' },
      { protocol: 'aave', percentage: 30 }
    ],
    minDeposit: 10,
    expectedAPY: 4.5
  },
  {
    id: 'yield-maximizer',
    name: 'Yield Maximizer',
    description: 'Higher risk, optimized yields',
    riskLevel: 'high',
    protocols: [
      { protocol: 'morpho', percentage: 40 },
      { protocol: 'sushiswap-lp', percentage: 40 },
      { protocol: 'options-vault', percentage: 20 }
    ],
    minDeposit: 100,
    expectedAPY: 12
  }
];
```

### 2. Aggregator Service
```typescript
class DeFiAggregatorService {
  async plantWithStrategy(params: {
    strategy: PlantingStrategy;
    amount: number;
    position: { x: number; y: number };
  }) {
    const allocations = this.calculateAllocations(params.amount, params.strategy);
    const transactions = [];
    
    // Deploy to each protocol
    for (const allocation of allocations) {
      const tx = await this.deployToProtocol(allocation);
      transactions.push(tx);
    }
    
    // Create unified crop representation
    const crop = await this.createUnifiedCrop({
      strategy: params.strategy,
      allocations,
      transactions,
      position: params.position
    });
    
    return crop;
  }
  
  async harvestUnifiedYield(cropId: string) {
    const crop = await this.getCrop(cropId);
    const yields = [];
    
    // Collect from all protocols
    for (const source of crop.yieldSources) {
      const yield = await this.collectYield(source);
      yields.push(yield);
    }
    
    // Optional: Auto-reinvest or return to player
    const totalYield = yields.reduce((sum, y) => sum + y.amount, 0);
    return { principal: crop.amount, yield: totalYield, total: crop.amount + totalYield };
  }
}
```

## Cohesive UI/UX Flow

### 1. Simplified Player Journey
```
1. Connect Wallet
   └─> Auto-detect Katana network
   └─> Show vbUSDC balance

2. Choose Strategy (not protocol)
   └─> "Safe Harvest" (Low risk, 4-5% APY)
   └─> "Balanced Growth" (Medium risk, 7-8% APY)  
   └─> "Yield Hunter" (High risk, 10-15% APY)

3. Plant Seed
   └─> Select amount (shows allocation preview)
   └─> Click empty plot
   └─> Single transaction (or batched)
   └─> Seed appears with strategy icon

4. Monitor Growth
   └─> Visual growth based on time + yield
   └─> Hover shows yield breakdown by protocol
   └─> Real-time APY from all sources
   └─> Weather effects = market conditions

5. Harvest
   └─> One click to collect all yields
   └─> Shows profit breakdown
   └─> Option to replant with compound
```

### 2. Visual Representation
```typescript
// Crop visuals represent aggregated positions
interface CropVisual {
  // Base sprite changes with growth stage
  sprite: 'seed' | 'sprout' | 'plant' | 'tree';
  
  // Overlay effects show performance
  glowColor: string; // Green = performing well, Red = underperforming
  glowIntensity: number; // Based on APY vs expected
  
  // Particle effects for high yields
  particles?: {
    type: 'coins' | 'sparkles';
    rate: number; // Based on yield rate
  };
  
  // Strategy badge
  strategyIcon: string;
  riskIndicator: 'low' | 'medium' | 'high';
}
```

### 3. Unified Dashboard
```typescript
// Single view for all DeFi positions
interface PlayerDashboard {
  // Portfolio overview
  totalValue: number;
  totalYield: number;
  avgAPY: number;
  
  // Active strategies
  activeStrategies: {
    strategy: PlantingStrategy;
    allocation: number;
    currentYield: number;
    apy: number;
  }[];
  
  // Historical performance
  harvestHistory: {
    date: Date;
    strategy: string;
    profit: number;
    apy: number;
  }[];
}
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Create strategy engine with 2-3 basic strategies
- [ ] Build maturity tracking system
- [ ] Implement Morpho + one other protocol

### Phase 2: Aggregation (Week 3-4)
- [ ] Add protocol abstraction layer
- [ ] Implement multi-protocol deployment
- [ ] Create unified yield collection

### Phase 3: Gamification (Week 5-6)
- [ ] Enhanced visuals based on performance
- [ ] Weather system = market conditions
- [ ] Achievement system for DeFi actions
- [ ] Leaderboards by strategy performance

### Phase 4: Advanced Features (Week 7-8)
- [ ] Auto-rebalancing strategies
- [ ] Social features (copy successful farmers)
- [ ] Strategy marketplace (user-created strategies)
- [ ] Cross-chain expansion beyond Katana

## Key Differentiators

1. **Strategy-First**: Players choose risk/reward profile, not protocols
2. **True Aggregation**: One seed = multiple protocol positions
3. **Visual Clarity**: Growth represents actual performance
4. **Reduced Complexity**: No need to understand individual protocols
5. **Gamified Learning**: Learn DeFi through gameplay

## Technical Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Game Client   │────▶│  Aggregator API  │────▶│ Protocol Adapters│
│  (Phaser + UI)  │     │  (Node + Redis)  │     │  (Morpho, Sushi)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                          │
         │                       ▼                          ▼
         │              ┌──────────────────┐      ┌─────────────────┐
         └─────────────▶│  Game Database   │      │ Katana Network  │
                        │ (SQLite/Postgres)│      │   (Contracts)   │
                        └──────────────────┘      └─────────────────┘
```

This design creates a cohesive product where the farming game is the UI layer for a sophisticated DeFi aggregator, making complex yield strategies accessible through simple gameplay.