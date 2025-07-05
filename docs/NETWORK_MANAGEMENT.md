# Network Management System

A clean, scalable system for managing blockchain networks in DeFi Valley.

## Overview

The network management system provides:
- ✅ **Type-safe network definitions** with validation
- ✅ **Environment-based network selection** (dev/prod)
- ✅ **Category-based filtering** (gaming/defi/experimental)
- ✅ **Dynamic transport configuration** with gas settings
- ✅ **Wallet integration** for adding networks to MetaMask
- ✅ **Clean component APIs** for network switching

## Quick Start

### Adding a New Network

1. **Define the network** in `app/lib/networks.ts`:

```typescript
export const myNewNetwork: NetworkConfig = {
  id: 12345,
  name: 'My Network',
  network: 'my-network',
  nativeCurrency: {
    decimals: 18,
    name: 'MyToken',
    symbol: 'MTK',
  },
  rpcUrls: {
    default: { http: ['https://rpc.mynetwork.com'] },
    public: { http: ['https://rpc.mynetwork.com'] },
  },
  blockExplorers: {
    default: { 
      name: 'My Explorer', 
      url: 'https://explorer.mynetwork.com' 
    },
  },
  category: 'gaming', // or 'defi', 'development', 'experimental'
  isTestnet: false,
  features: {
    crossChain: true,
    gasless: false,
    fastFinality: true,
  },
  contracts: {
    gameController: '0x...',
    defiVault: '0x...',
  }
}
```

2. **Add to collections** in `networks.ts`:

```typescript
export const PRODUCTION_NETWORKS = [
  // existing networks...
  myNewNetwork,
] as const
```

3. **Export from wagmi.ts**:

```typescript
export { 
  sagaChainlet,
  flowMainnet,
  myNewNetwork, // Add here
  // ...
} from './lib/networks'
```

### Using Networks in Components

```typescript
import { myNewNetwork } from '@/app/wagmi'
import { useSwitchChain } from 'wagmi'

function MyComponent() {
  const { switchChain } = useSwitchChain()
  
  const switchToMyNetwork = () => {
    switchChain({ chainId: myNewNetwork.id })
  }
  
  return (
    <button onClick={switchToMyNetwork}>
      Switch to {myNewNetwork.name}
    </button>
  )
}
```

## Network Categories

### Gaming Networks
- **Purpose**: Low latency, gaming-optimized chains
- **Features**: Often gasless, fast finality
- **Examples**: Saga Chainlet, Katana

### DeFi Networks  
- **Purpose**: DeFi protocols and yield farming
- **Features**: Cross-chain compatible, high security
- **Examples**: Flow EVM, Arbitrum

### Development Networks
- **Purpose**: Testing and development
- **Features**: Faucets available, reset-friendly
- **Examples**: Local testnets, development chains

### Experimental Networks
- **Purpose**: Cutting-edge features, beta testing
- **Features**: May be unstable, new consensus
- **Examples**: New L2s, research chains

## Components

### NetworkSelector

```typescript
import { NetworkSelector } from '@/components/NetworkSelector'

// Simple dropdown in navbar
<NetworkSelector />

// Gaming networks only as tabs
<NetworkSelector 
  variant="tabs" 
  categoryFilter="gaming" 
  showTestnets={false}
/>

// DeFi networks as cards
<NetworkSelector 
  variant="cards" 
  categoryFilter="defi"
  className="grid-cols-2"
/>
```

### Adding Networks to Wallet

```typescript
import { addNetworkToWallet, addFlowMainnet } from '@/app/lib/add-network'

// Quick helpers
await addFlowMainnet()
await addKatanaMainnet()

// Custom network
await addNetworkToWallet({ 
  network: myCustomNetwork,
  includeToken: true 
})
```

## Environment Configuration

Networks are automatically selected based on environment:

```typescript
// Development: All networks available for testing
const isDevelopment = process.env.NODE_ENV === 'development'

// Production: Only stable, audited networks
const isProduction = process.env.NODE_ENV === 'production'
```

