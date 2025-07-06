import { useCallback } from 'react';
import { parseEther } from 'viem';
import { usePlantSeed as usePlantSeedHook } from '../../lib/hooks/usePlantSeed';
import { useHarvestSeed as useHarvestSeedHook } from '../../lib/hooks/useHarvestSeed';
import { useClaimYield } from './useClaimYield';

// Re-export types and utilities for backward compatibility
export type { PlantSeedParams, PlantSeedResult } from '../../lib/hooks/usePlantSeed';
export type { HarvestSeedParams, HarvestSeedResult } from '../../lib/hooks/useHarvestSeed';

// Cross-chain gas estimation (simplified)
const ESTIMATED_CROSS_CHAIN_GAS = parseEther('0.01'); // 0.01 ETH

// Re-export individual hooks for backward compatibility
export function usePlantSeed() {
  return usePlantSeedHook();
}

export function useHarvestSeed() {
  const { harvestSeed, isLoading } = useHarvestSeedHook();
  
  // Maintain backward compatibility with the old interface
  const harvestSeedLegacy = useCallback(async (seedId: number) => {
    return harvestSeed({ seedId });
  }, [harvestSeed]);
  
  return {
    harvestSeed: harvestSeedLegacy,
    isLoading
  };
}

// Re-export individual hooks for backward compatibility
export { useClaimYield } from './useClaimYield';

// Main hook that combines all cross-chain transaction functionality
export function useCrossChainTx() {
  const plantSeedHook = usePlantSeed();
  const harvestSeedHook = useHarvestSeed();
  const claimYieldHook = useClaimYield();
  
  const isLoading = plantSeedHook.isLoading || harvestSeedHook.isLoading || claimYieldHook.isLoading;
  
  return {
    ...plantSeedHook,
    ...harvestSeedHook,
    ...claimYieldHook,
    isLoading,
    
    // Gas estimation helper
    estimateGas: useCallback(async (seedType: number, amount: string) => {
      // Simple gas estimation - in production, this would call actual contract methods
      return ESTIMATED_CROSS_CHAIN_GAS;
    }, [])
  };
}

