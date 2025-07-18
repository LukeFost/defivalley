# Implement Game Loop Using Existing Katana Infrastructure

## Overview
Leverage the existing Morpho and SushiSwap integrations on Katana to create a complete farming game loop. Instead of mock yields, use real DeFi yields from Morpho Protocol while keeping game mechanics (planting, growing, harvesting) off-chain for better UX.

## Current Assets on Katana
- **Morpho Protocol**: Already integrated for vbUSDC lending (earning ~3-5% APY)
- **Bank Building**: Katana Cat allows deposits/withdrawals
- **Marketplace**: Token swaps via SushiSwap
- **Hooks**: `useMorphoDeposit`, `useMorphoPosition` for yield tracking

## Proposed Game Loop Architecture

### 1. Hybrid On-Chain/Off-Chain Model
- **On-Chain (Katana)**: Token deposits into Morpho, yield generation, withdrawals
- **Off-Chain (SQLite/Colyseus)**: Crop planting, growth timers, visual states
- **Bridge**: Link Morpho positions to in-game crops

### 2. Player Flow

```
1. Connect wallet to Katana network
2. Visit Marketplace → Swap for vbUSDC if needed
3. Plant seed → Triggers Morpho deposit
4. Crop grows based on Morpho position
5. Harvest → Withdraws principal + yield from Morpho
```

### 3. Implementation Details

#### A. Extend Database Schema
```sql
-- Link crops to Morpho positions
ALTER TABLE crops ADD COLUMN morpho_vault_address TEXT;
ALTER TABLE crops ADD COLUMN morpho_position_id TEXT;
ALTER TABLE crops ADD COLUMN on_chain_amount DECIMAL(20, 6);
ALTER TABLE crops ADD COLUMN last_morpho_sync TIMESTAMP;

-- Track player's Katana activity
ALTER TABLE players ADD COLUMN katana_address TEXT;
ALTER TABLE players ADD COLUMN total_morpho_deposits DECIMAL(20, 6) DEFAULT 0;
ALTER TABLE players ADD COLUMN total_morpho_yield DECIMAL(20, 6) DEFAULT 0;
```

#### B. Update GameRoom to Track Morpho Positions
```typescript
// apps/server/src/rooms/GameRoom.ts
import { ethers } from 'ethers';
import { MORPHO_ABI } from '../abi/morpho';

export class GameRoom extends Room<GameState> {
  private katanaProvider: ethers.Provider;
  private morphoContract: ethers.Contract;
  private morphoSyncInterval: NodeJS.Timer;
  
  onCreate(options: any) {
    // Initialize Katana connection
    this.katanaProvider = new ethers.JsonRpcProvider(
      'https://rpc-katana.t.conduit.xyz/MekJWT3Kd9YJyktBPJxVMk75TaFG7pdvq'
    );
    
    this.morphoContract = new ethers.Contract(
      '0xC263190b99ceb7e2b7409059D24CB573e3bB9021',
      MORPHO_ABI,
      this.katanaProvider
    );
    
    // Sync Morpho positions every 30 seconds
    this.morphoSyncInterval = setInterval(() => {
      this.syncMorphoPositions();
    }, 30000);
  }
  
  private async syncMorphoPositions() {
    // For each crop linked to Morpho
    this.state.crops.forEach(async (crop) => {
      if (!crop.morphoVaultAddress) return;
      
      const player = this.state.players.get(crop.playerId);
      if (!player?.walletAddress) return;
      
      try {
        // Get current position from Morpho
        const position = await this.morphoContract.position(
          crop.morphoVaultAddress,
          player.walletAddress
        );
        
        // Calculate yield since planting
        const currentValue = Number(position.shares) * Number(position.exchangeRate) / 1e18;
        const yieldEarned = currentValue - crop.onChainAmount;
        
        // Update crop with real yield
        crop.currentYield = yieldEarned;
        crop.totalValue = currentValue;
        
        // Update growth visual based on time (not yield)
        const elapsed = Date.now() - crop.plantedAt;
        const progress = Math.min(elapsed / crop.growthDuration, 1);
        crop.growthProgress = Math.floor(progress * 100);
        
        // Update stage
        if (progress >= 1 && yieldEarned > 0) {
          crop.stage = 'ready';
        }
      } catch (error) {
        console.error('Error syncing Morpho position:', error);
      }
    });
  }
  
  private async handlePlantSeedWithMorpho(client: Client, message: {
    x: number;
    y: number;
    seedType: number;
    amount: number;
    morphoTxHash: string;
    vaultAddress: string;
  }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    try {
      // Verify the Morpho deposit transaction
      const tx = await this.katanaProvider.getTransaction(message.morphoTxHash);
      if (!tx || tx.to?.toLowerCase() !== this.morphoContract.address.toLowerCase()) {
        throw new Error('Invalid Morpho transaction');
      }
      
      // Create crop linked to Morpho position
      const cropId = generateId();
      const seedType = await databaseService.getSeedType(message.seedType);
      
      const crop = new Crop();
      crop.id = cropId;
      crop.playerId = player.id;
      crop.x = message.x;
      crop.y = message.y;
      crop.seedType = message.seedType;
      crop.amount = message.amount;
      crop.onChainAmount = message.amount; // Track initial deposit
      crop.morphoVaultAddress = message.vaultAddress;
      crop.plantedAt = Date.now();
      crop.growthDuration = seedType.growth_duration * 1000;
      crop.readyAt = Date.now() + crop.growthDuration;
      crop.stage = 'seedling';
      
      // Save to database with Morpho link
      await databaseService.createCrop({
        ...crop,
        morpho_vault_address: message.vaultAddress,
        on_chain_amount: message.amount
      });
      
      // Add to game state
      this.state.crops.set(cropId, crop);
      
      client.send("plantSuccess", { cropId });
      
    } catch (error) {
      client.send("error", { message: error.message });
    }
  }
}
```

