'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShoppingBag, Package, Coins, ArrowDownUp, Loader2, AlertCircle, RefreshCw, Clock, CheckCircle } from 'lucide-react';
import { useSushiSwap } from '@/hooks/useSushiSwap';
import { parseUnits, formatUnits, formatEther, type Address } from 'viem';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAccount, useChainId } from 'wagmi';
import { KATANA_TOKENS } from '@/constants/katana-tokens';
import { BASE_TOKENS, BASE_CHAIN_ID } from '@/constants/base-tokens';
import { useWrapETH } from '@/hooks/useWrapETH';
import { useTokenBalance } from '@/hooks/useTokenBalance';

interface MarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Network-specific token configurations
const getNetworkTokens = (chainId: number) => {
  if (chainId === BASE_CHAIN_ID) {
    // Base network tokens - only WETH and USDC
    return {
      WETH: BASE_TOKENS.WETH,
      USDC: BASE_TOKENS.USDC,
      // No vbWETH or vbUSDC on Base
    };
  } else {
    // Katana network tokens
    return {
      vbUSDC: KATANA_TOKENS.vbUSDC, // Bridged USDC for Morpho
      vbETH: KATANA_TOKENS.vbETH,   // Bridged ETH
      WETH: KATANA_TOKENS.WETH,     // IWETH on Katana
      AUSDC: KATANA_TOKENS.AgoraUSD, // Agora USD
    };
  }
};

type TabType = 'menu' | 'swap' | 'wrap';

