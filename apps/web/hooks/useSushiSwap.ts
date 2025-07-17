"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  useAccount,
  useChainId,
  useWalletClient,
  usePublicClient,
} from "wagmi";
import { parseUnits, formatUnits, type Address } from "viem";
import { katanaChain } from "@/app/wagmi";
import { useTokenAllowance } from "./useTokenAllowance";

interface SwapQuote {
  routeProcessor: Address;
  routeCode: `0x${string}`;
  value: bigint;
  tokenInAddress: Address;
  tokenOutAddress: Address;
  amountIn: bigint;
  amountOutMin: bigint;
  gasLimit: bigint;
  // Live quote data
  expectedOutput: bigint;
  priceImpact: number;
  timestamp: number;
  // Raw transaction data from Sushi API
  tx?: {
    to: Address;
    data: `0x${string}`;
    value: string;
    gas?: string;
    from?: Address;
  };
}

// SushiSwap RouteProcessor address
const SUSHI_ROUTE_PROCESSOR = "0xAC4c6e212A361c968F1725b4d055b47E63F80b75" as Address;

export function useSushiSwap(tokenInAddress?: Address) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuote, setCurrentQuote] = useState<SwapQuote | null>(null);
  const quoteIntervalRef = useRef<number | null>(null);

  // Get allowance for the input token to SushiSwap RouteProcessor
  const {
    checkApprovalNeeded,
    approve,
    isApproving,
    allowance,
    isLoadingAllowance,
    error: allowanceError
  } = useTokenAllowance(tokenInAddress || "0x0000000000000000000000000000000000000000", SUSHI_ROUTE_PROCESSOR);

  const getSwapQuote = async (
    tokenIn: Address,
    tokenOut: Address,
    amount: bigint,
    slippagePercentage: number = 0.5
  ): Promise<SwapQuote | null> => {
    if (!address) {
      setError("Wallet not connected");
      return null;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Use Katana chain ID if on Katana, otherwise use current chain
      const swapChainId = chainId === katanaChain.id ? katanaChain.id : chainId;
      console.log(swapChainId, "swapChainId");
      const apiKey = process.env.NEXT_PUBLIC_SUSHI_API || "";
      const url = `https://api.sushi.com/swap/v7/${swapChainId}`;
      console.log(url, "SushiSwap API URL");
      // Build URL with search params (official Sushi way)
      const SWAP_API_URL = new URL(url);
      const { searchParams } = SWAP_API_URL;
      searchParams.set('tokenIn', tokenIn);
      searchParams.set('tokenOut', tokenOut);
      searchParams.set('amount', amount.toString());
      searchParams.set('maxSlippage', slippagePercentage.toString());
      searchParams.set('sender', address);
      
      // Add API key as URL parameter if available
      if (apiKey) {
        searchParams.set('apiKey', apiKey);
      }

      console.log("Sushi API URL:", SWAP_API_URL.toString());
      
      const response = await fetch(SWAP_API_URL.toString(), {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("SushiSwap API response status:", response.status);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to get swap quote");
      }

      const data = await response.json();
      console.log("SushiSwap API response data:", data);
      if (data.status !== "Success") {
        throw new Error(data.message || "Invalid swap route");
      }

      // Store the raw transaction data from Sushi API (official pattern)
      const quote = {
        routeProcessor: data.routeProcessor || data.tx?.to,
        routeCode: data.tx?.data,
        value: BigInt(data.tx?.value || 0),
        tokenInAddress: tokenIn,
        tokenOutAddress: tokenOut,
        amountIn: amount,
        amountOutMin: BigInt(data.assumedAmountOut || data.route?.amountOutMin || 0),
        gasLimit: BigInt(data.tx?.gas || data.gasSpent || 500000),
        // Live quote data
        expectedOutput: BigInt(data.assumedAmountOut || data.route?.amountOut || data.route?.amountOutMin || 0),
        priceImpact: data.priceImpact || data.route?.priceImpact || 0,
        timestamp: Date.now(),
        // Store raw tx data for execution (official Sushi pattern)
        tx: data.tx,
      };

      setCurrentQuote(quote);
      console.log("Quote set:", quote);
      return quote;
    } catch (err: any) {
      // console.error('SushiSwap quote error:', err);
      setError(err.message || "Failed to get swap quote");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const executeSwap = async (quote: SwapQuote) => {
    if (!walletClient || !publicClient || !address) {
      setError("Wallet not connected");
      return null;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Check if this is a native ETH swap (no approval needed)
      // Note: vbETH is an ERC20 token, not native ETH
      const isNativeETH = quote.tokenInAddress === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

      // Check allowance for ERC20 tokens
      if (!isNativeETH && tokenInAddress) {
        const needsApproval = checkApprovalNeeded(quote.amountIn);
        if (needsApproval) {
          setError("Token approval required. Please approve the token first.");
          return null;
        }
      }

      // Use the transaction data directly from SushiSwap API (official Sushi pattern)
      const { tx } = currentQuote || quote;
      const hash = await walletClient.sendTransaction({
        to: tx?.to || quote.routeProcessor,
        data: tx?.data || quote.routeCode,
        value: tx?.value ? BigInt(tx.value) : quote.value,
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      return {
        hash,
        receipt,
        success: receipt.status === "success",
      };
    } catch (err: any) {
      // console.error('Swap execution error:', err);
      setError(err.message || "Failed to execute swap");
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
      }, 6000);
    },
    []
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

  // Approve token for SushiSwap
  const approveToken = async (tokenAddress: Address, amount: bigint) => {
    if (!tokenAddress || tokenAddress === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
      setError("No approval needed for native ETH");
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
    routeProcessorAddress: SUSHI_ROUTE_PROCESSOR,
  };
}

