"use client";

import { useQuery } from '@tanstack/react-query';
import { type Address } from 'viem';
import { getMorphoPosition } from '@/services/PortfolioService';

interface PortfolioData {
  supplyShares: bigint;
  borrowShares: bigint;
  collateral: bigint;
  vbUSDCAmount: number;
}

interface UsePortfolioReturn {
  portfolioData: PortfolioData | null;
  isLoading: boolean;
  error: Error | null;
  totalValueUsd: number;
}

/**
 * Hook to fetch and format user's portfolio data from Morpho
 * @param userAddress The user's wallet address
 * @returns Formatted portfolio data with loading and error states
 */
export function usePortfolio(userAddress: Address | undefined): UsePortfolioReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio', userAddress],
    queryFn: async () => {
      if (!userAddress) {
        throw new Error('User address is required');
      }
      
      const { marketId, positionData } = await getMorphoPosition(userAddress);
      
      // Process the raw position data
      const supplyShares = positionData.supplyShares;
      const borrowShares = positionData.borrowShares;
      const collateral = positionData.collateral;
      
      // Convert supply shares to vbUSDC amount (assuming 1:1 ratio as instructed)
      // vbUSDC has 6 decimals
      const vbUSDCAmount = Number(supplyShares) / 1e6;
      
      return {
        supplyShares,
        borrowShares,
        collateral,
        vbUSDCAmount,
      };
    },
    enabled: !!userAddress,
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Calculate total portfolio value in USD
  // For now, just the vbUSDC value since we're assuming 1:1 with USD
  const totalValueUsd = data?.vbUSDCAmount || 0;

  return {
    portfolioData: data || null,
    isLoading,
    error: error as Error | null,
    totalValueUsd,
  };
}