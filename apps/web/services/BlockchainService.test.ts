import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createConfig } from 'wagmi';
import { http } from 'viem';
import { mainnet } from 'wagmi/chains';
import { 
  BlockchainService, 
  createBlockchainService,
  BlockchainError,
  NetworkError,
  TransactionError,
  ValidationError
} from './BlockchainService';

// Mock wagmi functions
vi.mock('@wagmi/core', () => ({
  writeContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  switchChain: vi.fn(),
  getPublicClient: vi.fn(),
  getWalletClient: vi.fn(),
}));

// Create test config
const testConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
});

const serviceConfig = {
  sagaChainId: 2751669528484000,
  arbitrumChainId: 421614,
  gameControllerAddress: '0x896C39e19EcA825cE6bA66102E6752052049a4b1' as const,
  defiVaultAddress: '0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673' as const,
};

describe('BlockchainService', () => {
  let service: BlockchainService;

  beforeEach(() => {
    service = createBlockchainService(serviceConfig, testConfig);
    vi.clearAllMocks();
  });

  describe('plantSeed', () => {
    test('should validate seed type', async () => {
      const result = await service.plantSeed({
        seedType: 5, // Invalid seed type
        amount: '100',
        from: '0x1234567890123456789012345678901234567890',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ValidationError);
      expect((result.error as ValidationError).message).toContain('Invalid seed type');
    });

    test('should validate amount', async () => {
      const result = await service.plantSeed({
        seedType: 2, // Premium seed requires 100 USDC minimum
        amount: '50', // Too low
        from: '0x1234567890123456789012345678901234567890',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ValidationError);
      expect((result.error as ValidationError).message).toContain('Amount too low');
    });

    test('should parse USDC amounts correctly', async () => {
      const result = await service.plantSeed({
        seedType: 1,
        amount: 'invalid_amount',
        from: '0x1234567890123456789012345678901234567890',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ValidationError);
      expect((result.error as ValidationError).message).toContain('Invalid USDC amount');
    });
  });

  describe('estimateCrossChainGas', () => {
    test('should estimate gas for plant_seed', async () => {
      const estimate = await service.estimateCrossChainGas('plant_seed');
      expect(estimate).toBeGreaterThan(0n);
      // Should include 20% buffer
      expect(estimate).toBe(12000000000000000n); // 0.012 ETH (0.01 * 1.2)
    });

    test('should estimate gas for batch_harvest', async () => {
      const estimate = await service.estimateCrossChainGas('batch_harvest', {
        seedIds: [1, 2, 3, 4, 5, 6] // 6 seeds
      });
      
      // Should scale with number of seeds
      expect(estimate).toBeGreaterThan(12000000000000000n);
    });
  });

  describe('Transaction Tracking', () => {
    test('should register and call tracker callbacks', async () => {
      const tracker = {
        onStatusUpdate: vi.fn(),
        onError: vi.fn(),
        onComplete: vi.fn(),
      };

      const txId = 'test_tx_123';
      service.registerTracker(txId, tracker);

      // Simulate a failed transaction
      await service.plantSeed({
        seedType: 10, // Invalid to trigger error
        amount: '100',
        from: '0x1234567890123456789012345678901234567890',
        trackerId: txId,
      });

      expect(tracker.onError).toHaveBeenCalledWith(txId, expect.any(ValidationError));
    });

    test('should unregister tracker after completion', () => {
      const tracker = {
        onStatusUpdate: vi.fn(),
        onError: vi.fn(),
        onComplete: vi.fn(),
      };

      const txId = 'test_tx_456';
      service.registerTracker(txId, tracker);
      service.unregisterTracker(txId);

      // Tracker should not be called after unregistering
      service['updateTracker'](txId, 'test_status');
      expect(tracker.onStatusUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should create appropriate error types', () => {
      const networkError = new NetworkError('Network failed');
      expect(networkError.code).toBe('NETWORK_ERROR');
      expect(networkError.name).toBe('BlockchainError');

      const txError = new TransactionError('Transaction failed', '0xabc123');
      expect(txError.code).toBe('TRANSACTION_ERROR');
      expect(txError.txHash).toBe('0xabc123');

      const validationError = new ValidationError('Invalid input');
      expect(validationError.code).toBe('VALIDATION_ERROR');
    });
  });
});

describe('BlockchainService Integration Examples', () => {
  test('Example: Complete plant seed flow', async () => {
    const service = createBlockchainService(serviceConfig, testConfig);
    
    // Register a tracker to monitor the transaction
    const events: string[] = [];
    service.registerTracker('plant_001', {
      onStatusUpdate: (_, status) => events.push(status),
      onError: (_, error) => events.push(`error: ${error.message}`),
      onComplete: () => events.push('completed'),
    });

    // This would normally execute the transaction
    // In tests, it will fail due to mocked wagmi
    const result = await service.plantSeed({
      seedType: 1,
      amount: '100',
      from: '0x1234567890123456789012345678901234567890',
      trackerId: 'plant_001',
    });

    console.log('Transaction events:', events);
    console.log('Result:', result);
  });

  test('Example: Batch harvest with gas estimation', async () => {
    const service = createBlockchainService(serviceConfig, testConfig);
    
    // Estimate gas for harvesting 5 seeds
    const seedIds = [1, 2, 3, 4, 5];
    const gasEstimate = await service.estimateCrossChainGas('batch_harvest', { seedIds });
    
    console.log('Estimated gas for 5 seeds:', gasEstimate.toString());
    
    // Execute batch harvest
    const result = await service.batchHarvest({
      seedIds,
      gasEstimate,
      from: '0x1234567890123456789012345678901234567890',
    });
    
    console.log('Batch harvest result:', result);
  });
});