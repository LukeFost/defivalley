# Squid Router Auto-Bridge Integration

This integration adds cross-chain bridging capabilities to DeFi Valley using the Squid Router SDK, enabling users to bridge assets from 70+ blockchains directly into the game.

## Features

### 🌉 Auto-Bridge Functionality
- **70+ Supported Chains**: Ethereum, Polygon, BSC, Avalanche, Arbitrum, Optimism, Base, Gnosis, and more
- **1000+ Supported Assets**: ETH, USDC, USDT, DAI, WBTC, and thousands of other tokens
- **One-Click Experience**: Bridge + seed planting in a single transaction flow
- **Real-Time Quotes**: Live pricing and routing with competitive fees
- **Smart Route Selection**: Automatically finds the best path for each bridge

### 🎮 Game Integration
- **Enhanced Plant Seed Dialog**: Toggle auto-bridge mode for cross-chain deposits
- **Chain & Asset Selector**: User-friendly interface for selecting source chains and tokens
- **Bridge Quote Display**: Real-time fee estimation and transfer time
- **Progress Tracking**: Monitor bridge and planting status in real-time

## Implementation Details

### Core Components

#### `useSquidRouter()` Hook
```typescript
const { 
  supportedChains, 
  getQuote, 
  executeRoute, 
  getTokensForChain 
} = useSquidRouter();
```

- Initializes Squid SDK
- Fetches supported chains and tokens
- Provides quote and execution functions
- Handles error states and loading

#### `ChainTokenSelector` Component
- Grid-based chain selection with popular chains highlighted
- Token search and filtering
- Popular token quick-selection buttons
- Real-time validation and feedback

#### Enhanced `useCrossChainTx()` Hook
```typescript
const result = await plantSeed({
  seedType: 1,
  amount: "100",
  enableAutoBridge: true,
  fromChain: 1, // Ethereum
  fromToken: "0xA0b86a33E...", // USDC
});
```

### Bridge Flow

1. **User Selection**: Choose source chain and token
2. **Quote Fetching**: Get real-time bridge quote
3. **Bridge Execution**: Execute cross-chain transfer
4. **Asset Arrival**: Wait for assets on target chain
5. **Seed Planting**: Automatically plant seed with bridged assets

## Supported Chains & Assets

### Popular Chains
- **Ethereum** (ETH) - Layer 1 with highest liquidity
- **Polygon** (MATIC) - Low fees, fast transactions
- **BSC** (BNB) - Binance Smart Chain ecosystem
- **Avalanche** (AVAX) - High throughput, low latency
- **Arbitrum** (ARB) - Ethereum Layer 2 scaling
- **Optimism** (OP) - Optimistic rollup scaling
- **Base** (ETH) - Coinbase Layer 2 network
- **Gnosis** (xDAI) - Stable token network

### Popular Assets
- **ETH** - Native Ethereum and wrapped versions
- **USDC** - Circle's USD Coin across all chains
- **USDT** - Tether USD across multiple chains
- **DAI** - MakerDAO's decentralized stablecoin
- **WBTC** - Wrapped Bitcoin for DeFi
- **And 1000+ more tokens**

## Usage Examples

### Basic Bridge Quote
```typescript
const quote = await getQuote({
  fromChain: 1, // Ethereum
  toChain: 2751669528484000, // Saga Chainlet
  fromToken: "0xA0b86a33E...", // USDC on Ethereum
  toToken: "0x75faf114e...", // USDC on Saga
  fromAmount: "100000000", // 100 USDC (6 decimals)
  fromAddress: userAddress,
  toAddress: userAddress,
});
```

### Auto-Bridge Seed Planting
```typescript
// In PlantSeedDialog component
<ChainTokenSelector 
  onSelectionChange={setBridgeSelection}
/>

{bridgeQuote && (
  <div className="bridge-quote">
    Route: {chainName} → Saga Chainlet
    Fee: {bridgeQuote.feeCosts[0].amount} {bridgeQuote.feeCosts[0].token.symbol}
    Time: ~{Math.ceil(bridgeQuote.estimatedRouteDuration / 60)} minutes
  </div>
)}
```

## Demo & Testing

Visit `/squid-demo` to see the integration in action:
- Live chain and token selection
- Real-time quote fetching
- Bridge fee estimation
- Supported chains showcase

## Benefits

### For Players
- ✅ Use any token from any supported chain
- ✅ No manual bridging required
- ✅ One-click seed planting experience
- ✅ Competitive bridge fees
- ✅ Fast 2-5 minute transfers

### For DeFi Valley
- 🚀 Access to multi-chain liquidity ($100B+ TVL)
- 🚀 Lower barrier to entry for new users
- 🚀 Increased potential TVL from all chains
- 🚀 Better user acquisition across ecosystems
- 🚀 Future-proof cross-chain architecture

## Configuration

### Environment Variables
```bash
# Squid Router configuration (optional)
NEXT_PUBLIC_SQUID_INTEGRATOR_ID=defivalley-v1
NEXT_PUBLIC_SQUID_BASE_URL=https://v2.api.squidrouter.com
```

### Supported Networks Config
```typescript
const TARGET_CHAINS = {
  SAGA: 2751669528484000, // Saga Chainlet (gaming)
  ARBITRUM: 421614, // Arbitrum Sepolia (DeFi)
};

const TARGET_TOKENS = {
  USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
};
```

## Technical Notes

- **SDK Version**: @0xsquid/sdk v2.10.0
- **Gas Optimization**: Routes optimized for lowest cost
- **Error Handling**: Comprehensive error states and retries
- **Type Safety**: Full TypeScript support
- **Security**: Non-custodial, user controls private keys
- **Monitoring**: Real-time transaction tracking

## Future Enhancements

1. **Bridge History**: Track past cross-chain transactions
2. **Gas Optimization**: Dynamic gas price optimization
3. **Batch Operations**: Bridge multiple assets simultaneously
4. **Custom Routes**: Allow advanced users to customize routes
5. **Yield Farming**: Bridge directly into yield positions
6. **Cross-Chain Governance**: Vote across multiple chains

## Support

For issues or questions about the Squid Router integration:
- Check the [Squid Router Documentation](https://docs.squidrouter.com/)
- Review component implementations in `/components`
- Test functionality using the demo at `/squid-demo`
- Monitor network status and supported chains in real-time