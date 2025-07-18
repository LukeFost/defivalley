# Implement Complete Game Loop (Off-Chain with SQLite)

## Overview
Create a fully functional game loop using the existing Colyseus game server and SQLite database. This approach eliminates smart contract complexity while maintaining all game mechanics. Smart contracts will only be used for token deposits/withdrawals when integrating with real DeFi protocols.

## Architecture Benefits
- **No gas fees** for game actions (planting, growing, harvesting)
- **Instant transactions** - no blockchain wait times
- **Easy iteration** - update game mechanics without redeploying contracts
- **Full game state control** - complex mechanics without Solidity limitations
- **Lower barrier to entry** - players can try the game before connecting wallets

## Game Loop Flow
1. **Deposit** → Player deposits tokens (or uses mock balance for testing)
2. **Plant** → Server creates crop in SQLite and syncs to game state
3. **Growth** → Server-side timers update crop growth
4. **Yield** → Server calculates yield based on time and rates
5. **Harvest** → Player harvests, server updates balances
6. **Withdraw** → Player can withdraw earnings (when DeFi integrated)

## Implementation Details

### 1. Database Schema Updates

```sql
-- Enhanced players table with economy
ALTER TABLE players ADD COLUMN balance DECIMAL(20, 6) DEFAULT 1000.0; -- Start with 1000 mock USDC
ALTER TABLE players ADD COLUMN total_deposited DECIMAL(20, 6) DEFAULT 0;
ALTER TABLE players ADD COLUMN total_withdrawn DECIMAL(20, 6) DEFAULT 0;
ALTER TABLE players ADD COLUMN lifetime_yield DECIMAL(20, 6) DEFAULT 0;

-- Enhanced crops table
ALTER TABLE crops ADD COLUMN seed_type INTEGER NOT NULL DEFAULT 1;
ALTER TABLE crops ADD COLUMN amount DECIMAL(20, 6) NOT NULL;
ALTER TABLE crops ADD COLUMN planted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE crops ADD COLUMN growth_duration INTEGER NOT NULL; -- seconds
ALTER TABLE crops ADD COLUMN ready_at TIMESTAMP NOT NULL;
ALTER TABLE crops ADD COLUMN base_yield_rate DECIMAL(5, 2) NOT NULL; -- percentage
ALTER TABLE crops ADD COLUMN current_yield DECIMAL(20, 6) DEFAULT 0;
ALTER TABLE crops ADD COLUMN harvested_amount DECIMAL(20, 6);

-- Seed types configuration
CREATE TABLE seed_types (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  min_amount DECIMAL(20, 6) NOT NULL,
  growth_duration INTEGER NOT NULL, -- seconds
  base_yield_rate DECIMAL(5, 2) NOT NULL, -- annual percentage
  sprite_name TEXT NOT NULL,
  description TEXT
);

-- Insert default seed types
INSERT INTO seed_types (id, name, min_amount, growth_duration, base_yield_rate, sprite_name, description) VALUES
(1, 'USDC Sprout', 10, 86400, 5.0, 'seed_basic', '24 hour growth, 5% APY'),
(2, 'Premium Tree', 100, 172800, 5.5, 'seed_premium', '48 hour growth, 5.5% APY'),
(3, 'Whale Forest', 1000, 259200, 6.0, 'seed_whale', '72 hour growth, 6% APY');

-- Transaction history
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'deposit', 'withdraw', 'plant', 'harvest'
  amount DECIMAL(20, 6) NOT NULL,
  balance_after DECIMAL(20, 6) NOT NULL,
  metadata TEXT, -- JSON for additional data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id)
);
```

### 2. Game Server Updates

