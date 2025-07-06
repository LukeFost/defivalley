'use client';

import { useReadContract } from 'wagmi';
import { type Address } from 'viem';
import { BASE_CHAIN_ID } from '@/constants/base-tokens';

// Simple ERC20 ABI for balance checking
const erc20Abi = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function useTokenBalance(tokenAddress: Address | undefined, userAddress: Address | undefined) {
  const { data: balance, isLoading, refetch } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    chainId: BASE_CHAIN_ID, // Base chain ID
    query: {
      enabled: !!tokenAddress && !!userAddress,
      refetchInterval: 10000, // Refresh every 10 seconds for live balance updates
    },
  });

  return {
    balance: balance || BigInt(0),
    isLoading,
    refetch,
  };
}