"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  useAccount,
  useChainId,
  useWalletClient,
  usePublicClient,
  useReadContract,
} from "wagmi";
import { parseUnits, formatUnits, type Address } from "viem";
import { flowMainnet } from "@/app/lib/networks";
import { FLOW_PROTOCOLS, FLOW_DEFI_CONFIG } from "@/constants/flow-tokens";
import { useTokenAllowance } from "./useTokenAllowance";
import { useUI } from "@/app/store";

interface PunchSwapQuote {
  router: Address;
  tokenInAddress: Address;
  tokenOutAddress: Address;
  amountIn: bigint;
  amountOutMin: bigint;
  expectedOutput: bigint;
  path: Address[];
  priceImpact: number;
  timestamp: number;
  deadline: number;
}

// PunchSwap V2 Router ABI (minimal for swaps)
const PUNCHSWAP_ROUTER_ABI = [
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" }
    ],
    name: "getAmountsOut",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    name: "swapExactTokensForTokens",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    name: "swapExactETHForTokens",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    name: "swapExactTokensForETH",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const PUNCHSWAP_ROUTER = FLOW_PROTOCOLS.PUNCHSWAP_V2_ROUTER;

export function usePunchSwap(tokenInAddress?: Address) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuote, setCurrentQuote] = useState<PunchSwapQuote | null>(null);
  const quoteIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { addNotification } = useUI();

  // Get allowance for the input token to PunchSwap Router
  const {
    checkApprovalNeeded,
    approve,
    isApproving,
    allowance,
    isLoadingAllowance,
    error: allowanceError
  } = useTokenAllowance(tokenInAddress || "0x0000000000000000000000000000000000000000", PUNCHSWAP_ROUTER);

  // Get amounts out from PunchSwap router
  const getAmountsOut = useCallback(
    async (amountIn: bigint, path: Address[]): Promise<bigint[]> => {
      if (!publicClient) return [];
      
      try {
        const amounts = await publicClient.readContract({
          address: PUNCHSWAP_ROUTER,
          abi: PUNCHSWAP_ROUTER_ABI,
          functionName: "getAmountsOut",
          args: [amountIn, path],
        });
        return amounts as bigint[];
      } catch (err) {
        console.error("Failed to get amounts out:", err);
        return [];
      }
    },
    [publicClient]
  );

  const getSwapQuote = async (
    tokenIn: Address,
    tokenOut: Address,
    amount: bigint,
    slippagePercentage: number = 0.5
  ): Promise<PunchSwapQuote | null> => {
    if (!address || chainId !== flowMainnet.id) {
      setError("Please connect to Flow network");
      return null;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Explicitly define the WFLOW address
      const WFLOW_ADDRESS = '0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e' as const;
      const isNativeFlowIn = tokenIn === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

      // Create swap path, ensuring WFLOW is used for native FLOW swaps
      const path = isNativeFlowIn ? [WFLOW_ADDRESS, tokenOut] : [tokenIn, tokenOut];
      
      // Get expected output amounts
      const amounts = await getAmountsOut(amount, path);
      
      if (amounts.length < 2) {
        throw new Error("Invalid swap path or insufficient liquidity");
      }

      const expectedOutput = amounts[1];
      
      // Calculate minimum output with slippage
      const slippageBps = BigInt(Math.floor(slippagePercentage * 100));
      const amountOutMin = expectedOutput - (expectedOutput * slippageBps / BigInt(10000));
      
      // Calculate price impact (simplified)
      const priceImpact = slippagePercentage;
      
      // Set deadline (30 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + FLOW_DEFI_CONFIG.PUNCHSWAP.defaultDeadline;

      const quote: PunchSwapQuote = {
        router: PUNCHSWAP_ROUTER,
        tokenInAddress: tokenIn,
        tokenOutAddress: tokenOut,
        amountIn: amount,
        amountOutMin,
        expectedOutput,
        path,
        priceImpact,
        timestamp: Date.now(),
        deadline,
      };

      setCurrentQuote(quote);
      return quote;
    } catch (err: any) {
      console.error('PunchSwap quote error:', err);
      setError(err.message || "Failed to get swap quote");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const executeSwap = async (quote: PunchSwapQuote) => {
    if (!walletClient || !publicClient || !address) {
      setError("Wallet not connected");
      return null;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Check if this is a native FLOW swap
      const isNativeFlow = quote.tokenInAddress === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
      const isSwapToNative = quote.tokenOutAddress === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

      // Check allowance for ERC20 tokens
      if (!isNativeFlow && tokenInAddress) {
        const needsApproval = checkApprovalNeeded(quote.amountIn);
        if (needsApproval) {
          setError("Token approval required. Please approve the token first.");
          return null;
        }
      }

      let hash: `0x${string}`;

      if (isNativeFlow) {
        // Swap exact ETH for tokens
        hash = await walletClient.writeContract({
          address: PUNCHSWAP_ROUTER,
          abi: PUNCHSWAP_ROUTER_ABI,
          functionName: "swapExactETHForTokens",
          args: [quote.amountOutMin, quote.path, address, BigInt(quote.deadline)],
          value: quote.amountIn,
        });
      } else if (isSwapToNative) {
        // Swap exact tokens for ETH
        hash = await walletClient.writeContract({
          address: PUNCHSWAP_ROUTER,
          abi: PUNCHSWAP_ROUTER_ABI,
          functionName: "swapExactTokensForETH",
          args: [quote.amountIn, quote.amountOutMin, quote.path, address, BigInt(quote.deadline)],
        });
      } else {
        // Swap exact tokens for tokens
        hash = await walletClient.writeContract({
          address: PUNCHSWAP_ROUTER,
          abi: PUNCHSWAP_ROUTER_ABI,
          functionName: "swapExactTokensForTokens",
          args: [quote.amountIn, quote.amountOutMin, quote.path, address, BigInt(quote.deadline)],
        });
      }

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      return {
        hash,
        receipt,
        success: receipt.status === "success",
      };
    } catch (err: any) {
      console.error('Swap execution error:', err);
      
      // Check for user rejection error code
      if (err.code === 4001 || err.cause?.code === 4001) {
        const errorMessage = "Transaction was cancelled by user";
        setError(errorMessage);
        addNotification({
          type: 'warning',
          title: 'Transaction Cancelled',
          message: 'You rejected the transaction in your wallet.'
        });
      } else if (err.message?.includes("User rejected") || err.message?.includes("user rejected")) {
        const errorMessage = "Transaction was cancelled by user";
        setError(errorMessage);
        addNotification({
          type: 'warning',
          title: 'Transaction Cancelled',
          message: 'You rejected the transaction in your wallet.'
        });
      } else {
        const errorMessage = err.shortMessage || err.message || "Failed to execute swap";
        setError(errorMessage);
        addNotification({
          type: 'error',
          title: 'Swap Failed',
          message: errorMessage
        });
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Start live quote updates
  const startLiveQuotes = useCallback(
    (
      tokenIn: Address,
      tokenOut: Address,
      amount: bigint,
      slippagePercentage: number = 0.5
    ) => {
      // Clear existing interval
      if (quoteIntervalRef.current) {
        clearInterval(quoteIntervalRef.current);
      }

      // Get initial quote
      getSwapQuote(tokenIn, tokenOut, amount, slippagePercentage);

      // Set up interval for updates every 10 seconds
      quoteIntervalRef.current = setInterval(() => {
        getSwapQuote(tokenIn, tokenOut, amount, slippagePercentage);
      }, 10000);
    },
    [getSwapQuote]
  );

  // Stop live quote updates
  const stopLiveQuotes = useCallback(() => {
    if (quoteIntervalRef.current) {
      clearInterval(quoteIntervalRef.current);
      quoteIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (quoteIntervalRef.current) {
        clearInterval(quoteIntervalRef.current);
      }
    };
  }, []);

  // Approve token for PunchSwap
  const approveToken = async (tokenAddress: Address, amount: bigint) => {
    if (!tokenAddress || tokenAddress === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
      setError("No approval needed for native FLOW");
      return null;
    }

    try {
      setError(null);
      await approve(amount);
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to approve token");
      return null;
    }
  };

  const swap = async (
    tokenIn: Address,
    tokenOut: Address,
    amount: bigint,
    slippagePercentage: number = 0.5
  ) => {
    const quote = await getSwapQuote(
      tokenIn,
      tokenOut,
      amount,
      slippagePercentage
    );
    if (!quote) return null;

    return await executeSwap(quote);
  };

  return {
    getSwapQuote,
    executeSwap,
    swap,
    isLoading,
    error: error || allowanceError,
    // Live quote functionality
    currentQuote,
    startLiveQuotes,
    stopLiveQuotes,
    isQuoteStale: currentQuote
      ? Date.now() - currentQuote.timestamp > 30000
      : false,
    // Allowance functionality
    approveToken,
    checkApprovalNeeded,
    allowance,
    isApproving,
    isLoadingAllowance,
    routerAddress: PUNCHSWAP_ROUTER,
  };
}