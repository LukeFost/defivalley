# Implement Complete Game Loop with Mock Yield System

## Overview
Create a fully functional game loop that allows players to plant seeds, watch them grow, and harvest yields. This implementation will use a mock yield system for rapid development, with the ability to integrate real DeFi protocols later.

## Game Loop Flow
1. **Deposit** → Player deposits tokens to plant a seed
2. **Growth** → Seed grows over time (24-72 hours based on type)
3. **Yield Accrual** → Mock yield accumulates during growth
4. **Harvest** → Player harvests crop and receives principal + yield
5. **Repeat** → Use profits to plant more seeds

## Implementation Details

### 1. Smart Contract - Simplified Game Loop

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract FarmingGame {
    struct Seed {
        uint256 seedType;
        uint256 amount;
        uint256 plantTime;
        uint256 expectedHarvestTime;
        bool isHarvested;
        address owner;
    }
    
    struct SeedType {
        string name;
        uint256 minDeposit;
        uint256 growthDuration; // in seconds
        uint256 baseYieldBPS; // basis points (500 = 5%)
    }
    
    mapping(uint256 => Seed) public seeds;
    mapping(uint256 => SeedType) public seedTypes;
    mapping(address => uint256[]) public playerSeeds;
    
    uint256 public nextSeedId = 1;
    IERC20 public gameToken; // vbUSDC on Katana
    
    constructor(address _gameToken) {
        gameToken = IERC20(_gameToken);
        
        // Initialize seed types
        seedTypes[1] = SeedType("USDC Sprout", 10e6, 1 days, 500); // 5% APY
        seedTypes[2] = SeedType("Premium Tree", 100e6, 2 days, 550); // 5.5% APY
        seedTypes[3] = SeedType("Whale Forest", 1000e6, 3 days, 600); // 6% APY
    }
    
    function plantSeed(uint256 _seedType, uint256 _amount) external returns (uint256 seedId) {
        SeedType memory st = seedTypes[_seedType];
        require(_amount >= st.minDeposit, "Below minimum deposit");
        
        // Transfer tokens from player
        gameToken.transferFrom(msg.sender, address(this), _amount);
        
        // Create seed
        seedId = nextSeedId++;
        seeds[seedId] = Seed({
            seedType: _seedType,
            amount: _amount,
            plantTime: block.timestamp,
            expectedHarvestTime: block.timestamp + st.growthDuration,
            isHarvested: false,
            owner: msg.sender
        });
        
        playerSeeds[msg.sender].push(seedId);
        
        emit SeedPlanted(msg.sender, seedId, _seedType, _amount);
    }
    
    function calculateYield(uint256 _seedId) public view returns (uint256 yield) {
        Seed memory seed = seeds[_seedId];
        SeedType memory st = seedTypes[seed.seedType];
        
        // Calculate time-based yield
        uint256 growthTime = block.timestamp - seed.plantTime;
        if (growthTime > st.growthDuration) {
            growthTime = st.growthDuration; // Cap at max growth
        }
        
        // Simple linear yield calculation
        yield = (seed.amount * st.baseYieldBPS * growthTime) / (365 days * 10000);
    }
    
    function harvestSeed(uint256 _seedId) external {
        Seed storage seed = seeds[_seedId];
        require(seed.owner == msg.sender, "Not seed owner");
        require(!seed.isHarvested, "Already harvested");
        require(block.timestamp >= seed.expectedHarvestTime, "Not ready for harvest");
        
        seed.isHarvested = true;
        
        // Calculate total return (principal + yield)
        uint256 yield = calculateYield(_seedId);
        uint256 totalReturn = seed.amount + yield;
        
        // Transfer tokens back to player
        gameToken.transfer(msg.sender, totalReturn);
        
        emit SeedHarvested(msg.sender, _seedId, seed.amount, yield);
    }
    
    function getPlayerSeeds(address _player) external view returns (uint256[] memory) {
        return playerSeeds[_player];
    }
}
```

### 2. Backend Updates - Game Server

#### A. Update GameRoom.ts to sync with blockchain
```typescript
// apps/server/src/rooms/GameRoom.ts
import { ethers } from 'ethers';

export class GameRoom extends Room<GameState> {
  private provider: ethers.Provider;
  private farmingContract: ethers.Contract;
  
