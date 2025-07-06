import { useCallback } from 'react';
import { useUI, useConfig } from '../../app/store';
import { GameControllerABI } from '../../app/lib/abis/GameController';
import { useBaseTransaction, createTransactionConfig } from './useBaseTransaction';

export interface RegisterPlayerResult {
  success: boolean;
  txId?: string;
  error?: string;
}

export function useRegisterPlayer() {
  const { executeTransaction, isLoading } = useBaseTransaction();
  const { addNotification } = useUI();
  const config = useConfig();

  const registerPlayer = useCallback(async (): Promise<RegisterPlayerResult> => {
    try {
      // Create transaction configuration for player registration
      const txConfig = createTransactionConfig(
        config.gameControllerAddress,
        GameControllerABI,
        'registerPlayer',
        []
      );

      // Execute the transaction
      const result = await executeTransaction(
        {
          type: 'register_player',
          targetChainId: config.sagaChainId,
          metadata: {
            action: 'register'
          }
        },
        txConfig
      );

      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Registration Successful!',
          message: 'Welcome to DeFi Valley! You can now plant seeds and start farming.'
        });

        return {
          success: true,
          txId: result.txId
        };
      }

      return {
        success: false,
        error: result.error
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      
      addNotification({
        type: 'error',
        title: 'Registration Failed',
        message: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }, [executeTransaction, addNotification, config]);

  return {
    registerPlayer,
    isLoading
  };
}