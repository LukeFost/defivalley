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
import { useAccount } from 'wagmi';
import { KATANA_TOKENS } from '@/constants/katana-tokens';
import { useWrapETH } from '@/hooks/useWrapETH';
import { useTokenBalance } from '@/hooks/useTokenBalance';

interface MarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Token addresses on Katana
const TOKENS = {
  vbUSDC: KATANA_TOKENS.vbUSDC, // Bridged USDC for Morpho
  vbETH: KATANA_TOKENS.vbETH,   // Bridged ETH
  WETH: KATANA_TOKENS.WETH,     // IWETH on Katana
  AUSDC: KATANA_TOKENS.AgoraUSD, // Agora USD
};

type TabType = 'menu' | 'swap' | 'wrap';

export function MarketplaceModal({ isOpen, onClose }: MarketplaceModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [swapAmount, setSwapAmount] = useState('');
  const [wrapAmount, setWrapAmount] = useState('');
  const [wrapMode, setWrapMode] = useState(true); // true = wrap ETH to WETH, false = unwrap
  const [tokenIn, setTokenIn] = useState<Address>(TOKENS.vbETH);
  const [tokenOut, setTokenOut] = useState<Address>(TOKENS.vbUSDC);
  const { address } = useAccount();
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
    error: wrapError 
  } = useWrapETH();

  // Get token balances
  const { balance: vbEthBalance } = useTokenBalance(TOKENS.vbETH, address);
  const { balance: vbUsdcBalance } = useTokenBalance(TOKENS.vbUSDC, address);
  const { balance: agoraUsdBalance } = useTokenBalance(TOKENS.AUSDC, address);

  // Effect to handle live quotes
  useEffect(() => {
    if (activeTab === 'swap' && swapAmount && parseFloat(swapAmount) > 0) {
      const decimals = (tokenIn === TOKENS.WETH || tokenIn === TOKENS.vbETH) ? 18 : 6;
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

  // Parse swap amount
  const swapAmountBigInt = useMemo(() => {
    if (!swapAmount || parseFloat(swapAmount) <= 0) return BigInt(0);
    try {
      const decimals = (tokenIn === TOKENS.WETH || tokenIn === TOKENS.vbETH) ? 18 : 6;
      return parseUnits(swapAmount, decimals);
    } catch {
      return BigInt(0);
    }
  }, [swapAmount, tokenIn]);

  // Handle approval for SushiSwap
  const handleApprove = async () => {
    if (swapAmountBigInt === BigInt(0)) return;
    try {
      console.log('🍣 Approving token for SushiSwap...');
      await approveToken(tokenIn, swapAmountBigInt);
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
        // console.log('Swap successful:', result.hash);
        setSwapAmount('');
        // Could add success notification here
      }
    } catch (err) {
      // console.error('Swap failed:', err);
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

  const renderMenu = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={() => setActiveTab('swap')}
        >
          <ArrowDownUp className="h-6 w-6" />
          <div className="text-sm">Token Swap</div>
          <div className="text-xs text-muted-foreground">Trade tokens via SushiSwap</div>
        </Button>

        <Button
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={() => setActiveTab('wrap')}
        >
          <RefreshCw className="h-6 w-6" />
          <div className="text-sm">Wrap/Unwrap ETH</div>
          <div className="text-xs text-muted-foreground">Convert ETH ↔ WETH</div>
        </Button>

        <Button
          variant="outline"
          className="h-24 flex-col gap-2 opacity-50 cursor-not-allowed"
          disabled
        >
          <Package className="h-6 w-6" />
          <div className="text-sm">Buy Seeds</div>
          <div className="text-xs text-muted-foreground">Coming soon</div>
        </Button>

        <Button
          variant="outline"
          className="h-24 flex-col gap-2 opacity-50 cursor-not-allowed"
          disabled
        >
          <Coins className="h-6 w-6" />
          <div className="text-sm">Sell Harvest</div>
          <div className="text-xs text-muted-foreground">Coming soon</div>
        </Button>
      </div>
    </div>
  );

  const renderSwap = () => {
    // Get balance for selected token
    const getTokenBalance = (token: Address) => {
      if (token === TOKENS.WETH) return wethBalance;
      if (token === TOKENS.vbETH) return vbEthBalance;
      if (token === TOKENS.vbUSDC) return vbUsdcBalance;
      if (token === TOKENS.AUSDC) return agoraUsdBalance;
      return BigInt(0);
    };

    const getTokenDecimals = (token: Address) => {
      return (token === TOKENS.WETH || token === TOKENS.vbETH) ? 18 : 6;
    };

    const tokenInBalance = getTokenBalance(tokenIn);
    const tokenInDecimals = getTokenDecimals(tokenIn);
    const tokenOutBalance = getTokenBalance(tokenOut);
    const tokenOutDecimals = getTokenDecimals(tokenOut);

    return (
    <div className="grid gap-4 py-4">
      {/* Token In Selection */}
      <div className="grid gap-2">
        <div className="flex justify-between items-center">
          <Label>From</Label>
          <span className="text-sm text-muted-foreground">
            Balance: {formatUnits(tokenInBalance, tokenInDecimals).slice(0, 8)}
          </span>
        </div>
        <select 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={tokenIn}
          onChange={(e) => setTokenIn(e.target.value as Address)}
        >
          <option value={TOKENS.vbETH}>vbETH (Bridged ETH)</option>
          <option value={TOKENS.WETH}>WETH</option>
          <option value={TOKENS.vbUSDC}>vbUSDC (Bridged USDC)</option>
          <option value={TOKENS.AUSDC}>Agora USD</option>
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="amount">Amount</Label>
        <div className="relative">
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={swapAmount}
            onChange={(e) => setSwapAmount(e.target.value)}
            step="0.01"
            min="0"
            className="pr-16"
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
          <Label>To</Label>
          <span className="text-sm text-muted-foreground">
            Balance: {formatUnits(tokenOutBalance, tokenOutDecimals).slice(0, 8)}
          </span>
        </div>
        <select 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={tokenOut}
          onChange={(e) => setTokenOut(e.target.value as Address)}
        >
          <option value={TOKENS.vbUSDC}>vbUSDC (for Morpho deposits)</option>
          <option value={TOKENS.vbETH}>vbETH (Bridged ETH)</option>
          <option value={TOKENS.WETH}>WETH</option>
          <option value={TOKENS.AUSDC}>Agora USD</option>
        </select>
      </div>

      {/* Live Quote Display */}
      {currentQuote && (
        <div className="rounded-lg border bg-muted/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Live Quote</span>
            <div className="flex items-center gap-1">
              {isQuoteStale ? (
                <Clock className="h-3 w-3 text-orange-500" />
              ) : (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {isQuoteStale ? 'Stale' : 'Live'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Expected Output:</span>
              <div className="font-medium">
                {formatUnits(
                  currentQuote.expectedOutput, 
                  (tokenOut === TOKENS.WETH || tokenOut === TOKENS.vbETH) ? 18 : 6
                ).slice(0, 8)} {getTokenName(tokenOut)}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Price Impact:</span>
              <div className={`font-medium ${currentQuote.priceImpact > 5 ? 'text-red-500' : 'text-green-500'}`}>
                {currentQuote.priceImpact.toFixed(2)}%
              </div>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-muted-foreground">
            Updated {new Date(currentQuote.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Approval Status */}
      {tokenIn !== TOKENS.vbETH && swapAmount && parseFloat(swapAmount) > 0 && (
        <div className="rounded-lg border bg-blue-50 dark:bg-blue-900/10 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">SushiSwap Approval</span>
            {isLoadingSushiAllowance ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-sm">
                {(() => {
                  const needsApproval = checkApprovalNeeded(swapAmountBigInt);
                  return needsApproval ? (
                    <span className="text-orange-600">⚠ Approval Required</span>
                  ) : (
                    <span className="text-green-600">✓ Approved</span>
                  );
                })()}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Current allowance: {formatUnits(sushiAllowance, (tokenIn === TOKENS.WETH || tokenIn === TOKENS.vbETH) ? 18 : 6).slice(0, 8)}
          </div>
          <div className="text-xs text-muted-foreground">
            Spender: {routeProcessorAddress}
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
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={swapButtonState.action || (() => {})}
          disabled={swapButtonState.disabled}
          className={`flex-1 ${
            swapButtonState.text === 'Approve for SushiSwap' ? 'bg-orange-500 hover:bg-orange-600' : 
            'bg-primary hover:bg-primary/90'
          }`}
        >
          {(isSushiApproving || isLoading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {swapButtonState.text}
        </Button>
      </div>
    </div>
  );
  };

  const renderWrap = () => (
    <div className="grid gap-4 py-4">
      <div className="flex justify-center mb-2">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setWrapMode(true)}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
              wrapMode
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Wrap ETH
          </button>
          <button
            type="button"
            onClick={() => setWrapMode(false)}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
              !wrapMode
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Unwrap WETH
          </button>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="wrapAmount">
          {wrapMode ? 'ETH Amount to Wrap' : 'WETH Amount to Unwrap'}
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
            className="pr-16"
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

      <div className="text-sm text-muted-foreground text-center">
        {wrapMode 
          ? 'Convert native ETH to WETH (Wrapped ETH) for use in DeFi protocols'
          : 'Convert WETH back to native ETH for gas payments'
        }
      </div>

      {/* Balance Display */}
      <div className="flex justify-between text-sm">
        <div>
          <span className="text-muted-foreground">ETH Balance: </span>
          <span className="font-medium">
            {isLoadingBalances ? '...' : formatEther(ethBalance).slice(0, 8)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">WETH Balance: </span>
          <span className="font-medium">
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
          className="flex-1"
        >
          Back
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
            } catch (err) {
              // console.error('Wrap/unwrap failed:', err);
            }
          }}
          disabled={!address || !wrapAmount || parseFloat(wrapAmount) <= 0 || isWrapping || isUnwrapping}
          className="flex-1"
        >
          {(isWrapping || isUnwrapping) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isWrapping || isUnwrapping 
            ? (isWrapping ? 'Wrapping...' : 'Unwrapping...') 
            : (wrapMode ? 'Wrap ETH' : 'Unwrap WETH')
          }
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Marketplace
          </DialogTitle>
          <DialogDescription>
            {activeTab === 'menu' 
              ? 'Trade items, swap tokens, and manage your farm economy'
              : activeTab === 'swap'
              ? 'Swap your ETH to vbUSDC for Morpho deposits. Use SushiSwap DEX aggregator for best rates.'
              : 'Wrap ETH to WETH or unwrap WETH back to ETH'
            }
          </DialogDescription>
        </DialogHeader>

        {activeTab === 'menu' ? renderMenu() : activeTab === 'swap' ? renderSwap() : renderWrap()}

        {activeTab === 'menu' && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper function to get token display name
function getTokenName(address: Address): string {
  switch (address) {
    case TOKENS.vbUSDC: return 'vbUSDC';
    case TOKENS.vbETH: return 'vbETH';
    case TOKENS.WETH: return 'WETH';
    case TOKENS.AUSDC: return 'Agora USD';
    default: return 'Unknown';
  }
}