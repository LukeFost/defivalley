import { parseUnits, formatUnits, type Address } from 'viem';
import { 
  FROTH_TOKEN, 
  FVIX_TOKEN, 
  FROTH_THRESHOLD, 
  TOKEN_DECIMALS 
} from '../../../../packages/contracts/flow/constants';

// FVIX Token ABI (minimal interface for minting)
const FVIX_ABI = [
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
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

export interface MintFVIXParams {
  frothAmount: string; // FROTH amount to spend for minting (e.g., "10000")
}

export interface MintFVIXResult {
  txData: {
    address: Address;
    abi: typeof FVIX_ABI;
    functionName: 'mint';
    args: readonly [bigint];
  };
  frothAmountWei: bigint;
  canMint: boolean;
  missingFroth: bigint;
}

/**
 * Prepares a FROTH → FVIX minting transaction
 * 
 * @param params - Minting parameters including FROTH amount
 * @param frothBalance - Current FROTH balance (in wei)
 * @returns Transaction data for use with wagmi/viem writeContract
 */
export function mintFVIXWithFroth(
  params: MintFVIXParams,
  frothBalance: bigint
): MintFVIXResult {
  const { frothAmount } = params;
  
  // Parse FROTH amount (18 decimals)
  const frothAmountWei = parseUnits(frothAmount, TOKEN_DECIMALS.FROTH);
  
  // Check if user has enough FROTH and meets minimum threshold
  const canMint = frothBalance >= frothAmountWei && frothAmountWei >= FROTH_THRESHOLD;
  const missingFroth = frothAmountWei > frothBalance 
    ? frothAmountWei - frothBalance 
    : 0n;
  
  return {
    txData: {
      address: FVIX_TOKEN,
      abi: FVIX_ABI,
      functionName: 'mint',
      args: [frothAmountWei] as const
    },
    frothAmountWei,
    canMint,
    missingFroth
  };
}

/**
 * Checks if user has sufficient FROTH for minting FVIX
 * 
 * @param frothBalance - Current FROTH balance (in wei)
 * @param amountToMint - Desired FROTH amount to spend (as string)
 * @returns Object with eligibility information
 */
export function checkFVIXMintEligibility(
  frothBalance: bigint,
  amountToMint: string
): {
  canMint: boolean;
  hasMinimumThreshold: boolean;
  hasSufficientBalance: boolean;
  missingFroth: string;
  thresholdMet: boolean;
} {
  const amountWei = parseUnits(amountToMint, TOKEN_DECIMALS.FROTH);
  
  const hasMinimumThreshold = amountWei >= FROTH_THRESHOLD;
  const hasSufficientBalance = frothBalance >= amountWei;
  const thresholdMet = frothBalance >= FROTH_THRESHOLD;
  
  const canMint = hasMinimumThreshold && hasSufficientBalance;
  
  const missingAmount = amountWei > frothBalance ? amountWei - frothBalance : 0n;
  const missingFroth = formatUnits(missingAmount, TOKEN_DECIMALS.FROTH);
  
  return {
    canMint,
    hasMinimumThreshold,
    hasSufficientBalance,
    missingFroth,
    thresholdMet
  };
}

/**
 * Calculates the maximum FVIX that can be minted with current FROTH balance
 * 
 * @param frothBalance - Current FROTH balance (in wei)
 * @returns Maximum mintable amount as formatted string
 */
export function getMaxMintableFVIX(frothBalance: bigint): string {
  if (frothBalance < FROTH_THRESHOLD) {
    return "0";
  }
  
  return formatUnits(frothBalance, TOKEN_DECIMALS.FROTH);
}

/**
 * Formats the FROTH threshold for display purposes
 * 
 * @returns FROTH threshold as formatted string (e.g., "10,000")
 */
export function getFrothThresholdFormatted(): string {
  const threshold = formatUnits(FROTH_THRESHOLD, TOKEN_DECIMALS.FROTH);
  return Number(threshold).toLocaleString();
}

/**
 * Utility function to check if amount meets minimum threshold
 * 
 * @param amount - FROTH amount as string
 * @returns Boolean indicating if threshold is met
 */
export function meetsMinimumThreshold(amount: string): boolean {
  const amountWei = parseUnits(amount, TOKEN_DECIMALS.FROTH);
  return amountWei >= FROTH_THRESHOLD;
}

export { FVIX_ABI, FVIX_TOKEN, FROTH_TOKEN, FROTH_THRESHOLD };