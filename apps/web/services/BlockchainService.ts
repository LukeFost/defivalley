import { parseUnits, parseEther, type Hash, type PublicClient, type WalletClient } from 'viem';
import type { Config } from 'wagmi';
import { writeContract, waitForTransactionReceipt, switchChain, getPublicClient, getWalletClient } from '@wagmi/core';
import { GameControllerABI } from '../app/lib/abis/GameController';

// Service configuration
export interface BlockchainServiceConfig {
  sagaChainId: number;
  arbitrumChainId: number;
  gameControllerAddress: `0x${string}`;
  defiVaultAddress: `0x${string}`;
  defaultGasEstimate?: bigint;
  maxRetries?: number;
  retryDelay?: number;
  txTimeout?: number;
}

// Transaction types
export type TransactionType = 'plant_seed' | 'harvest_seed' | 'claim_yield' | 'batch_harvest';

export interface TransactionMetadata {
  type: TransactionType;
  chainId: number;
  from: `0x${string}`;
  to: `0x${string}`;
  value?: bigint;
  data?: any;
  timestamp: number;
}

export interface TransactionResult {
  success: boolean;
  txHash?: Hash;
  error?: Error | string;
  metadata?: TransactionMetadata;
  receipt?: any;
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier?: number;
}

// Transaction tracker interface
export interface TransactionTracker {
  onStatusUpdate?: (txId: string, status: string, metadata?: any) => void;
  onError?: (txId: string, error: Error) => void;
  onComplete?: (txId: string, result: TransactionResult) => void;
}

// Error types
export class BlockchainError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: any
  ) {
    super(message);
    this.name = 'BlockchainError';
  }
}

export class NetworkError extends BlockchainError {
  constructor(message: string, cause?: any) {
    super(message, 'NETWORK_ERROR', cause);
  }
}

export class TransactionError extends BlockchainError {
  constructor(message: string, public txHash?: string, cause?: any) {
    super(message, 'TRANSACTION_ERROR', cause);
  }
}

export class ValidationError extends BlockchainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

/**
 * BlockchainService - Framework-agnostic Web3 service for DeFi Valley
 * Handles all blockchain interactions with proper error handling and retry logic
 */
export class BlockchainService {
  private config: Required<BlockchainServiceConfig>;
  private wagmiConfig: Config;
  private transactionTrackers: Map<string, TransactionTracker> = new Map();

  constructor(
    config: BlockchainServiceConfig,
    wagmiConfig: Config
  ) {
    this.config = {
      defaultGasEstimate: parseEther('0.01'),
      maxRetries: 3,
      retryDelay: 2000,
      txTimeout: 120000, // 2 minutes
      ...config
    };
    this.wagmiConfig = wagmiConfig;
  }

  /**
   * Plant a seed with cross-chain DeFi integration
   */
  async plantSeed(params: {
    seedType: number;
    amount: string; // USDC amount as string
    gasEstimate?: bigint;
    from: `0x${string}`;
    trackerId?: string;
  }): Promise<TransactionResult> {
    const { seedType, amount, gasEstimate, from, trackerId } = params;
    const txId = trackerId || this.generateTxId('plant_seed');

    try {
      // Validate inputs
      this.validateSeedType(seedType);
      const parsedAmount = this.parseUSDCAmount(amount);
      this.validateAmount(parsedAmount, seedType);

      // Update tracker
      this.updateTracker(txId, 'validating', { seedType, amount });

      // Ensure correct network
      await this.ensureNetwork(this.config.sagaChainId);
      this.updateTracker(txId, 'network_confirmed');

      // Prepare transaction
      const txGas = gasEstimate || this.config.defaultGasEstimate;
      const metadata: TransactionMetadata = {
        type: 'plant_seed',
        chainId: this.config.sagaChainId,
        from,
        to: this.config.gameControllerAddress,
        value: txGas,
        data: { seedType, amount: parsedAmount },
        timestamp: Date.now()
      };

      this.updateTracker(txId, 'sending_transaction', metadata);

      // Execute with retry logic
      const result = await this.executeWithRetry(async () => {
        const hash = await writeContract(this.wagmiConfig, {
          address: this.config.gameControllerAddress,
          abi: GameControllerABI,
          functionName: 'plantSeed',
          args: [
            BigInt(seedType),
            parsedAmount,
            '0x0000000000000000000000000000000000000000' as `0x${string}` // Native gas token
          ],
          value: txGas,
          gasPrice: BigInt('100000000'), // 0.1 Gwei for Saga
        });

        return hash;
      });

      this.updateTracker(txId, 'transaction_sent', { txHash: result });

      // Wait for confirmation
      const receipt = await this.waitForTransaction(result, txId);

      const txResult: TransactionResult = {
        success: true,
        txHash: result,
        receipt,
        metadata
      };

      this.completeTransaction(txId, txResult);
      return txResult;

    } catch (error) {
      const txError = this.handleError(error, txId);
      return {
        success: false,
        error: txError
      };
    }
  }

