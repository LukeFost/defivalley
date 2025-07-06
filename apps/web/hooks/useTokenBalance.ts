'use client';

import { useReadContract, useChainId } from 'wagmi';
import { type Address } from 'viem';

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
  const chainId = useChainId();
  
  const { data: balance, isLoading, refetch } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    chainId: chainId, // Use dynamic chainId from connected wallet
    query: {
      enabled: !!tokenAddress && !!userAddress,
    },
  });

  return {
    balance: balance || BigInt(0),
    isLoading,
    refetch,
  };
}