import { useState, useCallback } from 'react';
import { useAccount, useChainId, useSwitchChain, useWriteContract, usePublicClient } from 'wagmi';
import { useTransactions, useUI, useConfig } from '../../app/store';

export interface BaseTransactionParams {
  type: string;
  targetChainId?: number;
  skipChainSwitch?: boolean;
  metadata?: Record<string, any>;
}

export interface BaseTransactionResult<T = any> {
  success: boolean;
  error?: string;
  txId?: string;
  data?: T;
}

export interface TransactionConfig {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args?: any[];
  value?: bigint;
  gasPrice?: bigint;
}

export interface BaseTransactionHookReturn<T = any> {
  executeTransaction: (params: BaseTransactionParams, txConfig?: TransactionConfig) => Promise<BaseTransactionResult<T>>;
  isLoading: boolean;
  currentTxId: string | null;
}

/**
 * Base transaction hook that provides common transaction logic
 * Handles wallet connectivity, chain switching, state management, notifications, and error handling
 */
export function useBaseTransaction<T = any>(): BaseTransactionHookReturn<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [currentTxId, setCurrentTxId] = useState<string | null>(null);
  
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  
  const { add: addTransaction, update: updateTransaction } = useTransactions();
  const { addNotification } = useUI();
  const config = useConfig();

  const executeTransaction = useCallback(async (
    params: BaseTransactionParams,
    txConfig?: TransactionConfig
  ): Promise<BaseTransactionResult<T>> => {
    
    // Validate wallet connection
    if (!address) {
      addNotification({
        type: 'error',
        title: 'Wallet Required',
        message: 'Please connect your wallet to continue'
      });
      return { success: false, error: 'No wallet connected' };
    }

    try {
      setIsLoading(true);
      
      // Handle chain switching if needed
      if (params.targetChainId && !params.skipChainSwitch && chainId !== params.targetChainId) {
        addNotification({
          type: 'info',
          title: 'Switching Network',
          message: 'Switching to the required network...'
        });
        
        await switchChain({ chainId: params.targetChainId });
      }
      
      // Create transaction in store
      const txId = addTransaction({
        type: params.type,
        status: 'preparing',
        player: address,
        ...params.metadata
      });
      
      setCurrentTxId(txId);
      
      // Update status to wallet confirmation
      updateTransaction(txId, { status: 'wallet_confirm' });
      
      addNotification({
        type: 'info',
        title: 'Confirm Transaction',
        message: 'Please confirm the transaction in your wallet'
      });
      
      // Execute contract transaction if config provided
      let txHash: `0x${string}` | undefined;
      if (txConfig) {
        txHash = await writeContractAsync(txConfig);
        
        updateTransaction(txId, { 
          status: 'pending',
          txHash
        });
        
        addNotification({
          type: 'success',
          title: 'Transaction Submitted',
          message: 'Your transaction has been submitted to the blockchain'
        });

        // Wait for transaction confirmation
        if (publicClient) {
          try {
            const receipt = await publicClient.waitForTransactionReceipt({
              hash: txHash,
              confirmations: 1,
              timeout: 60000, // 1 minute timeout
            });

            updateTransaction(txId, { 
              status: 'completed',
              txHash,
              blockNumber: receipt.blockNumber?.toString(),
              gasUsed: receipt.gasUsed?.toString()
            });
          } catch (receiptError) {
            // Transaction submitted but confirmation failed/timed out
            console.warn('Transaction confirmation timeout:', receiptError);
            updateTransaction(txId, { 
              status: 'pending',
              txHash,
              note: 'Confirmation pending'
            });
          }
        }
      } else {
        // No contract interaction - just update status
        updateTransaction(txId, { status: 'completed' });
      }
      
      setCurrentTxId(null);
      setIsLoading(false);
      
      return { 
        success: true, 
        txId,
        data: txHash ? { txHash } as T : undefined
      };
      
    } catch (error: any) {
      console.error(`${params.type} transaction error:`, error);
      
      if (currentTxId) {
        updateTransaction(currentTxId, { 
          status: 'failed',
          error: error.message || 'Unknown error occurred'
        });
      }
      
      // Determine error type and show appropriate notification
      let errorTitle = 'Transaction Failed';
      let errorMessage = 'Transaction failed. Please try again.';
      
      if (error.message?.includes('User rejected')) {
        errorTitle = 'Transaction Cancelled';
        errorMessage = 'Transaction was cancelled by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorTitle = 'Insufficient Funds';
        errorMessage = 'Insufficient funds to complete transaction';
      } else if (error.message?.includes('gas')) {
        errorTitle = 'Gas Error';
        errorMessage = 'Transaction failed due to gas issues';
      }
      
      addNotification({
        type: 'error',
        title: errorTitle,
        message: error.message || errorMessage
      });
      
      setCurrentTxId(null);
      setIsLoading(false);
      
      return { 
        success: false, 
        error: error.message || 'Transaction failed' 
      };
    }
  }, [
    address,
    chainId,
    switchChain,
    writeContractAsync,
    publicClient,
    addTransaction,
    updateTransaction,
    addNotification,
    config,
    currentTxId
  ]);
  
  return {
    executeTransaction,
    isLoading,
    currentTxId
  };
}

/**
 * Utility function to create a transaction config for contract calls
 */
export function createTransactionConfig(
  address: `0x${string}`,
  abi: any,
  functionName: string,
  args?: any[],
  value?: bigint,
  gasPrice?: bigint
): TransactionConfig {
  return {
    address,
    abi,
    functionName,
    args: args || [],
    value,
    gasPrice
  };
}