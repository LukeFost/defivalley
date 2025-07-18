# Migrate to Katana Network as Primary Chain

## Overview
Simplify DeFi Valley by focusing on a single blockchain network - Katana. This will remove the complexity of cross-chain interactions and allow faster development of core game mechanics.

## Current State
- Multiple networks configured: Saga Chainlet, Arbitrum Sepolia, Base, Flow
- Complex cross-chain architecture using Axelar GMP
- Contracts deployed on Saga and Arbitrum requiring bridge communication
- Significant overhead for cross-chain gas and message passing

## Proposed Changes

### 1. Remove Multi-Chain Infrastructure
- [ ] Remove Axelar GMP dependencies from smart contracts
- [ ] Remove cross-chain message passing logic
- [ ] Remove unused network configurations (Saga, Arbitrum, Base, Flow)
- [ ] Clean up network switching UI components

### 2. Katana Network Configuration
**Network Details:**
- Chain ID: `747474`
- RPC URL: `https://rpc-katana.t.conduit.xyz/MekJWT3Kd9YJyktBPJxVMk75TaFG7pdvq`
- Explorer: `https://katana.t.conduit.xyz`
- Native Currency: ETH (18 decimals)

**Token Addresses on Katana:**
- vbUSDC (Bridged USDC): `0x203A662b0BD271A6ed5a60EdFbd04bFce608FD36`
- vbETH (Bridged ETH): `0xEE7D8BCFb72bC1880D0Cf19822eB0A2e6577aB62`
- WETH: `0x17B8Ee96E3bcB3b04b3e8334de4524520C51caB4`
- Morpho Protocol: `0xC263190b99ceb7e2b7409059D24CB573e3bB9021`

### 3. Smart Contract Migration

#### A. Merge GameController and DeFiVault
Create a single `FarmingGame.sol` contract that combines:
- Player registration and management
- Seed planting with direct token deposits
- Yield calculation and distribution
- Harvest mechanics with direct token transfers

#### B. Integration with Morpho Protocol
```solidity
interface IMorpho {
    function deposit(address vault, uint256 amount) external;
    function withdraw(address vault, uint256 amount) external;
    function getUserBalance(address user, address vault) external view returns (uint256);
}

contract FarmingGame {
    IMorpho public morpho = IMorpho(0xC263190b99ceb7e2b7409059D24CB573e3bB9021);
    IERC20 public vbUSDC = IERC20(0x203A662b0BD271A6ed5a60EdFbd04bFce608FD36);
    
    function plantSeed(uint256 seedType, uint256 amount) external {
        // Transfer vbUSDC from player
        vbUSDC.transferFrom(msg.sender, address(this), amount);
        
        // Deposit into Morpho for yield
        vbUSDC.approve(address(morpho), amount);
        morpho.deposit(MORPHO_VAULT_ADDRESS, amount);
        
        // Create seed in game state
        // ...
    }
}
```

### 4. Frontend Updates

#### A. Update wagmi.ts configuration
```typescript
export const katanaChain = defineChain({
  id: 747474,
  name: 'Katana',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['https://rpc-katana.t.conduit.xyz/MekJWT3Kd9YJyktBPJxVMk75TaFG7pdvq'] },
  },
  blockExplorers: {
    default: { name: 'Katana Explorer', url: 'https://katana.t.conduit.xyz' },
  },
});

export const config = createConfig({
  chains: [katanaChain], // Only Katana
  // ...
});
```

#### B. Update BlockchainService.ts
- Remove cross-chain transaction logic
- Simplify to single-chain operations
- Update contract addresses for Katana deployment

#### C. Update UI Components
- Remove NetworkSelector component or limit to Katana only
- Update TransactionTracker to remove cross-chain stages
- Simplify PlantSeedDialog - no gas token selection needed

### 5. Environment Variables
Update `.env` files:
```bash
# Remove old network configs
# Add Katana-specific
NEXT_PUBLIC_KATANA_RPC_URL=https://rpc-katana.t.conduit.xyz/MekJWT3Kd9YJyktBPJxVMk75TaFG7pdvq
NEXT_PUBLIC_FARMING_GAME_ADDRESS=0x... # New unified contract
NEXT_PUBLIC_MORPHO_ADDRESS=0xC263190b99ceb7e2b7409059D24CB573e3bB9021
NEXT_PUBLIC_VBUSDC_ADDRESS=0x203A662b0BD271A6ed5a60EdFbd04bFce608FD36
```

### 6. Benefits
- **Simpler Architecture**: No cross-chain complexity
- **Faster Transactions**: No bridge waiting times
- **Lower Costs**: No cross-chain gas fees
- **Better UX**: Single network, no switching required
- **Morpho Integration**: Direct access to established DeFi yield

### 7. Migration Steps
1. Deploy new unified contract to Katana
2. Update frontend configuration
3. Test complete flow on Katana
4. Remove old multi-chain code
5. Update documentation

## Testing Requirements
- [ ] Wallet connection to Katana network
- [ ] vbUSDC approval and deposits
- [ ] Seed planting with Morpho integration
- [ ] Yield accrual tracking
- [ ] Harvest with yield distribution
- [ ] Frontend displays correct balances

## Documentation Updates
- [ ] Update README with Katana setup
- [ ] Remove Axelar/cross-chain references
- [ ] Add Morpho integration guide
- [ ] Update architecture diagrams