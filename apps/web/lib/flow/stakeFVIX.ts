import { parseUnits, formatUnits, type Address } from 'viem';
import { 
  FVIX_TOKEN, 
  sFVIX_TOKEN, 
  TOKEN_DECIMALS 
} from '../../../../packages/contracts/flow/constants';

// sFVIX Staking Vault ABI (ERC4626 interface)
const sFVIX_ABI = [
  {
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' }
    ],
    name: 'deposit',
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' }
    ],
    name: 'mint',
    outputs: [{ name: 'assets', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' }
    ],
    name: 'withdraw',
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'claimRewards',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'pendingRewardsFor',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'assets', type: 'uint256' }],
    name: 'previewDeposit',
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export interface StakeFVIXParams {
  fvixAmount: string; // FVIX amount to stake (e.g., "100")
  recipient: Address; // Recipient address for sFVIX shares
}

export interface StakeFVIXResult {
  txData: {
    address: Address;
    abi: typeof sFVIX_ABI;
    functionName: 'deposit';
    args: readonly [bigint, Address];
  };
  fvixAmountWei: bigint;
  canStake: boolean;
  missingFvix: bigint;
}

export interface UnstakeParams {
  sFvixAmount: string; // sFVIX shares to redeem
  recipient: Address; // Recipient address for FVIX tokens
  owner: Address; // Owner of the sFVIX shares
}

/**
 * Prepares a FVIX → sFVIX staking transaction
 * 
 * @param params - Staking parameters including FVIX amount and recipient
 * @param fvixBalance - Current FVIX balance (in wei)
 * @returns Transaction data for use with wagmi/viem writeContract
 */
export function stakeFVIXForShares(
  params: StakeFVIXParams,
  fvixBalance: bigint
): StakeFVIXResult {
  const { fvixAmount, recipient } = params;
  
  // Parse FVIX amount (18 decimals)
  const fvixAmountWei = parseUnits(fvixAmount, TOKEN_DECIMALS.FVIX);
  
  // Check if user has enough FVIX
  const canStake = fvixBalance >= fvixAmountWei;
  const missingFvix = fvixAmountWei > fvixBalance 
    ? fvixAmountWei - fvixBalance 
    : 0n;
  
  return {
    txData: {
      address: sFVIX_TOKEN,
      abi: sFVIX_ABI,
      functionName: 'deposit',
      args: [fvixAmountWei, recipient] as const
    },
    fvixAmountWei,
    canStake,
    missingFvix
  };
}

/**
 * Prepares an sFVIX → FVIX unstaking transaction
 * 
 * @param params - Unstaking parameters
 * @returns Transaction data for withdrawing FVIX from vault
 */
export function unstakeFVIXFromShares(params: UnstakeParams) {
  const { sFvixAmount, recipient, owner } = params;
  
  // Parse sFVIX amount (18 decimals)
  const sFvixAmountWei = parseUnits(sFvixAmount, TOKEN_DECIMALS.sFVIX);
  
  return {
    address: sFVIX_TOKEN,
    abi: sFVIX_ABI,
    functionName: 'withdraw' as const,
    args: [sFvixAmountWei, recipient, owner] as const
  };
}

/**
 * Prepares a reward claiming transaction
 * 
 * @returns Transaction data for claiming pending rewards
 */
export function claimStakingRewards() {
  return {
    address: sFVIX_TOKEN,
    abi: sFVIX_ABI,
    functionName: 'claimRewards' as const,
    args: [] as const
  };
}

/**
 * Checks if user has sufficient FVIX for staking
 * 
 * @param fvixBalance - Current FVIX balance (in wei)
 * @param amountToStake - Desired FVIX amount to stake (as string)
 * @returns Object with staking eligibility information
 */
export function checkStakingEligibility(
  fvixBalance: bigint,
  amountToStake: string
): {
  canStake: boolean;
  hasSufficientBalance: boolean;
  missingFvix: string;
  hasAnyFvix: boolean;
} {
  const amountWei = parseUnits(amountToStake, TOKEN_DECIMALS.FVIX);
  
  const hasSufficientBalance = fvixBalance >= amountWei;
  const hasAnyFvix = fvixBalance > 0n;
  const canStake = hasSufficientBalance && hasAnyFvix;
  
  const missingAmount = amountWei > fvixBalance ? amountWei - fvixBalance : 0n;
  const missingFvix = formatUnits(missingAmount, TOKEN_DECIMALS.FVIX);
  
  return {
    canStake,
    hasSufficientBalance,
    missingFvix,
    hasAnyFvix
  };
}

/**
 * Calculates the maximum FVIX that can be staked with current balance
 * 
 * @param fvixBalance - Current FVIX balance (in wei)
 * @returns Maximum stakeable amount as formatted string
 */
export function getMaxStakeableFVIX(fvixBalance: bigint): string {
  if (fvixBalance === 0n) {
    return "0";
  }
  
  return formatUnits(fvixBalance, TOKEN_DECIMALS.FVIX);
}

/**
 * Calculates estimated sFVIX shares for a given FVIX amount
 * Note: This is a 1:1 ratio in most cases, but actual implementation may vary
 * 
 * @param fvixAmount - FVIX amount as string
 * @param previewDeposit - Function to preview deposit from contract
 * @returns Estimated sFVIX shares as formatted string
 */
export async function estimateSFVIXShares(
  fvixAmount: string,
  previewDeposit: (assets: bigint) => Promise<bigint>
): Promise<string> {
  const fvixAmountWei = parseUnits(fvixAmount, TOKEN_DECIMALS.FVIX);
  const shares = await previewDeposit(fvixAmountWei);
  
  return formatUnits(shares, TOKEN_DECIMALS.sFVIX);
}

/**
 * Utility function to check if user has any FVIX to stake
 * 
 * @param fvixBalance - Current FVIX balance (in wei)
 * @returns Boolean indicating if user has stakeable FVIX
 */
export function hasStakeableFVIX(fvixBalance: bigint): boolean {
  return fvixBalance > 0n;
}

export { sFVIX_ABI, sFVIX_TOKEN, FVIX_TOKEN };