  /**
   * Harvest a single seed with cross-chain yield claim
   */
  async harvestCrop(params: {
    seedId: number;
    gasEstimate?: bigint;
    from: `0x${string}`;
    trackerId?: string;
  }): Promise<TransactionResult> {
    const { seedId, gasEstimate, from, trackerId } = params;
    const txId = trackerId || this.generateTxId('harvest_seed');

    try {
      this.updateTracker(txId, 'preparing_harvest', { seedId });

      // Ensure correct network
      await this.ensureNetwork(this.config.sagaChainId);

      const txGas = gasEstimate || this.config.defaultGasEstimate;
      const metadata: TransactionMetadata = {
        type: 'harvest_seed',
        chainId: this.config.sagaChainId,
        from,
        to: this.config.gameControllerAddress,
        value: txGas,
        data: { seedId },
        timestamp: Date.now()
      };

      this.updateTracker(txId, 'sending_transaction', metadata);

      // Execute harvest with retry
      const result = await this.executeWithRetry(async () => {
        const hash = await writeContract(this.wagmiConfig, {
          address: this.config.gameControllerAddress,
          abi: GameControllerABI,
          functionName: 'harvestSeed',
          args: [
            BigInt(seedId),
            '0x0000000000000000000000000000000000000000' as `0x${string}` // Native gas token
          ],
          value: txGas,
          gasPrice: BigInt('100000000'), // 0.1 Gwei
        });

        return hash;
      });

      this.updateTracker(txId, 'transaction_sent', { txHash: result });

      // Wait for confirmation
      const receipt = await this.waitForTransaction(result, txId);

      const txResult: TransactionResult = {
        success: true,
        txHash: result,
        receipt,
        metadata
      };

      this.completeTransaction(txId, txResult);
      return txResult;

    } catch (error) {
      const txError = this.handleError(error, txId);
      return {
        success: false,
        error: txError
      };
    }
  }

  /**
   * Batch harvest multiple seeds in one transaction
   */
  async batchHarvest(params: {
    seedIds: number[];
    gasEstimate?: bigint;
    from: `0x${string}`;
    trackerId?: string;
  }): Promise<TransactionResult> {
    const { seedIds, gasEstimate, from, trackerId } = params;
    const txId = trackerId || this.generateTxId('batch_harvest');

    try {
      if (seedIds.length === 0) {
        throw new ValidationError('No seeds to harvest');
      }

      this.updateTracker(txId, 'preparing_batch_harvest', { seedIds });

      // Ensure correct network
      await this.ensureNetwork(this.config.sagaChainId);

      // Calculate gas based on number of seeds
      const baseGas = this.config.defaultGasEstimate;
      const txGas = gasEstimate || (baseGas * BigInt(Math.max(1, Math.ceil(seedIds.length / 2))));

      const metadata: TransactionMetadata = {
        type: 'batch_harvest',
        chainId: this.config.sagaChainId,
        from,
        to: this.config.gameControllerAddress,
        value: txGas,
        data: { seedIds },
        timestamp: Date.now()
      };

      this.updateTracker(txId, 'sending_transaction', metadata);

      // Execute batch harvest
      const result = await this.executeWithRetry(async () => {
        const hash = await writeContract(this.wagmiConfig, {
          address: this.config.gameControllerAddress,
          abi: GameControllerABI,
          functionName: 'batchHarvestSeeds',
          args: [
            seedIds.map(id => BigInt(id)),
            '0x0000000000000000000000000000000000000000' as `0x${string}` // Native gas token
          ],
          value: txGas,
          gasPrice: BigInt('100000000'), // 0.1 Gwei
        });

        return hash;
      });

      this.updateTracker(txId, 'transaction_sent', { txHash: result });

      // Wait for confirmation
      const receipt = await this.waitForTransaction(result, txId);

      const txResult: TransactionResult = {
        success: true,
        txHash: result,
        receipt,
        metadata
      };

      this.completeTransaction(txId, txResult);
      return txResult;

    } catch (error) {
      const txError = this.handleError(error, txId);
      return {
        success: false,
        error: txError
      };
    }
  }