  onCreate(options: any) {
    // Initialize blockchain connection
    this.provider = new ethers.JsonRpcProvider(process.env.KATANA_RPC_URL);
    this.farmingContract = new ethers.Contract(
      process.env.FARMING_GAME_ADDRESS,
      FARMING_GAME_ABI,
      this.provider
    );
    
    // Sync blockchain state on room creation
    this.syncBlockchainState();
    
    // Set up blockchain event listeners
    this.farmingContract.on("SeedPlanted", this.onSeedPlanted.bind(this));
    this.farmingContract.on("SeedHarvested", this.onSeedHarvested.bind(this));
  }
  
  private async syncBlockchainState() {
    // Load all seeds for connected players
    for (const [sessionId, player] of this.state.players) {
      const seedIds = await this.farmingContract.getPlayerSeeds(player.walletAddress);
      for (const seedId of seedIds) {
        const seed = await this.farmingContract.seeds(seedId);
        if (!seed.isHarvested) {
          this.addCropToGameState(player, seed, seedId);
        }
      }
    }
  }
  
  private onSeedPlanted(owner: string, seedId: bigint, seedType: bigint, amount: bigint) {
    // Find player by wallet address
    const player = this.findPlayerByWallet(owner);
    if (!player) return;
    
    // Add crop to game state
    const crop = new Crop();
    crop.id = seedId.toString();
    crop.playerId = player.sessionId;
    crop.seedType = Number(seedType);
    crop.amount = amount.toString();
    crop.plantTime = Date.now();
    crop.stage = 'seedling';
    
    this.state.crops.set(crop.id, crop);
  }
}
```

#### B. Add growth timer system
```typescript
// apps/server/src/services/GrowthTimerService.ts
export class GrowthTimerService {
  private growthIntervals = new Map<string, NodeJS.Timer>();
  
  startGrowthTimer(crop: Crop, seedConfig: SeedConfig) {
    const updateGrowth = () => {
      const elapsed = Date.now() - crop.plantTime;
      const progress = Math.min(elapsed / (seedConfig.growthTime * 1000), 1);
      
      // Update crop stage based on progress
      if (progress < 0.33) {
        crop.stage = 'seedling';
      } else if (progress < 0.66) {
        crop.stage = 'growing';
      } else if (progress < 1) {
        crop.stage = 'mature';
      } else {
        crop.stage = 'ready';
        this.stopGrowthTimer(crop.id);
      }
      
      crop.growthProgress = Math.floor(progress * 100);
    };
    
    // Update every 5 seconds
    const timer = setInterval(updateGrowth, 5000);
    this.growthIntervals.set(crop.id, timer);
    
    // Initial update
    updateGrowth();
  }
  
