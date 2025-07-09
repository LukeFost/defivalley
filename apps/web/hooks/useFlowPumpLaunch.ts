'use client';

import { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { useUI } from '../app/store';
import { pump_factory, pump_factory_address } from 'contracts/abi/pump_flow';

// The creation fee is typically fixed by the contract, e.g., 3 FLOW
const CREATION_FEE = parseEther('3');

/**
 * Hook for Flow pump launch functionality
 * Handles creating new meme tokens on the Flow network
 */
export function useFlowPumpLaunch() {
  const { address } = useAccount();
  const { addNotification } = useUI();
  const { writeContractAsync, isPending: isCreating, error } = useWriteContract();

  const createMemeToken = async (name: string, symbol: string) => {
    if (!address) {
      addNotification({ 
        type: 'error', 
        title: 'Wallet Not Connected', 
        message: 'Please connect your wallet to create a token.' 
      });
      return;
    }
    
    if (!name || !symbol) {
      addNotification({ 
        type: 'error', 
        title: 'Missing Information', 
        message: 'Token name and symbol are required.' 
      });
      return;
    }

    try {
      const uniqueId = `${symbol.toLowerCase()}-${Date.now()}`;
      
      const hash = await writeContractAsync({
        address: pump_factory_address,
        abi: pump_factory,
        functionName: 'createMemeToken',
        args: [
          name,
          symbol,
          0n, // fundingRaised is set to 0 initially
          uniqueId
        ],
        value: CREATION_FEE,
      });

      addNotification({
        type: 'success',
        title: 'Transaction Submitted',
        message: `Your token "${name}" is being created!`,
      });
      
      return { success: true, hash };

    } catch (e: any) {
      console.error("Failed to create meme token:", e);
      addNotification({ 
        type: 'error', 
        title: 'Creation Failed', 
        message: e.shortMessage || e.message 
      });
      return { success: false, error: e };
    }
  };

  return {
    createMemeToken,
    isCreating,
    error,
    creationFee: CREATION_FEE,
  };
}