export function MarketplaceModal({ isOpen, onClose }: MarketplaceModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [swapAmount, setSwapAmount] = useState('');
  const [wrapAmount, setWrapAmount] = useState('');
  const [wrapMode, setWrapMode] = useState(true); // true = wrap ETH to WETH, false = unwrap
  const [customAddress, setCustomAddress] = useState('');
  const [showCustomAddress, setShowCustomAddress] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const { address } = useAccount();
  const chainId = useChainId();
  
  // Get network-specific tokens
  const TOKENS = getNetworkTokens(chainId);
  const isBaseNetwork = chainId === BASE_CHAIN_ID;
  
  // Initialize token pair based on network
  const [tokenIn, setTokenIn] = useState<Address>(
    isBaseNetwork ? TOKENS.WETH : (TOKENS as any).vbETH
  );
  const [tokenOut, setTokenOut] = useState<Address>(
    isBaseNetwork ? TOKENS.USDC : (TOKENS as any).vbUSDC
  );
  // Helper function to get token decimals
  const getTokenDecimals = (token: Address) => {
    if (isBaseNetwork) {
      if (token === TOKENS.WETH) return 18;
      if (token === TOKENS.USDC) return 6;
      // Custom tokens default to 18
      return 18;
    }
    return (token === TOKENS.WETH || token === (TOKENS as any).vbETH) ? 18 : 6;
  };

  const { 
    swap, 
    isLoading, 
    error, 
    currentQuote, 
    startLiveQuotes, 
    stopLiveQuotes, 
    isQuoteStale,
    approveToken,
    checkApprovalNeeded,
    allowance: sushiAllowance,
    isApproving: isSushiApproving,
    isLoadingAllowance: isLoadingSushiAllowance,
    routeProcessorAddress
  } = useSushiSwap(tokenIn);
  
  const { 
    ethBalance, 
    wethBalance, 
    wrapETH, 
    unwrapWETH, 
    isWrapping, 
    isUnwrapping,
    isLoadingBalances,
    error: wrapError,
    refetchETH,
    refetchVbETH
  } = useWrapETH();

  // Get token balances (network-aware)
  const { balance: vbEthBalance, refetch: refetchVbEthBalance } = useTokenBalance(
    isBaseNetwork ? undefined : (TOKENS as any).vbETH, 
    address
  );
  const { balance: vbUsdcBalance, refetch: refetchVbUsdcBalance } = useTokenBalance(
    isBaseNetwork ? TOKENS.USDC : (TOKENS as any).vbUSDC, 
    address
  );
  const { balance: agoraUsdBalance, refetch: refetchAgoraUsdBalance } = useTokenBalance(
    isBaseNetwork ? undefined : (TOKENS as any).AUSDC, 
    address
  );

  // Effect to handle live quotes
  useEffect(() => {
    if (activeTab === 'swap' && swapAmount && parseFloat(swapAmount) > 0) {
      const decimals = getTokenDecimals(tokenIn);
      const amount = parseUnits(swapAmount, decimals);
      console.log("Starting live quotes with amount:", amount.toString());
      startLiveQuotes(tokenIn, tokenOut, amount, 0.5);
    } else {
      stopLiveQuotes();
    }

    // Cleanup on tab change or component unmount
    return () => {
      stopLiveQuotes();
    };
  }, [activeTab, swapAmount, tokenIn, tokenOut]);

  // Debug effect to log currentQuote changes
  useEffect(() => {
    console.log("Current quote in MarketplaceModal:", currentQuote);
  }, [currentQuote]);

  // Clear quote when tokens change
  useEffect(() => {
    stopLiveQuotes();
  }, [tokenIn, tokenOut]);

  // Refresh balances when tokens change
  useEffect(() => {
    if (address) {
      console.log('🔄 Token selection changed, refreshing balances...');
      refreshAllBalances();
    }
  }, [tokenIn, tokenOut, address]);

  // Parse swap amount
  const swapAmountBigInt = useMemo(() => {
    if (!swapAmount || parseFloat(swapAmount) <= 0) return BigInt(0);
    try {
      const decimals = getTokenDecimals(tokenIn);
      return parseUnits(swapAmount, decimals);
    } catch {
      return BigInt(0);
    }
  }, [swapAmount, tokenIn]);

  // Debug effect to log approval state changes
  useEffect(() => {
    console.log("Approval state:", {
      isApproving: isSushiApproving,
      allowance: sushiAllowance.toString(),
      needsApproval: swapAmountBigInt > 0 ? checkApprovalNeeded(swapAmountBigInt) : false
    });
  }, [isSushiApproving, sushiAllowance, swapAmountBigInt, checkApprovalNeeded]);

  // Function to refresh all token balances
  const refreshAllBalances = async () => {
    console.log('🔄 Refreshing all token balances...');
    try {
      await Promise.all([
        refetchVbEthBalance(),
        refetchVbUsdcBalance(),
        refetchAgoraUsdBalance(),
        refetchETH(),
        refetchVbETH()
      ]);
      console.log('✅ All balances refreshed');
    } catch (error) {
      console.error('Error refreshing balances:', error);
    }
  };

  // Handle approval for SushiSwap
  const handleApprove = async () => {
    if (swapAmountBigInt === BigInt(0)) return;
    try {
      console.log('🍣 Approving token for SushiSwap...', {
        tokenIn,
        amount: swapAmountBigInt.toString(),
        currentAllowance: sushiAllowance.toString()
      });
      const result = await approveToken(tokenIn, swapAmountBigInt);
      console.log('🍣 Approval result:', result);
    } catch (err) {
      console.error('Approval error:', err);
    }
  };

  // Handle swap (only called when approval is sufficient)
  const handleSwap = async () => {
    if (swapAmountBigInt === BigInt(0)) return;

    try {
      console.log('🍣 Executing swap via SushiSwap...');
      const result = await swap(tokenIn, tokenOut, swapAmountBigInt);
      
      if (result?.success) {
        console.log('Swap successful:', result.hash);
        setSwapAmount('');
        // Refresh all token balances after successful swap
        await refreshAllBalances();
        // Could add success notification here
      }
    } catch (err) {
      console.error('Swap failed:', err);
    }
  };

  // Determine button state and action (inspired by Morpho pattern)
  const getSwapButtonState = () => {
    if (!address) {
      return { text: 'Connect Wallet', disabled: true, action: null };
    }
    
    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      return { text: 'Enter Amount', disabled: true, action: null };
    }

    // Check if this is native ETH (no approval needed)
    // vbETH is an ERC20 token, not native ETH
    const isNativeETH = false; // No native ETH tokens in our token list

    if (isSushiApproving) {
      return { text: 'Approving...', disabled: true, action: null };
    }

    // Check if approval is needed for ERC20 tokens
    if (!isNativeETH && swapAmountBigInt > 0) {
      const needsApproval = checkApprovalNeeded(swapAmountBigInt);
      if (needsApproval) {
        return { text: 'Approve for SushiSwap', disabled: false, action: handleApprove };
      }
    }

    if (isLoading) {
      return { text: 'Swapping...', disabled: true, action: null };
    }

    return { text: 'Swap', disabled: false, action: handleSwap };
  };

  const swapButtonState = getSwapButtonState();

  // Helper function to get token display name
  const getTokenName = (address: Address): string => {
    if (isBaseNetwork) {
      if (address === TOKENS.WETH) return 'WETH';
      if (address === TOKENS.USDC) return 'USDC';
      return 'Custom Token';
    } else {
      if (address === (TOKENS as any).vbUSDC) return 'vbUSDC';
      if (address === (TOKENS as any).vbETH) return 'vbETH';
      if (address === TOKENS.WETH) return 'WETH';
      if (address === (TOKENS as any).AUSDC) return 'Agora USD';
      return 'Unknown';
    }
  };

  // Handle cat click for flip animation
  const handleCatClick = () => {
    setIsFlipping(true);
    setTimeout(() => setIsFlipping(false), 1000); // Reset after animation
  };

  const renderMenu = () => (
    <div className="grid gap-4 py-4">
      <div className="text-center mb-2">
        <h3 className="text-lg font-semibold text-amber-900">Cat Merchant's Wares</h3>
        <p className="text-sm text-amber-700">*purrs* What can I trade for you today?</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-24 flex-col gap-2 border-amber-400 hover:bg-amber-100 hover:border-amber-500"
          onClick={() => setActiveTab('swap')}
        >
          <ArrowDownUp className="h-6 w-6 text-amber-600" />
          <div className="text-sm text-amber-900">Token Exchange</div>
          <div className="text-xs text-amber-700">Trade magical tokens</div>
        </Button>

        <Button
          variant="outline"
          className="h-24 flex-col gap-2 border-amber-400 hover:bg-amber-100 hover:border-amber-500"
          onClick={() => setActiveTab('wrap')}
        >
          <RefreshCw className="h-6 w-6 text-amber-600" />
          <div className="text-sm text-amber-900">Essence Wrapping</div>
          <div className="text-xs text-amber-700">Transform ETH essence</div>
        </Button>

        <Button
          variant="outline"
          className="h-24 flex-col gap-2 border-amber-300 bg-amber-50 opacity-60 cursor-not-allowed"
          disabled
        >
          <Package className="h-6 w-6 text-amber-500" />
          <div className="text-sm text-amber-700">Mystical Seeds</div>
          <div className="text-xs text-amber-600">*yawns* Later...</div>
        </Button>

        <Button
          variant="outline"
          className="h-24 flex-col gap-2 border-amber-300 bg-amber-50 opacity-60 cursor-not-allowed"
          disabled
        >
          <Coins className="h-6 w-6 text-amber-500" />
          <div className="text-sm text-amber-700">Harvest Exchange</div>
          <div className="text-xs text-amber-600">*stretches* Soon...</div>
        </Button>
      </div>
    </div>
  );

  const renderSwap = () => {
    // Validate if address is a valid Ethereum address
    const isValidAddress = (addr: string): boolean => {
      return /^0x[a-fA-F0-9]{40}$/.test(addr);
    };

    // Get balance for selected token
    const getTokenBalance = (token: Address) => {
      if (!isBaseNetwork) {
        if (token === TOKENS.WETH) return wethBalance;
        if (token === (TOKENS as any).vbETH) return vbEthBalance;
        if (token === (TOKENS as any).vbUSDC) return vbUsdcBalance;
        if (token === (TOKENS as any).AUSDC) return agoraUsdBalance;
      } else {
        // Base network
        if (token === TOKENS.WETH) return wethBalance;
        if (token === TOKENS.USDC) return vbUsdcBalance; // Using same hook for USDC
      }
      return BigInt(0);
    };


    const tokenInBalance = getTokenBalance(tokenIn);
    const tokenInDecimals = getTokenDecimals(tokenIn);
    const tokenOutBalance = getTokenBalance(tokenOut);
    const tokenOutDecimals = getTokenDecimals(tokenOut);

    return (
    <div className="grid gap-4 py-4">
      <div className="text-center mb-2">
        <h3 className="text-lg font-semibold text-amber-900">Token Exchange Ritual</h3>
        <p className="text-sm text-amber-700">*meows knowingly* Choose your tokens wisely...</p>
      </div>
      {/* Token In Selection */}
      <div className="grid gap-2">
        <div className="flex justify-between items-center">
          <Label className="text-amber-900">Trade Away</Label>
          <span className="text-sm text-amber-700">
            You Have: {formatUnits(tokenInBalance, tokenInDecimals).slice(0, 8)}
          </span>
        </div>
        {isBaseNetwork ? (
          <div className="space-y-2">
            <select 
              className="flex h-10 w-full rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900 focus:border-amber-500"
              value={showCustomAddress ? 'custom' : tokenIn}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setShowCustomAddress(true);
                } else {
                  setShowCustomAddress(false);
                  setTokenIn(e.target.value as Address);
                }
              }}
            >
              <option value={TOKENS.WETH}>Wrapped Ether (WETH)</option>
              <option value={TOKENS.USDC}>USD Coin (USDC)</option>
              <option value="custom">Custom Address...</option>
            </select>
            {showCustomAddress && (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="0x..."
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  className="text-xs border-amber-400 bg-amber-50"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (isValidAddress(customAddress)) {
                      setTokenIn(customAddress as Address);
                      setShowCustomAddress(false);
                    }
                  }}
                  disabled={!isValidAddress(customAddress)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                >
                  Use
                </Button>
              </div>
            )}
          </div>
        ) : (
          <select 
            className="flex h-10 w-full rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900 focus:border-amber-500"
            value={tokenIn}
            onChange={(e) => setTokenIn(e.target.value as Address)}
          >
            <option value={(TOKENS as any).vbETH}>Ethereal Essence (vbETH)</option>
            <option value={TOKENS.WETH}>Wrapped Ether (WETH)</option>
            <option value={(TOKENS as any).vbUSDC}>Stable Coins (vbUSDC)</option>
            <option value={(TOKENS as any).AUSDC}>Golden Currency (Agora USD)</option>
          </select>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="amount" className="text-amber-900">Amount to Trade</Label>
        <div className="relative">
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={swapAmount}
            onChange={(e) => setSwapAmount(e.target.value)}
            step="0.01"
            min="0"
            className="pr-16 border-amber-400 bg-amber-50 text-amber-900 placeholder:text-amber-600 focus:border-amber-500"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (tokenInBalance > BigInt(0)) {
                const formattedBalance = formatUnits(tokenInBalance, tokenInDecimals);
                setSwapAmount(formattedBalance);
              }
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
          >
            MAX
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Simple token flip
            const temp = tokenIn;
            setTokenIn(tokenOut);
            setTokenOut(temp);
          }}
        >
          <ArrowDownUp className="h-4 w-4" />
        </Button>
      </div>

      {/* Token Out Selection */}
      <div className="grid gap-2">
        <div className="flex justify-between items-center">
          <Label className="text-amber-900">Receive</Label>
          <span className="text-sm text-amber-700">
            You Have: {formatUnits(tokenOutBalance, tokenOutDecimals).slice(0, 8)}
          </span>
        </div>
        {isBaseNetwork ? (
          <select 
            className="flex h-10 w-full rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900 focus:border-amber-500"
            value={tokenOut}
            onChange={(e) => setTokenOut(e.target.value as Address)}
          >
            <option value={TOKENS.USDC}>USD Coin (USDC)</option>
            <option value={TOKENS.WETH}>Wrapped Ether (WETH)</option>
          </select>
        ) : (
          <select 
            className="flex h-10 w-full rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900 focus:border-amber-500"
            value={tokenOut}
            onChange={(e) => setTokenOut(e.target.value as Address)}
          >
            <option value={(TOKENS as any).vbUSDC}>Stable Coins (for magical deposits)</option>
            <option value={(TOKENS as any).vbETH}>Ethereal Essence (vbETH)</option>
            <option value={TOKENS.WETH}>Wrapped Ether (WETH)</option>
            <option value={(TOKENS as any).AUSDC}>Golden Currency (Agora USD)</option>
          </select>
        )}
      </div>

      {/* Live Quote Display */}
      {currentQuote && (
        <div className="rounded-lg border border-amber-400 bg-amber-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-amber-900">Cat's Price Oracle</span>
            <div className="flex items-center gap-1">
              {isQuoteStale ? (
                <Clock className="h-3 w-3 text-orange-600" />
              ) : (
                <CheckCircle className="h-3 w-3 text-green-600" />
              )}
              <span className="text-xs text-amber-700">
                {isQuoteStale ? '*sleepy*' : '*alert*'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-amber-700">You'll Receive:</span>
              <div className="font-medium text-amber-900">
                {formatUnits(
                  currentQuote.expectedOutput, 
                  getTokenDecimals(tokenOut)
                ).slice(0, 8)} {getTokenName(tokenOut)}
              </div>
            </div>
            <div>
              <span className="text-amber-700">Trade Cost:</span>
              <div className={`font-medium ${currentQuote.priceImpact > 5 ? 'text-red-600' : 'text-green-600'}`}>
                {currentQuote.priceImpact.toFixed(2)}%
              </div>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-amber-600">
            Last updated: {new Date(currentQuote.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Approval Status */}
      {tokenIn !== TOKENS.vbETH && swapAmount && parseFloat(swapAmount) > 0 && (
        <div className="rounded-lg border border-amber-400 bg-amber-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-900">Cat's Trading License</span>
            {isLoadingSushiAllowance ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
            ) : (
              <span className="text-sm">
                {(() => {
                  const needsApproval = checkApprovalNeeded(swapAmountBigInt);
                  return needsApproval ? (
                    <span className="text-orange-600">⚠ Permission Needed</span>
                  ) : (
                    <span className="text-green-600">✓ Ready to Trade</span>
                  );
                })()}
              </span>
            )}
          </div>
          <div className="text-xs text-amber-700 mt-1">
            Current permission: {formatUnits(sushiAllowance, (tokenIn === TOKENS.WETH || tokenIn === TOKENS.vbETH) ? 18 : 6).slice(0, 8)}
          </div>
          <div className="text-xs text-amber-600">
            Trading through: {routeProcessorAddress}
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setActiveTab('menu')}
          className="flex-1 border-amber-400 text-amber-900 hover:bg-amber-100"
        >
          Back to Shop
        </Button>
        <Button
          onClick={swapButtonState.action || (() => {})}
          disabled={swapButtonState.disabled}
          className={`flex-1 ${
            swapButtonState.text === 'Approve for SushiSwap' ? 'bg-orange-500 hover:bg-orange-600' : 
            'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
        >
          {(isSushiApproving || isLoading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {swapButtonState.text === 'Approve for SushiSwap' ? 'Get Permission' : 
           swapButtonState.text === 'Swap' ? 'Trade with Cat' : 
           swapButtonState.text}
        </Button>
      </div>
    </div>
  );
  };

  const renderWrap = () => (
    <div className="grid gap-4 py-4">
      <div className="text-center mb-2">
        <h3 className="text-lg font-semibold text-amber-900">Essence Transformation</h3>
        <p className="text-sm text-amber-700">*purrs mystically* Let me wrap your ethereal energies...</p>
      </div>
      <div className="flex justify-center mb-2">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setWrapMode(true)}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
              wrapMode
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-50 text-amber-900 border-amber-400 hover:bg-amber-100'
            }`}
          >
            Wrap ETH
          </button>
          <button
            type="button"
            onClick={() => setWrapMode(false)}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
              !wrapMode
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-50 text-amber-900 border-amber-400 hover:bg-amber-100'
            }`}
          >
            Unwrap WETH
          </button>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="wrapAmount" className="text-amber-900">
          {wrapMode ? 'ETH Essence to Wrap' : 'WETH Essence to Unwrap'}
        </Label>
        <div className="relative">
          <Input
            id="wrapAmount"
            type="number"
            placeholder="0.00"
            value={wrapAmount}
            onChange={(e) => setWrapAmount(e.target.value)}
            step="0.01"
            min="0"
            className="pr-16 border-amber-400 bg-amber-50 text-amber-900 placeholder:text-amber-600 focus:border-amber-500"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const maxAmount = wrapMode ? ethBalance : wethBalance;
              if (maxAmount) {
                // Leave a small amount for gas if wrapping ETH
                const adjustedAmount = wrapMode 
                  ? (Number(formatEther(maxAmount)) * 0.99).toFixed(6)
                  : formatEther(maxAmount);
                setWrapAmount(adjustedAmount);
              }
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
          >
            MAX
          </Button>
        </div>
      </div>

      <div className="text-sm text-amber-700 text-center italic">
        {wrapMode 
          ? '*meows softly* Transform your raw ETH into wrapped essence for magical protocols'
          : '*stretches paws* Unwrap your essence back to pure ETH for gas rituals'
        }
      </div>

      {/* Balance Display */}
      <div className="flex justify-between text-sm">
        <div>
          <span className="text-amber-700">ETH Essence: </span>
          <span className="font-medium text-amber-900">
            {isLoadingBalances ? '...' : formatEther(ethBalance).slice(0, 8)}
          </span>
        </div>
        <div>
          <span className="text-amber-700">WETH Essence: </span>
          <span className="font-medium text-amber-900">
            {isLoadingBalances ? '...' : formatEther(wethBalance).slice(0, 8)}
          </span>
        </div>
      </div>

      {(error || wrapError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || wrapError}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setActiveTab('menu')}
          className="flex-1 border-amber-400 text-amber-900 hover:bg-amber-100"
        >
          Back to Shop
        </Button>
        <Button
          onClick={async () => {
            try {
              if (wrapMode) {
                await wrapETH(wrapAmount);
              } else {
                await unwrapWETH(wrapAmount);
              }
              setWrapAmount('');
              // Refresh balances after successful wrap/unwrap
              await refreshAllBalances();
            } catch (err) {
              console.error('Wrap/unwrap failed:', err);
            }
          }}
          disabled={!address || !wrapAmount || parseFloat(wrapAmount) <= 0 || isWrapping || isUnwrapping}
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
        >
          {(isWrapping || isUnwrapping) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isWrapping || isUnwrapping 
            ? (isWrapping ? '*transforming...*' : '*unwrapping...*') 
            : (wrapMode ? 'Transform Essence' : 'Release Essence')
          }
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Custom CSS for cat animations */}
      <style jsx>{`
        @keyframes levitate {
          0%, 100% {
            transform: translateY(0px) translateX(-50%);
          }
          25% {
            transform: translateY(-25px) translateX(-50%);
          }
          50% {
            transform: translateY(-30px) translateX(-50%);
          }
          75% {
            transform: translateY(-25px) translateX(-50%);
          }
        }
        
        @keyframes flip {
          0% {
            transform: translateY(-20px) translateX(-50%) rotateY(0deg);
          }
          25% {
            transform: translateY(-60px) translateX(-50%) rotateY(90deg);
          }
          50% {
            transform: translateY(-80px) translateX(-50%) rotateY(180deg);
          }
          75% {
            transform: translateY(-60px) translateX(-50%) rotateY(270deg);
          }
          100% {
            transform: translateY(-20px) translateX(-50%) rotateY(360deg);
          }
        }
        
        .cat-container {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .cat-container:hover {
          filter: brightness(1.1);
        }
      `}</style>
      
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[1200px] p-0 bg-transparent border-0 shadow-none">
        {/* Shop Interior Background - 2.5x larger */}
        <div 
          className="relative w-full h-[1000px] bg-cover bg-center bg-no-repeat rounded-lg overflow-hidden"
          style={{
            backgroundImage: 'url(/shop_inside.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Euler Cat - sandwiched between background and foreground - 2x larger and higher with enhanced levitation */}
          <div 
            className="absolute top-[30%] left-[50%] transform -translate-x-1/2 w-64 h-64 bg-contain bg-no-repeat z-10 cat-container"
            onClick={handleCatClick}
            style={{
              backgroundImage: 'url(/euler_cat.png)',
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              animation: isFlipping 
                ? 'flip 1s ease-in-out' 
                : 'levitate 4s ease-in-out infinite'
            }}
          />
          
          {/* Shop Foreground - sits in front of the cat */}
          <div 
            className="absolute inset-0 w-full h-full bg-contain bg-no-repeat z-15 pointer-events-none"
            style={{
              backgroundImage: 'url(/shop_forground.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          
          {/* Overlay for better content readability */}
          <div className="absolute inset-0 bg-black/15 backdrop-blur-[0.5px] z-16" />
          
          {/* Dialog Content */}
          <div className="relative z-20 p-8 h-full flex flex-col">
            <DialogHeader className="mb-6">
              <DialogTitle className="flex items-center gap-2 text-amber-900 text-2xl font-bold drop-shadow-md">
                <ShoppingBag className="h-8 w-8 text-amber-700" />
                Euler Cat's Trading Post
              </DialogTitle>
              <DialogDescription className="text-amber-800 font-medium drop-shadow-sm text-lg">
                {activeTab === 'menu' 
                  ? 'Welcome! The Euler Cat has rare DeFi tokens for trade.'
                  : activeTab === 'swap'
                  ? 'Trade your tokens with the mystical Euler Cat using ancient swap magic.'
                  : 'Transform your ethereal currencies with the Euler Cat\'s magical wrapping powers.'
                }
              </DialogDescription>
            </DialogHeader>

            {/* Spacer to position content below the table */}
            <div className="flex-1" />

            {/* Content Area positioned below the table in the shop - text-like appearance */}
            <div className="bg-amber-50/95 backdrop-blur-sm rounded-lg border-2 border-amber-500 shadow-lg p-6 max-h-[500px] overflow-y-auto text-left">
              {activeTab === 'menu' ? renderMenu() : activeTab === 'swap' ? renderSwap() : renderWrap()}
            </div>

            {activeTab === 'menu' && (
              <div className="flex justify-end mt-6">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200 shadow-md text-lg px-6 py-3"
                >
                  Leave Shop
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

// Helper function to get token display name
// This function needs to be moved inside the component
// It will be replaced with a proper implementation inside the component