Override with environment variables:
```bash
# Enable specific networks
NEXT_PUBLIC_ENABLED_NETWORKS=saga,flow,katana

# Enable testnet mode
NEXT_PUBLIC_ENABLE_TESTNETS=true
```

## Utilities

### Contract Address Resolution

```typescript
import { getContractAddress } from '@/app/lib/networks'

const gameController = getContractAddress(chainId, 'gameController')
const defiVault = getContractAddress(chainId, 'defiVault')
```

### Explorer URL Generation

```typescript
import { getExplorerUrl } from '@/app/lib/networks'

const txUrl = getExplorerUrl(chainId, txHash, 'tx')
const addressUrl = getExplorerUrl(chainId, address, 'address')
```

### Network Information

```typescript
import { getNetworkById, getNetworksByCategory } from '@/app/lib/networks'

const network = getNetworkById(747) // Flow
const gamingNets = getNetworksByCategory('gaming')
```

## Gas Price Management

Networks can specify gas settings:

```typescript
const networkWithGas: NetworkConfig = {
  // ... other config
  gasSettings: {
    minGasPrice: BigInt('1000000000'), // 1 gwei
    maxGasPrice: BigInt('50000000000'), // 50 gwei  
    gasMultiplier: 1.2, // 20% buffer
  }
}
```

These are automatically applied in wagmi transports.

## Best Practices

### 1. Network Validation
Always validate networks before use:

```typescript
import { validateNetwork } from '@/app/lib/networks'

if (!validateNetwork(myNetwork)) {
  throw new Error('Invalid network configuration')
}
```

### 2. Graceful Fallbacks
Handle unsupported networks:

```typescript
const getNetworkName = (chainId: number) => {
  const network = getNetworkById(chainId)
  return network?.name || `Unknown Chain ${chainId}`
}
```

### 3. Category Filtering
Use categories to organize networks:

```typescript
// Show only gaming networks in gaming UI
const gamingNetworks = getNetworksByCategory('gaming')

// Show only mainnet networks in production
const mainnetNetworks = ALL_NETWORKS.filter(n => !n.isTestnet)
```

### 4. Feature Detection
Check network capabilities:

```typescript
const network = getNetworkById(chainId)
if (network?.features?.gasless) {
  // Use gasless transaction flow
}
if (network?.features?.crossChain) {
  // Enable cross-chain features  
}
```

## Adding Real-World Networks

### Flow EVM
```typescript
export const flowMainnet: NetworkConfig = {
  id: 747,
  name: 'Flow EVM Mainnet',
  // ... configuration from docs
}
```

### Katana  
```typescript
export const katanaMainnet: NetworkConfig = {
  id: 747474,
  name: 'Katana',
  // ... configuration from docs
}
```

### Custom L2
```typescript
export const myL2: NetworkConfig = {
  id: 999999,
  name: 'My Custom L2',
  category: 'experimental',
  gasSettings: {
    minGasPrice: BigInt('100000'), // Very low gas
  },
  features: {
    gasless: true,
    fastFinality: true,
  }
}
```

## Troubleshooting

### Network Not Appearing
1. Check it's added to the correct collection (`PRODUCTION_NETWORKS`, etc.)
2. Verify environment settings allow the network
3. Ensure `validateNetwork()` passes

### Wallet Integration Issues
1. Check MetaMask compatibility
2. Verify RPC endpoints are accessible
3. Ensure chain ID is unique

### Gas Price Problems  
1. Check network's `gasSettings` configuration
2. Verify RPC returns accurate gas prices
3. Use `gasMultiplier` for buffer

## Migration Guide

### From Old System
1. Move network definitions to `lib/networks.ts`
2. Add category and feature flags
3. Update imports to use new exports
4. Replace manual transport config with dynamic system

### Adding Contract Addresses
1. Add to network's `contracts` field
2. Use `getContractAddress()` utility
3. Remove hardcoded addresses from components

This system makes adding new networks a simple, type-safe process while maintaining clean separation of concerns.