#### A. Enhanced GameRoom with Economy
```typescript
// apps/server/src/rooms/GameRoom.ts
export class GameRoom extends Room<GameState> {
  private yieldCalculator: YieldCalculatorService;
  private economyService: EconomyService;
  
  onCreate(options: any) {
    this.setState(new GameState());
    this.yieldCalculator = new YieldCalculatorService();
    this.economyService = new EconomyService(databaseService);
    
    // Start yield update timer (every 10 seconds)
    this.setSimulationInterval(() => this.updateYields(), 10000);
    
    // Message handlers
    this.onMessage("plantSeed", this.handlePlantSeed.bind(this));
    this.onMessage("harvestCrop", this.handleHarvestCrop.bind(this));
    this.onMessage("getBalance", this.handleGetBalance.bind(this));
  }
  
  private async handlePlantSeed(client: Client, message: PlantSeedMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    try {
      // Validate seed type
      const seedType = await databaseService.getSeedType(message.seedType);
      if (!seedType) throw new Error("Invalid seed type");
      
      // Check balance
      const balance = await this.economyService.getBalance(player.id);
      if (balance < message.amount) throw new Error("Insufficient balance");
      if (message.amount < seedType.min_amount) throw new Error("Below minimum amount");
      
      // Deduct from balance
      await this.economyService.deductBalance(player.id, message.amount, 'plant');
      
      // Create crop
      const cropId = generateId();
      const crop = new Crop();
      crop.id = cropId;
      crop.playerId = player.id;
      crop.x = message.x;
      crop.y = message.y;
      crop.seedType = message.seedType;
      crop.amount = message.amount;
      crop.plantedAt = Date.now();
      crop.growthDuration = seedType.growth_duration * 1000; // Convert to ms
      crop.readyAt = Date.now() + crop.growthDuration;
      crop.baseYieldRate = seedType.base_yield_rate;
      crop.stage = 'seedling';
      crop.growthProgress = 0;
      
      // Save to database
      await databaseService.createCrop({
        id: cropId,
        world_id: this.worldOwnerId,
        player_id: player.id,
        x: message.x,
        y: message.y,
        seed_type: message.seedType,
        amount: message.amount,
        growth_duration: seedType.growth_duration,
        ready_at: new Date(crop.readyAt),
        base_yield_rate: seedType.base_yield_rate
      });
      
      // Add to game state
      this.state.crops.set(cropId, crop);
      
      // Notify player
      client.send("plantSuccess", {
        cropId,
        newBalance: balance - message.amount
      });
      
    } catch (error) {
      client.send("error", { message: error.message });
    }
  }
  
  private async handleHarvestCrop(client: Client, message: HarvestCropMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    const crop = this.state.crops.get(message.cropId);
    if (!crop || crop.playerId !== player.id) {
      return client.send("error", { message: "Invalid crop" });
    }
    
    if (crop.harvestedAt) {
      return client.send("error", { message: "Already harvested" });
    }
    
    if (Date.now() < crop.readyAt) {
      return client.send("error", { message: "Not ready for harvest" });
    }
    
    try {
      // Calculate final yield
      const yieldAmount = this.yieldCalculator.calculateFinalYield(crop);
      const totalAmount = crop.amount + yieldAmount;
      
      // Update balance
      await this.economyService.addBalance(player.id, totalAmount, 'harvest');
      
      // Mark as harvested in database
      await databaseService.harvestCrop(crop.id, totalAmount);
      
      // Update player stats
      await databaseService.updatePlayerStats(player.id, {
        lifetime_yield: yieldAmount
      });
      
      // Remove from game state
      this.state.crops.delete(crop.id);
      
      // Notify player
      const newBalance = await this.economyService.getBalance(player.id);
      client.send("harvestSuccess", {
        cropId: crop.id,
        principal: crop.amount,
        yield: yieldAmount,
        total: totalAmount,
        newBalance
      });
      
    } catch (error) {
      client.send("error", { message: error.message });
    }
  }
  
  private updateYields() {
    // Update all growing crops
    this.state.crops.forEach(crop => {
      if (!crop.harvestedAt) {
        const progress = this.yieldCalculator.calculateProgress(crop);
        crop.growthProgress = Math.floor(progress * 100);
        
        // Update growth stage
        if (progress < 0.33) {
          crop.stage = 'seedling';
        } else if (progress < 0.66) {
          crop.stage = 'growing';
        } else if (progress < 1) {
          crop.stage = 'mature';
        } else {
          crop.stage = 'ready';
        }
        
        // Calculate current yield
        crop.currentYield = this.yieldCalculator.calculateCurrentYield(crop);
      }
    });
  }
}
```

#### B. Yield Calculator Service
```typescript
// apps/server/src/services/YieldCalculatorService.ts
export class YieldCalculatorService {
  calculateProgress(crop: Crop): number {
    const elapsed = Date.now() - crop.plantedAt;
    return Math.min(elapsed / crop.growthDuration, 1);
  }
  
  calculateCurrentYield(crop: Crop): number {
    const progress = this.calculateProgress(crop);
    const timeInYears = (crop.growthDuration * progress) / (365 * 24 * 60 * 60 * 1000);
    return crop.amount * (crop.baseYieldRate / 100) * timeInYears;
  }
  
  calculateFinalYield(crop: Crop): number {
    // Cap at growth duration even if harvested late
    const timeInYears = crop.growthDuration / (365 * 24 * 60 * 60 * 1000);
    return crop.amount * (crop.baseYieldRate / 100) * timeInYears;
  }
}
```

