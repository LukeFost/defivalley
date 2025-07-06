import { parseUnits, formatUnits, type Address } from 'viem';
import { 
  FLOW_TOKEN, 
  FROTH_TOKEN, 
  PUNCHSWAP_V2_ROUTER, 
  SWAP_PATHS, 
  TOKEN_DECIMALS 
} from '../../../../packages/contracts/flow/constants';

// PunchSwap V2 Router ABI (minimal interface for swapping)
const PUNCHSWAP_V2_ABI = [
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' }
    ],
    name: 'getAmountsOut',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export interface SwapParams {
  amountIn: string; // FLOW amount as string (e.g., "100")
  amountOutMin?: string; // Optional minimum FROTH output (for slippage protection)
  recipient: Address; // Recipient address
  slippage?: number; // Slippage tolerance (default: 0.5%)
}

export interface SwapResult {
  txData: {
    address: Address;
    abi: typeof PUNCHSWAP_V2_ABI;
    functionName: 'swapExactTokensForTokens';
    args: readonly [bigint, bigint, readonly Address[], Address, bigint];
  };
  estimatedOutput: bigint;
  minimumOutput: bigint;
  deadline: bigint;
}

/**
 * Prepares a FLOW → FROTH swap transaction using PunchSwap V2 Router
 * 
 * @param params - Swap parameters including amount and recipient
 * @returns Transaction data for use with wagmi/viem writeContract
 */
export async function swapExactFLOWForTokens(
  params: SwapParams,
  getAmountsOut: (amountIn: bigint, path: readonly Address[]) => Promise<readonly bigint[]>
): Promise<SwapResult> {
  const { amountIn, recipient, slippage = 0.5 } = params;
  
  // Parse input amount (FLOW has 18 decimals)
  const amountInWei = parseUnits(amountIn, TOKEN_DECIMALS.FLOW);
  
  // Get estimated output amounts from router
  const amounts = await getAmountsOut(amountInWei, SWAP_PATHS.FLOW_TO_FROTH);
  const estimatedOutput = amounts[1]; // FROTH amount (second in path)
  
  // Calculate minimum output with slippage protection
  const slippageBps = BigInt(Math.floor(slippage * 100)); // Convert to basis points
  const minimumOutput = estimatedOutput * (10000n - slippageBps) / 10000n;
  
  // Use provided minimum or calculated minimum
  const amountOutMin = params.amountOutMin 
    ? parseUnits(params.amountOutMin, TOKEN_DECIMALS.FROTH)
    : minimumOutput;
  
  // Set deadline to 20 minutes from now
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
  
  return {
    txData: {
      address: PUNCHSWAP_V2_ROUTER,
      abi: PUNCHSWAP_V2_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [
        amountInWei,
        amountOutMin,
        SWAP_PATHS.FLOW_TO_FROTH,
        recipient,
        deadline
      ] as const
    },
    estimatedOutput,
    minimumOutput: amountOutMin,
    deadline
  };
}

/**
 * Estimates FROTH output for a given FLOW input amount
 * 
 * @param amountIn - FLOW amount as string
 * @param getAmountsOut - Function to get amounts out from router
 * @returns Estimated FROTH output as formatted string
 */
export async function estimateFROTHOutput(
  amountIn: string,
  getAmountsOut: (amountIn: bigint, path: readonly Address[]) => Promise<readonly bigint[]>
): Promise<string> {
  const amountInWei = parseUnits(amountIn, TOKEN_DECIMALS.FLOW);
  const amounts = await getAmountsOut(amountInWei, SWAP_PATHS.FLOW_TO_FROTH);
  const frothOutput = amounts[1];
  
  return formatUnits(frothOutput, TOKEN_DECIMALS.FROTH);
}

/**
 * Utility function to check if FLOW balance is sufficient for swap
 * 
 * @param flowBalance - Current FLOW balance (in wei)
 * @param amountIn - Desired swap amount as string
 * @returns Boolean indicating if balance is sufficient
 */
export function hasInsufficientBalance(flowBalance: bigint, amountIn: string): boolean {
  const amountInWei = parseUnits(amountIn, TOKEN_DECIMALS.FLOW);
  return flowBalance < amountInWei;
}

export { PUNCHSWAP_V2_ABI, PUNCHSWAP_V2_ROUTER, FLOW_TOKEN, FROTH_TOKEN };