#### C. Frontend Integration with Morpho
```typescript
// apps/web/hooks/useGameWithMorpho.ts
export function useGameWithMorpho() {
  const { address } = useAccount();
  const room = useGameRoom();
  const { deposit, isLoading: isDepositing } = useMorphoDeposit();
  const { withdraw, isLoading: isWithdrawing } = useMorphoWithdraw();
  
  const plantSeedWithMorpho = async (params: {
    x: number;
    y: number;
    seedType: number;
    amount: string;
    vaultAddress: string;
  }) => {
    try {
      // 1. Deposit to Morpho
      const tx = await deposit({
        vaultAddress: params.vaultAddress,
        amount: params.amount
      });
      
      // 2. Wait for confirmation
      await tx.wait();
      
      // 3. Create crop in game
      room.send("plantSeedWithMorpho", {
        ...params,
        morphoTxHash: tx.hash
      });
      
      return { success: true, txHash: tx.hash };
    } catch (error) {
      console.error('Plant seed error:', error);
      return { success: false, error };
    }
  };
  
  const harvestCropWithMorpho = async (cropId: string) => {
    try {
      // Get crop data
      const crop = room.state.crops.get(cropId);
      if (!crop) throw new Error('Crop not found');
      
      // 1. Withdraw from Morpho (principal + yield)
      const tx = await withdraw({
        vaultAddress: crop.morphoVaultAddress,
        amount: crop.totalValue // This includes yield
      });
      
      // 2. Wait for confirmation
      await tx.wait();
      
      // 3. Remove crop from game
      room.send("harvestCrop", {
        cropId,
        morphoTxHash: tx.hash
      });
      
      return { success: true, txHash: tx.hash };
    } catch (error) {
      console.error('Harvest error:', error);
      return { success: false, error };
    }
  };
  
  return {
    plantSeedWithMorpho,
    harvestCropWithMorpho,
    isLoading: isDepositing || isWithdrawing
  };
}
```

#### D. Update CropContextMenu for Morpho Integration
```typescript
// apps/web/components/CropContextMenu.tsx
export function CropContextMenu({ crop, onClose }: Props) {
  const { harvestCropWithMorpho, isLoading } = useGameWithMorpho();
  const [isHarvesting, setIsHarvesting] = useState(false);
  
  const handleHarvest = async () => {
    if (crop.stage !== 'ready') return;
    
    setIsHarvesting(true);
    const result = await harvestCropWithMorpho(crop.id);
    
    if (result.success) {
      toast.success(
        `Harvested ${crop.totalValue.toFixed(2)} vbUSDC! ` +
        `(Yield: ${crop.currentYield.toFixed(2)})`
      );
      onClose();
    } else {
      toast.error('Harvest failed');
    }
    setIsHarvesting(false);
  };
  
  return (
    <ContextMenu>
      <ContextMenuItem disabled={crop.stage !== 'ready' || isHarvesting}>
        <Wheat className="mr-2 h-4 w-4" />
        {isHarvesting ? 'Harvesting...' : 'Harvest Crop'}
        {crop.currentYield > 0 && (
          <span className="ml-2 text-green-500">
            +{crop.currentYield.toFixed(2)} vbUSDC yield
          </span>
        )}
      </ContextMenuItem>
    </ContextMenu>
  );
}
```

### 4. Benefits of This Approach

1. **Real DeFi Yield**: Uses actual Morpho Protocol yields on Katana
2. **Gas Efficient**: Only deposit/withdraw transactions cost gas
3. **Familiar UX**: Leverages existing Bank/Marketplace buildings
4. **Transparent**: Players can verify positions on Katana explorer
5. **Composable**: Can add more Katana DeFi protocols later

### 5. Visual Flow

```
Player Journey:
1. Enter game → Connect wallet to Katana
2. Visit Marketplace → Swap ETH for vbUSDC
3. Click empty plot → Choose seed type
4. Confirm Morpho deposit → Crop appears
5. Watch crop grow → See real yield accumulate
6. Harvest when ready → Withdraw from Morpho
7. Reinvest profits → Plant more seeds
```

### 6. Next Steps

1. **MVP**: Basic plant/harvest with vbETH vault only
2. **Add vault selection**: Let players choose collateral type
3. **Yield bonuses**: Game events that boost Morpho yields
4. **Leaderboard**: Track highest yields, most crops
5. **NFT rewards**: Mint achievement NFTs on Katana

This approach maximizes the existing Katana infrastructure while adding engaging game mechanics on top!