#### C. Economy Service
```typescript
// apps/server/src/services/EconomyService.ts
export class EconomyService {
  constructor(private db: DatabaseService) {}
  
  async getBalance(playerId: string): Promise<number> {
    const player = await this.db.getPlayer(playerId);
    return player?.balance || 0;
  }
  
  async addBalance(playerId: string, amount: number, type: string): Promise<void> {
    await this.db.transaction(async () => {
      const player = await this.db.getPlayer(playerId);
      const newBalance = (player.balance || 0) + amount;
      
      await this.db.updatePlayer(playerId, { balance: newBalance });
      await this.db.createTransaction({
        player_id: playerId,
        type,
        amount,
        balance_after: newBalance,
        metadata: JSON.stringify({ timestamp: Date.now() })
      });
    });
  }
  
  async deductBalance(playerId: string, amount: number, type: string): Promise<void> {
    await this.addBalance(playerId, -amount, type);
  }
}
```

### 3. Frontend Updates

#### A. Update Game UI for Economy
```typescript
// apps/web/components/GameUI.tsx
export function GameUI() {
  const [balance, setBalance] = useState<number>(0);
  const [selectedSeedType, setSelectedSeedType] = useState(1);
  const room = useGameRoom();
  
  useEffect(() => {
    if (!room) return;
    
    // Request balance on join
    room.send("getBalance");
    
    // Listen for balance updates
    room.onMessage("balanceUpdate", (data) => {
      setBalance(data.balance);
    });
    
    room.onMessage("plantSuccess", (data) => {
      setBalance(data.newBalance);
      toast.success("Seed planted successfully!");
    });
    
    room.onMessage("harvestSuccess", (data) => {
      setBalance(data.newBalance);
      toast.success(`Harvested ${data.total} USDC (${data.yield} yield)!`);
    });
  }, [room]);
  
  return (
    <div className="game-ui">
      <div className="balance-display">
        <span>Balance: {balance.toFixed(2)} USDC</span>
      </div>
      
      <SeedSelector 
        selectedType={selectedSeedType}
        onSelect={setSelectedSeedType}
        balance={balance}
      />
    </div>
  );
}
```

#### B. Update CropInfo to show yield
```typescript
// apps/web/components/CropInfo.tsx
export function CropInfo({ crop }: { crop: Crop }) {
  const timeUntilReady = crop.readyAt - Date.now();
  const isReady = timeUntilReady <= 0;
  
  return (
    <div className="crop-info">
      <h3>{SEED_TYPES[crop.seedType].name}</h3>
      <p>Amount: {crop.amount} USDC</p>
      <p>Current Yield: +{crop.currentYield.toFixed(2)} USDC</p>
      <p>Growth: {crop.growthProgress}%</p>
      
      {isReady ? (
        <div className="text-green-500">
          <p>Ready to harvest!</p>
          <p>Total return: {(crop.amount + crop.currentYield).toFixed(2)} USDC</p>
        </div>
      ) : (
        <p>Ready in: {formatDuration(timeUntilReady)}</p>
      )}
    </div>
  );
}
```

### 4. Migration Path to Real DeFi

When ready to integrate real tokens:

1. **Add Deposit/Withdraw UI**
   ```typescript
   // Only these functions interact with blockchain
   async function deposit(amount: number) {
     // Transfer real tokens to game contract
     const tx = await usdcContract.transfer(GAME_TREASURY, amount);
     await tx.wait();
     
     // Update game balance
     room.send("deposit", { amount, txHash: tx.hash });
   }
   
   async function withdraw(amount: number) {
     // Request withdrawal from game
     room.send("withdraw", { amount });
     
     // Server validates and triggers on-chain transfer
   }
   ```

2. **Keep game logic off-chain**
   - All planting, growing, harvesting stays in SQLite
   - Only deposits/withdrawals touch blockchain
   - Can integrate Morpho yields as multiplier to base yields

### 5. Benefits of This Approach

1. **Zero Gas Gameplay** - Plant, grow, harvest without transactions
2. **Instant Actions** - No waiting for blockchain confirmations  
3. **Rich Game Mechanics** - Weather, seasons, events without gas costs
4. **Easy Testing** - Full game loop without wallets
5. **Smooth Onboarding** - Try before you buy with mock balance
6. **Real Yield Ready** - Can add DeFi integration without changing game logic

### 6. Testing Plan

1. **New Player Flow**
   - Join world → Receive 1000 mock USDC
   - Plant first seed → See balance decrease
   - Watch crop grow → See yield accumulate
   - Harvest → Receive principal + yield

2. **Economy Balance**
   - Verify yields match expected APY
   - Test different seed types
   - Ensure balances persist across sessions

3. **Multiplayer**
   - Multiple players in same world
   - Each has independent balance
   - Can see each other's crops growing