  /**
   * Claim accumulated yield from DeFi vault
   */
  async claimYield(params: {
    from: `0x${string}`;
    trackerId?: string;
  }): Promise<TransactionResult> {
    const { from, trackerId } = params;
    const txId = trackerId || this.generateTxId('claim_yield');

    try {
      this.updateTracker(txId, 'preparing_yield_claim');

      // Switch to Arbitrum for DeFi operations
      await this.ensureNetwork(this.config.arbitrumChainId);

      const metadata: TransactionMetadata = {
        type: 'claim_yield',
        chainId: this.config.arbitrumChainId,
        from,
        to: this.config.defiVaultAddress,
        timestamp: Date.now()
      };

      this.updateTracker(txId, 'sending_transaction', metadata);

      // Execute yield claim
      const result = await this.executeWithRetry(async () => {
        const hash = await writeContract(this.wagmiConfig, {
          address: this.config.defiVaultAddress,
          abi: [
            {
              "inputs": [],
              "name": "claimYield",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function"
            }
          ],
          functionName: 'claimYield',
        });

        return hash;
      });

      this.updateTracker(txId, 'transaction_sent', { txHash: result });

      // Wait for confirmation
      const receipt = await this.waitForTransaction(result, txId);

      const txResult: TransactionResult = {
        success: true,
        txHash: result,
        receipt,
        metadata
      };

      this.completeTransaction(txId, txResult);
      return txResult;

    } catch (error) {
      const txError = this.handleError(error, txId);
      return {
        success: false,
        error: txError
      };
    }
  }

  /**
   * Register a transaction tracker
   */
  registerTracker(txId: string, tracker: TransactionTracker): void {
    this.transactionTrackers.set(txId, tracker);
  }

  /**
   * Unregister a transaction tracker
   */
  unregisterTracker(txId: string): void {
    this.transactionTrackers.delete(txId);
  }

  /**
   * Estimate gas for cross-chain operations
   */
  async estimateCrossChainGas(
    operation: TransactionType,
    params?: any
  ): Promise<bigint> {
    // Base gas estimates for different operations
    const baseGasEstimates: Record<TransactionType, bigint> = {
      plant_seed: parseEther('0.01'),
      harvest_seed: parseEther('0.008'),
      batch_harvest: parseEther('0.015'),
      claim_yield: parseEther('0.005'),
    };

    let estimate = baseGasEstimates[operation] || parseEther('0.01');

    // Adjust for batch operations
    if (operation === 'batch_harvest' && params?.seedIds) {
      const seedCount = params.seedIds.length;
      estimate = estimate * BigInt(Math.max(1, Math.ceil(seedCount / 3)));
    }

    // Add 20% buffer for safety
    return (estimate * BigInt(120)) / BigInt(100);
  }

  /**
   * Get public client for reading blockchain data
   */
  async getPublicClient(chainId?: number): Promise<PublicClient> {
    if (chainId) {
      await this.ensureNetwork(chainId);
    }
    return getPublicClient(this.wagmiConfig) as PublicClient;
  }

