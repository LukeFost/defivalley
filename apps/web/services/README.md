# BlockchainService

A framework-agnostic, testable service for handling Web3 operations in DeFi Valley. This service abstracts away the complexity of wagmi/viem implementation details and provides a clean API for blockchain interactions.

## Features

- 🔄 **Automatic retry logic** with configurable backoff
- 📊 **Transaction tracking** with lifecycle callbacks
- ⛓️ **Cross-chain support** for Saga and Arbitrum
- 🛡️ **Comprehensive error handling** with typed errors
- 💰 **Gas estimation** for all operations
- 🧪 **Fully testable** with dependency injection
- 🎯 **Framework-agnostic** - works with React, Vue, or vanilla JS

## Installation

The service is included in the web app. No additional installation needed.

## Usage

### React Hook Usage (Recommended)

```typescript
import { useBlockchainService } from '../hooks/useBlockchainService';

function MyComponent() {
  const { plantSeed, harvestCrop, batchHarvest, claimYield } = useBlockchainService();
  
  const handlePlant = async () => {
    const result = await plantSeed(1, '100'); // Plant seed type 1 with 100 USDC
    if (result.success) {
      console.log('Planted successfully:', result.txHash);
    }
  };
  
  return <button onClick={handlePlant}>Plant Seed</button>;
}
```

### Direct Service Usage

```typescript
import { createBlockchainService } from '../services/BlockchainService';
import { config as wagmiConfig } from '../app/wagmi';

const service = createBlockchainService({
  sagaChainId: 2751669528484000,
  arbitrumChainId: 421614,
  gameControllerAddress: '0x896C39e19EcA825cE6bA66102E6752052049a4b1',
  defiVaultAddress: '0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673',
}, wagmiConfig);

// Plant a seed
const result = await service.plantSeed({
  seedType: 1,
  amount: '100',
  from: '0x...your-address',
});
```

## API Reference

### Core Methods

#### `plantSeed(params)`
Plants a seed with cross-chain DeFi integration.

```typescript
const result = await service.plantSeed({
  seedType: 1,              // 1, 2, or 3
  amount: '100',            // USDC amount as string
  gasEstimate?: bigint,     // Optional gas override
  from: '0x...',           // User address
  trackerId?: string,       // Optional transaction ID
});
```

#### `harvestCrop(params)`
Harvests a single seed and claims yield.

```typescript
const result = await service.harvestCrop({
  seedId: 123,              // Seed ID to harvest
  gasEstimate?: bigint,     // Optional gas override
  from: '0x...',           // User address
  trackerId?: string,       // Optional transaction ID
});
```

#### `batchHarvest(params)`
Harvests multiple seeds in one transaction.

```typescript
const result = await service.batchHarvest({
  seedIds: [1, 2, 3],       // Array of seed IDs
  gasEstimate?: bigint,     // Optional gas override
  from: '0x...',           // User address
  trackerId?: string,       // Optional transaction ID
});
```

#### `claimYield(params)`
Claims accumulated yield from the DeFi vault.

```typescript
const result = await service.claimYield({
  from: '0x...',           // User address
  trackerId?: string,       // Optional transaction ID
});
```

### Transaction Tracking

Register a tracker to monitor transaction lifecycle:

```typescript
service.registerTracker('my_tx_id', {
  onStatusUpdate: (txId, status, metadata) => {
    console.log(`Transaction ${txId} status: ${status}`);
  },
  onError: (txId, error) => {
    console.error(`Transaction ${txId} failed:`, error);
  },
  onComplete: (txId, result) => {
    console.log(`Transaction ${txId} completed:`, result);
  }
});
```

### Gas Estimation

```typescript
// Estimate gas for different operations
const plantGas = await service.estimateCrossChainGas('plant_seed');
const harvestGas = await service.estimateCrossChainGas('harvest_seed');
const batchGas = await service.estimateCrossChainGas('batch_harvest', {
  seedIds: [1, 2, 3, 4, 5] // Scales with number of seeds
});
```

## Error Handling

The service provides typed errors for different failure scenarios:

```typescript
try {
  await service.plantSeed({ ... });
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors (invalid input)
  } else if (error instanceof NetworkError) {
    // Handle network errors (RPC issues)
  } else if (error instanceof TransactionError) {
    // Handle transaction errors (reverts, etc)
  }
}
```

## Configuration

### Service Configuration

```typescript
interface BlockchainServiceConfig {
  sagaChainId: number;              // Saga chain ID
  arbitrumChainId: number;          // Arbitrum chain ID
  gameControllerAddress: `0x${string}`;  // Game contract
  defiVaultAddress: `0x${string}`;       // DeFi vault contract
  defaultGasEstimate?: bigint;      // Default gas (0.01 ETH)
  maxRetries?: number;              // Max retry attempts (3)
  retryDelay?: number;              // Initial retry delay (2000ms)
  txTimeout?: number;               // Transaction timeout (120000ms)
}
```

### Retry Configuration

The service automatically retries failed transactions with exponential backoff:

- Initial delay: 2 seconds
- Backoff multiplier: 1.5x
- Max retries: 3
- Does not retry user rejections

## Testing

The service is designed to be easily testable:

```typescript
import { vi } from 'vitest';
import { createBlockchainService } from './BlockchainService';

// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
  writeContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  switchChain: vi.fn(),
}));

// Create service with test config
const service = createBlockchainService(testConfig, mockWagmiConfig);

// Test your logic
const result = await service.plantSeed({ ... });
expect(result.success).toBe(true);
```

## Best Practices

1. **Always handle errors**: Blockchain operations can fail for many reasons
2. **Use transaction tracking**: Monitor transaction lifecycle for better UX
3. **Estimate gas first**: Avoid surprises by estimating gas before transactions
4. **Validate inputs early**: The service validates inputs, but check in UI too
5. **Show transaction status**: Keep users informed during long operations

## Transaction Lifecycle

1. **Preparing**: Validating inputs and checking network
2. **Wallet Confirmation**: Waiting for user to confirm in wallet
3. **Transaction Sent**: Transaction submitted to blockchain
4. **Pending**: Waiting for blockchain confirmation
5. **Cross-chain Processing**: Axelar processing (for cross-chain ops)
6. **Completed**: Transaction successful
7. **Failed**: Transaction failed (with reason)

## Seed Types

| ID | Name | Minimum USDC | Growth Time |
|----|------|--------------|-------------|
| 1 | USDC Sprout | 10 USDC | 24 hours |
| 2 | USDC Premium | 100 USDC | 48 hours |
| 3 | USDC Whale Tree | 1000 USDC | 72 hours |