  stopGrowthTimer(cropId: string) {
    const timer = this.growthIntervals.get(cropId);
    if (timer) {
      clearInterval(timer);
      this.growthIntervals.delete(cropId);
    }
  }
}
```

### 3. Frontend Updates

#### A. Create hooks for game loop
```typescript
// apps/web/hooks/useGameLoop.ts
export function useGameLoop() {
  const { address } = useAccount();
  const { data: seedTypes } = useContractRead({
    address: FARMING_GAME_ADDRESS,
    abi: FARMING_GAME_ABI,
    functionName: 'seedTypes',
    args: [1, 2, 3], // Get all seed types
  });
  
  const { writeAsync: plantSeed } = useContractWrite({
    address: FARMING_GAME_ADDRESS,
    abi: FARMING_GAME_ABI,
    functionName: 'plantSeed',
  });
  
  const { writeAsync: harvestSeed } = useContractWrite({
    address: FARMING_GAME_ADDRESS,
    abi: FARMING_GAME_ABI,
    functionName: 'harvestSeed',
  });
  
  const { data: playerSeeds } = useContractRead({
    address: FARMING_GAME_ADDRESS,
    abi: FARMING_GAME_ABI,
    functionName: 'getPlayerSeeds',
    args: [address],
    watch: true, // Auto-refresh
  });
  
  return {
    seedTypes,
    plantSeed,
    harvestSeed,
    playerSeeds,
  };
}
```

#### B. Update CropInfo component with yield display
```typescript
// apps/web/components/CropInfo.tsx
export function CropInfo({ crop }: { crop: Crop }) {
  const { data: yieldAmount } = useContractRead({
    address: FARMING_GAME_ADDRESS,
    abi: FARMING_GAME_ABI,
    functionName: 'calculateYield',
    args: [crop.id],
    watch: true, // Update in real-time
  });
  
  const timeUntilHarvest = crop.expectedHarvestTime - Date.now();
  const canHarvest = timeUntilHarvest <= 0 && !crop.isHarvested;
  
  return (
    <div className="crop-info">
      <h3>{crop.seedType.name}</h3>
      <p>Amount: {formatUnits(crop.amount, 6)} USDC</p>
      <p>Current Yield: {formatUnits(yieldAmount || 0n, 6)} USDC</p>
      <p>Growth: {crop.growthProgress}%</p>
      {canHarvest ? (
        <p className="text-green-500">Ready to harvest!</p>
      ) : (
        <p>Time until harvest: {formatTime(timeUntilHarvest)}</p>
      )}
    </div>
  );
}
```

#### C. Add visual growth stages
```typescript
// apps/web/lib/CropSystem.ts
export class CropSystem {
  private cropSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  
  updateCropVisual(crop: Crop) {
    const sprite = this.cropSprites.get(crop.id);
    if (!sprite) return;
    
    // Update sprite based on growth stage
    switch (crop.stage) {
      case 'seedling':
        sprite.setTexture('crops', 'seedling');
        sprite.setScale(0.5);
        break;
      case 'growing':
        sprite.setTexture('crops', 'growing');
        sprite.setScale(0.75);
        break;
      case 'mature':
        sprite.setTexture('crops', 'mature');
        sprite.setScale(1);
        break;
      case 'ready':
        sprite.setTexture('crops', 'ready');
        sprite.setScale(1);
        // Add glow effect
        sprite.setTint(0xffff00);
        break;
    }
  }
}
```

### 4. Mock Yield Calculation

For MVP, yields are calculated simply:
- **Base APY**: 5-6% depending on seed type
- **Linear accrual**: Yield grows linearly over growth period
- **Time-capped**: No yield beyond growth duration
- **Formula**: `yield = (principal * APY * timeElapsed) / (365 days)`

### 5. Database Schema Updates

```sql
-- Add yield tracking to crops table
ALTER TABLE crops ADD COLUMN expected_yield DECIMAL(20, 6);
ALTER TABLE crops ADD COLUMN growth_stage VARCHAR(20) DEFAULT 'seedling';
ALTER TABLE crops ADD COLUMN growth_progress INTEGER DEFAULT 0;

-- Add player statistics
CREATE TABLE player_stats (
  player_id TEXT PRIMARY KEY,
  total_planted DECIMAL(20, 6) DEFAULT 0,
  total_harvested DECIMAL(20, 6) DEFAULT 0,
  total_yield_earned DECIMAL(20, 6) DEFAULT 0,
  seeds_planted INTEGER DEFAULT 0,
  seeds_harvested INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6. Testing the Complete Loop

1. **Plant Seed**
   - Approve token spend
   - Call plantSeed with type and amount
   - Verify seed appears in game world
   - Check growth timer starts

2. **Monitor Growth**
   - Observe visual changes (seedling → growing → mature → ready)
   - Watch yield counter increase
   - Verify growth progress percentage

3. **Harvest**
   - Wait for growth duration
   - Click harvest when ready
   - Receive principal + yield
   - Verify crop removed from world

4. **Reinvest**
   - Use profits to plant more seeds
   - Track total portfolio value

## Benefits of This Approach

1. **Immediate Playability**: Full game loop without external dependencies
2. **Easy Testing**: Mock yields allow rapid iteration
3. **Upgradeable**: Can swap mock yield for real DeFi later
4. **Educational**: Players understand DeFi concepts through gameplay
5. **Low Risk**: No real protocol integration risks during development

## Next Steps After Implementation

1. Add more seed types with different risk/reward profiles
2. Implement weather events that affect yield
3. Add multiplayer competitions (highest yield, most seeds, etc.)
4. Integrate real DeFi protocols (Morpho, Aave, etc.)
5. Add NFT rewards for achievements