  /**
   * Get wallet client for transactions
   */
  async getWalletClient(chainId?: number): Promise<WalletClient> {
    if (chainId) {
      await this.ensureNetwork(chainId);
    }
    return getWalletClient(this.wagmiConfig) as WalletClient;
  }

  // Private helper methods

  private async ensureNetwork(requiredChainId: number): Promise<void> {
    const client = await getWalletClient(this.wagmiConfig);
    if (client.chain?.id !== requiredChainId) {
      await switchChain(this.wagmiConfig, { chainId: requiredChainId });
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig: RetryConfig = {
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      backoffMultiplier: 1.5,
      ...config
    };

    let lastError: any;
    let delay = retryConfig.retryDelay;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Don't retry on user rejection
        if (error?.code === 4001 || error?.message?.includes('rejected')) {
          throw error;
        }

        if (attempt < retryConfig.maxRetries) {
          await this.delay(delay);
          delay = Math.floor(delay * (retryConfig.backoffMultiplier || 1));
        }
      }
    }

    throw lastError;
  }

  private async waitForTransaction(
    hash: Hash,
    txId: string
  ): Promise<any> {
    const startTime = Date.now();
    const timeout = this.config.txTimeout;

    try {
      const receipt = await waitForTransactionReceipt(this.wagmiConfig, {
        hash,
        confirmations: 1,
        timeout: timeout as any,
      });

      if (receipt.status === 'reverted') {
        throw new TransactionError('Transaction reverted', hash);
      }

      return receipt;
    } catch (error: any) {
      if (Date.now() - startTime >= timeout) {
        throw new TransactionError('Transaction timeout', hash, error);
      }
      throw error;
    }
  }

  private validateSeedType(seedType: number): void {
    if (seedType < 1 || seedType > 3) {
      throw new ValidationError(`Invalid seed type: ${seedType}`);
    }
  }

  private parseUSDCAmount(amount: string): bigint {
    try {
      return parseUnits(amount, 6); // USDC has 6 decimals
    } catch {
      throw new ValidationError(`Invalid USDC amount: ${amount}`);
    }
  }

  private validateAmount(amount: bigint, seedType: number): void {
    const minAmounts: Record<number, bigint> = {
      1: BigInt('10000000'), // 10 USDC
      2: BigInt('100000000'), // 100 USDC
      3: BigInt('1000000000'), // 1000 USDC
    };

    const minAmount = minAmounts[seedType];
    if (amount < minAmount) {
      throw new ValidationError(
        `Amount too low for seed type ${seedType}. Minimum: ${Number(minAmount) / 1e6} USDC`
      );
    }
  }

  private generateTxId(type: TransactionType): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateTracker(txId: string, status: string, metadata?: any): void {
    const tracker = this.transactionTrackers.get(txId);
    if (tracker?.onStatusUpdate) {
      tracker.onStatusUpdate(txId, status, metadata);
    }
  }

  private completeTransaction(txId: string, result: TransactionResult): void {
    const tracker = this.transactionTrackers.get(txId);
    if (tracker?.onComplete) {
      tracker.onComplete(txId, result);
    }
    this.unregisterTracker(txId);
  }

  private handleError(error: any, txId: string): Error {
    let blockchainError: BlockchainError;

    if (error?.code === 4001) {
      blockchainError = new TransactionError('User rejected transaction');
    } else if (error?.code === -32603) {
      blockchainError = new NetworkError('Internal JSON-RPC error', error);
    } else if (error instanceof BlockchainError) {
      blockchainError = error;
    } else {
      blockchainError = new TransactionError(
        error?.message || 'Unknown blockchain error',
        undefined,
        error
      );
    }

    const tracker = this.transactionTrackers.get(txId);
    if (tracker?.onError) {
      tracker.onError(txId, blockchainError);
    }

    return blockchainError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Factory function for creating service instance
export function createBlockchainService(
  config: BlockchainServiceConfig,
  wagmiConfig: Config
): BlockchainService {
  return new BlockchainService(config, wagmiConfig);
}