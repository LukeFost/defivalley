'use client';

import { useState, useEffect } from 'react';
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
import { Coins, PiggyBank, TrendingUp, Loader2, AlertCircle, CheckCircle, Waves, ArrowDownUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAccount, useChainId } from 'wagmi';
import { formatUnits, parseUnits, type Address } from 'viem';
import { BASE_CHAIN_ID, BASE_TOKENS } from '@/constants/base-tokens';
import { useVaultFinder } from '@/hooks/useVaultFinder';
import { useEulerVault } from '@/hooks/useEulerVault';
import { useEVC } from '@/hooks/useEVC';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { useTokenAllowance } from '@/hooks/useTokenAllowance';
import type { VaultInfo } from '@/constants/base-tokens';
import { useEulerSwapPool } from '@/hooks/useEulerSwapPool';
import { useEulerSwap } from '@/hooks/useEulerSwap';

interface BankModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'deposit' | 'withdraw' | 'custom' | 'pool' | 'swap';

export function BankModal({ isOpen, onClose }: BankModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedVault, setSelectedVault] = useState<VaultInfo | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [poolWethAmount, setPoolWethAmount] = useState('');
  const [poolUsdcAmount, setPoolUsdcAmount] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapTokenIn, setSwapTokenIn] = useState<'WETH' | 'USDC'>('WETH');
  const [swapMinOut, setSwapMinOut] = useState('');
  
  const { address } = useAccount();
  const chainId = useChainId();
  
  // Check if we're on Base network
  const isBaseNetwork = chainId === BASE_CHAIN_ID;
  
  // Vault discovery
  const { vaultsInfo, isLoading: isLoadingVaults, refetchAll: refetchVaults } = useVaultFinder();
  
  // EVC operations
  const { 
    enableCollateral, 
    isExecuting: isEVCExecuting, 
    error: evcError,
    checkCollateralStatus 
  } = useEVC();
  
  // Selected vault operations
  const { 
    vaultBalance,
    assetsFromShares,
    deposit,
    withdraw,
    isExecuting: isVaultExecuting,
    isSuccess,
    error: vaultError,
    refetchAll: refetchVaultData
  } = useEulerVault(selectedVault?.vault);
  
  // Token balance for selected vault's asset
  const { balance: assetBalance, refetch: refetchAssetBalance } = useTokenBalance(
    selectedVault?.asset,
    address
  );
  
  // Token allowance for selected vault
  const { 
    allowance,
    approve,
    checkApprovalNeeded,
    isApproving,
    error: allowanceError
  } = useTokenAllowance(selectedVault?.asset || "0x0000000000000000000000000000000000000000", selectedVault?.vault);

  // EulerSwap Pool operations
  const {
    userPool,
    hasPool,
    deployDefaultPool,
    setupPoolWithEVC,
    isDeploying,
    error: poolError,
    WETH_VAULT,
    USDC_VAULT
  } = useEulerSwapPool();

  // EulerSwap trading operations
  const {
    getQuote,
    swap: executeSwap,
    isSwapping,
    error: swapError
  } = useEulerSwap();

  // Filter vaults by supported tokens (WETH, USDC)
  const supportedVaults = vaultsInfo.filter((vault: VaultInfo) => 
    vault.asset === BASE_TOKENS.WETH || vault.asset === BASE_TOKENS.USDC
  );

  // Get asset decimals
  const getAssetDecimals = (assetAddress: Address) => {
    if (assetAddress === BASE_TOKENS.WETH) return 18;
    if (assetAddress === BASE_TOKENS.USDC) return 6;
    return 18; // Default
  };

  // Get asset symbol
  const getAssetSymbol = (assetAddress: Address) => {
    if (assetAddress === BASE_TOKENS.WETH) return 'WETH';
    if (assetAddress === BASE_TOKENS.USDC) return 'USDC';
    return 'Custom Token';
  };

  // Validate if address is a valid Ethereum address
  const isValidAddress = (addr: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  // Handle custom address vault creation
  const handleCustomAddress = () => {
    if (!isValidAddress(customAddress)) {
      alert('Please enter a valid Ethereum address');
      return;
    }

    // Create a custom vault info object
    const customVault: VaultInfo = {
      vault: customAddress as Address,
      asset: customAddress as Address,
      name: `Custom Token Vault`,
      symbol: 'CUSTOM',
      totalSupply: BigInt(0),
      totalAssets: BigInt(0),
    };

    setSelectedVault(customVault);
    setActiveTab('deposit');
  };

  // Handle vault selection
  const handleVaultSelect = (vault: VaultInfo) => {
    setSelectedVault(vault);
    setActiveTab('deposit');
  };

  // Handle deposit
  const handleDeposit = async () => {
    if (!selectedVault || !depositAmount || parseFloat(depositAmount) <= 0) return;
    
    const decimals = getAssetDecimals(selectedVault.asset);
    const amountBigInt = parseUnits(depositAmount, decimals);
    
    // Check if approval is needed
    const needsApproval = checkApprovalNeeded(amountBigInt);
    
    if (needsApproval) {
      try {
        console.log('🏦 Approving token for vault...');
        await approve(amountBigInt);
        return; // Wait for approval to complete
      } catch (err) {
        console.error('Approval error:', err);
        return;
      }
    }
    
    try {
      console.log('🏦 Depositing into vault...');
      const result = await deposit(depositAmount, decimals);
      
      if (result) {
        console.log('✅ Deposit successful');
        setDepositAmount('');
        
        // Enable as collateral after successful deposit
        await enableCollateral(selectedVault.vault);
        
        console.log('🔄 Refreshing balances after deposit...');
        // Immediate refresh for UI responsiveness
        await Promise.all([
          refetchVaultData(),
          refetchAssetBalance(),
          refetchVaults()
        ]);
        
        // Additional refresh after short delay to catch any delayed updates
        setTimeout(async () => {
          await Promise.all([
            refetchVaultData(),
            refetchAssetBalance(),
            refetchVaults()
          ]);
          console.log('✅ Secondary balance refresh completed');
        }, 2000);
      }
    } catch (err) {
      console.error('Deposit failed:', err);
    }
  };

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!selectedVault || !withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    
    const decimals = getAssetDecimals(selectedVault.asset);
    
    try {
      console.log('🏦 Withdrawing from vault...');
      const result = await withdraw(withdrawAmount, decimals);
      
      if (result) {
        console.log('✅ Withdrawal successful');
        setWithdrawAmount('');
        
        console.log('🔄 Refreshing balances after withdrawal...');
        // Immediate refresh for UI responsiveness
        await Promise.all([
          refetchVaultData(),
          refetchAssetBalance(),
          refetchVaults()
        ]);
        
        // Additional refresh after short delay to catch any delayed updates
        setTimeout(async () => {
          await Promise.all([
            refetchVaultData(),
            refetchAssetBalance(),
            refetchVaults()
          ]);
          console.log('✅ Secondary balance refresh completed');
        }, 2000);
      }
    } catch (err) {
      console.error('Withdrawal failed:', err);
    }
  };

  // Refresh balances when vault changes
  useEffect(() => {
    if (selectedVault) {
      refetchVaultData();
      refetchAssetBalance();
    }
  }, [selectedVault]);

  // Refresh all data when vault transaction succeeds
  useEffect(() => {
    if (isSuccess && selectedVault) {
      console.log('🔄 Vault transaction successful, refreshing all balances...');
      // Comprehensive balance refresh
      const refreshAllData = async () => {
        await Promise.all([
          refetchVaultData(),
          refetchAssetBalance(),
          refetchVaults()
        ]);
        console.log('✅ All balances refreshed');
      };
      
      // Small delay to ensure blockchain state is updated
      setTimeout(refreshAllData, 1500);
    }
  }, [isSuccess, selectedVault]);

  const renderOverview = () => (
    <div className="grid gap-4 py-4">
      <div className="text-center mb-4">
        <PiggyBank className="h-12 w-12 mx-auto mb-2 text-pink-600" />
        <h3 className="text-lg font-semibold text-pink-900">Magical Piggy Bank</h3>
        <p className="text-sm text-pink-700">
          Put your USDC or WETH coins in the piggy bank to watch them grow with magical yield!
        </p>
        <p className="text-xs text-pink-600">
          Advanced users can also add custom token addresses below.
        </p>
      </div>

      {!isBaseNetwork ? (
        <Alert className="border-pink-300 bg-pink-50">
          <AlertCircle className="h-4 w-4 text-pink-600" />
          <AlertDescription className="text-pink-800">
            Please switch to Base network to open the magical piggy bank!
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-3">
          <Label className="text-sm font-medium text-pink-900">Available Piggy Banks</Label>
          {isLoadingVaults ? (
            <div className="flex items-center justify-center py-8 text-pink-700">
              <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
              <span className="ml-2">Finding piggy banks...</span>
            </div>
          ) : supportedVaults.length === 0 ? (
            <div className="text-center py-8 text-pink-600">
              No piggy banks available
            </div>
          ) : (
            <div className="space-y-3">
              {/* Supported Tokens Section */}
              <div>
                <Label className="text-xs font-medium text-amber-900 mb-2 block">Supported Tokens (USDC/WETH)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {supportedVaults.slice(0, 2).map((vault: VaultInfo) => (
                    <div
                      key={vault.vault}
                      className="bg-amber-50 border border-amber-300 rounded-lg p-2 hover:bg-amber-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-amber-900">{getAssetSymbol(vault.asset)} Bank</div>
                          <div className="text-xs text-amber-700 truncate">
                            {formatUnits(vault.totalAssets, getAssetDecimals(vault.asset)).slice(0, 6)} total
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs bg-amber-200 hover:bg-amber-300 text-amber-900"
                          onClick={() => handleVaultSelect(vault)}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pool Creation Button */}
              {!hasPool && (
                <div className="border-t border-amber-300 pt-3">
                  <Button
                    variant="outline"
                    className="w-full bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100"
                    onClick={() => setActiveTab('pool')}
                  >
                    <Waves className="mr-2 h-4 w-4" />
                    Create EulerSwap Pool
                  </Button>
                  <p className="text-xs text-amber-600 mt-1 text-center">
                    Create your own WETH/USDC liquidity pool and earn fees!
                  </p>
                </div>
              )}

              {/* Swap Button - only show if user has a pool */}
              {hasPool && (
                <div className="border-t border-amber-300 pt-3">
                  <Button
                    variant="outline"
                    className="w-full bg-green-50 border-green-300 text-green-900 hover:bg-green-100"
                    onClick={() => setActiveTab('swap')}
                  >
                    <ArrowDownUp className="mr-2 h-4 w-4" />
                    Swap in Your Pool
                  </Button>
                  <p className="text-xs text-amber-600 mt-1 text-center">
                    Trade WETH/USDC using your liquidity pool!
                  </p>
                </div>
              )}

              {/* Advanced Options */}
              <div className="border-t border-amber-300 pt-3 mt-3">
                <Button
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-amber-700 hover:text-amber-900"
                >
                  {showAdvanced ? '▼' : '▶'} Advanced: Custom Token Address
                </Button>
                
                {showAdvanced && (
                  <div className="mt-2 p-3 bg-amber-25 border border-amber-200 rounded-lg">
                    <Label className="text-xs text-amber-800 mb-2 block">
                      Enter Token Contract Address
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="0x..."
                        value={customAddress}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={handleCustomAddress}
                        disabled={!isValidAddress(customAddress)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                      >
                        Use
                      </Button>
                    </div>
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Advanced users only. Verify contract address carefully.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderDeposit = () => {
    if (!selectedVault) return null;
    
    const decimals = getAssetDecimals(selectedVault.asset);
    const symbol = getAssetSymbol(selectedVault.asset);
    const depositAmountBigInt = depositAmount ? parseUnits(depositAmount, decimals) : BigInt(0);
    const needsApproval = depositAmountBigInt > 0 ? checkApprovalNeeded(depositAmountBigInt) : false;
    
    return (
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <div className="flex justify-between items-center">
            <Label className="text-pink-900">Piggy Bank: {selectedVault.symbol}</Label>
            <span className="text-sm text-pink-700">
              Your Coins: {formatUnits(assetBalance, decimals).slice(0, 8)} {symbol}
            </span>
          </div>
          {symbol === 'Custom Token' && (
            <div className="bg-orange-50 border border-orange-300 rounded p-2">
              <p className="text-xs text-orange-800">
                ⚠️ Custom token detected. Verify contract address and token decimals carefully.
                Only use tokens you trust.
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="depositAmount" className="text-pink-900">Coins to Put In</Label>
          <div className="relative">
            <Input
              id="depositAmount"
              type="number"
              placeholder="0.00"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              step="0.01"
              min="0"
              className="pr-16"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (assetBalance > BigInt(0)) {
                  const formattedBalance = formatUnits(assetBalance, decimals);
                  setDepositAmount(formattedBalance);
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
            >
              MAX
            </Button>
          </div>
        </div>

        {/* Current piggy bank position */}
        <div className="rounded-lg border border-pink-300 bg-pink-50 p-4">
          <div className="text-sm font-medium mb-2 text-pink-900">Your Piggy Bank</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-pink-700">Bank Shares:</span>
              <div className="font-medium text-pink-900">
                {formatUnits(vaultBalance, decimals).slice(0, 8)}
              </div>
            </div>
            <div>
              <span className="text-pink-700">Coin Value:</span>
              <div className="font-medium text-pink-900">
                {formatUnits(assetsFromShares, decimals).slice(0, 8)} {symbol}
              </div>
            </div>
          </div>
        </div>

        {/* Approval status */}
        {depositAmount && parseFloat(depositAmount) > 0 && (
          <div className="rounded-lg border border-pink-300 bg-pink-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-pink-900">Piggy Bank Permission</span>
              {needsApproval ? (
                <span className="text-sm text-orange-600">⚠ Permission Needed</span>
              ) : (
                <span className="text-sm text-green-600">✓ Ready to Save</span>
              )}
            </div>
            <div className="text-xs text-pink-700 mt-1">
              Current allowance: {formatUnits(allowance, decimals).slice(0, 8)} {symbol}
            </div>
          </div>
        )}

        {(vaultError || evcError || allowanceError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {vaultError || evcError || allowanceError}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setActiveTab('overview')}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleDeposit}
            disabled={
              !address || 
              !depositAmount || 
              parseFloat(depositAmount) <= 0 || 
              isVaultExecuting || 
              isEVCExecuting ||
              isApproving
            }
            className={`flex-1 ${
              needsApproval && depositAmountBigInt > 0 ? 'bg-orange-500 hover:bg-orange-600' : 
              'bg-pink-600 hover:bg-pink-700 text-white'
            }`}
          >
            {(isVaultExecuting || isEVCExecuting || isApproving) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {needsApproval && depositAmountBigInt > 0 ? 'Allow & Save Coins' : 'Save Coins'}
          </Button>
        </div>
      </div>
    );
  };

  const renderPool = () => {
    // Get token balances for pool creation
    const { balance: wethBalance } = useTokenBalance(BASE_TOKENS.WETH, address);
    const { balance: usdcBalance } = useTokenBalance(BASE_TOKENS.USDC, address);
    
    const handleCreatePool = async () => {
      if (!poolWethAmount || !poolUsdcAmount || parseFloat(poolWethAmount) <= 0 || parseFloat(poolUsdcAmount) <= 0) {
        return;
      }
      
      try {
        console.log('🏊 Creating EulerSwap pool...');
        const result = await setupPoolWithEVC(poolWethAmount, poolUsdcAmount);
        
        if (result) {
          console.log('✅ Pool created successfully!');
          setPoolWethAmount('');
          setPoolUsdcAmount('');
          // Could switch to overview or show success message
          setActiveTab('overview');
        }
      } catch (err) {
        console.error('Pool creation failed:', err);
      }
    };
    
    return (
      <div className="grid gap-4 py-4">
        <div className="text-center mb-2">
          <Waves className="h-8 w-8 mx-auto mb-2 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-900">Create Liquidity Pool</h3>
          <p className="text-sm text-blue-700">
            Provide WETH and USDC liquidity to earn trading fees!
          </p>
        </div>

        {hasPool ? (
          <div className="rounded-lg border border-green-300 bg-green-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">You already have a pool!</span>
            </div>
            <div className="text-sm text-green-700">
              Pool Address: {userPool?.slice(0, 6)}...{userPool?.slice(-4)}
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              <Label className="text-blue-900">WETH Amount</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={poolWethAmount}
                  onChange={(e) => setPoolWethAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="pr-16"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (wethBalance > BigInt(0)) {
                      const formattedBalance = formatUnits(wethBalance, 18);
                      setPoolWethAmount(formattedBalance);
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                >
                  MAX
                </Button>
              </div>
              <span className="text-xs text-blue-700">
                Balance: {formatUnits(wethBalance, 18).slice(0, 8)} WETH
              </span>
            </div>

            <div className="grid gap-2">
              <Label className="text-blue-900">USDC Amount</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={poolUsdcAmount}
                  onChange={(e) => setPoolUsdcAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="pr-16"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (usdcBalance > BigInt(0)) {
                      const formattedBalance = formatUnits(usdcBalance, 6);
                      setPoolUsdcAmount(formattedBalance);
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                >
                  MAX
                </Button>
              </div>
              <span className="text-xs text-blue-700">
                Balance: {formatUnits(usdcBalance, 6).slice(0, 8)} USDC
              </span>
            </div>

            <div className="rounded-lg border border-blue-300 bg-blue-50 p-3">
              <div className="text-sm font-medium text-blue-900 mb-1">Pool Parameters</div>
              <div className="text-xs text-blue-700 space-y-1">
                <div>• 0.3% trading fee</div>
                <div>• 97% concentration</div>
                <div>• Initial 1:1 price ratio</div>
                <div>• Vaults: eWETH-1 and eUSDC-1</div>
              </div>
            </div>

            {poolError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{poolError}</AlertDescription>
              </Alert>
            )}
          </>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setActiveTab('overview')}
            className="flex-1"
          >
            Back
          </Button>
          {!hasPool && (
            <Button
              onClick={handleCreatePool}
              disabled={
                !address || 
                !poolWethAmount || 
                !poolUsdcAmount ||
                parseFloat(poolWethAmount) <= 0 || 
                parseFloat(poolUsdcAmount) <= 0 ||
                isDeploying
              }
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isDeploying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeploying ? 'Creating Pool...' : 'Create Pool'}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderSwap = () => {
    // Get token balances
    const { balance: wethBalance } = useTokenBalance(BASE_TOKENS.WETH, address);
    const { balance: usdcBalance } = useTokenBalance(BASE_TOKENS.USDC, address);
    
    const tokenIn = swapTokenIn === 'WETH' ? BASE_TOKENS.WETH : BASE_TOKENS.USDC;
    const tokenOut = swapTokenIn === 'WETH' ? BASE_TOKENS.USDC : BASE_TOKENS.WETH;
    const decimalsIn = swapTokenIn === 'WETH' ? 18 : 6;
    const decimalsOut = swapTokenIn === 'WETH' ? 6 : 18;
    const balance = swapTokenIn === 'WETH' ? wethBalance : usdcBalance;
    
    const handleSwap = async () => {
      if (!swapAmount || parseFloat(swapAmount) <= 0 || !swapMinOut) return;
      
      try {
        console.log('💱 Executing swap in your pool...');
        const result = await executeSwap(
          tokenIn,
          tokenOut,
          swapAmount,
          decimalsIn,
          swapMinOut,
          decimalsOut
        );
        
        if (result) {
          console.log('✅ Swap successful!');
          setSwapAmount('');
          setSwapMinOut('');
          // Refresh balances
          await refetchVaults();
        }
      } catch (err) {
        console.error('Swap failed:', err);
      }
    };

    const handleGetQuote = async () => {
      if (!swapAmount || parseFloat(swapAmount) <= 0) return;
      
      const quote = await getQuote(tokenIn, tokenOut, swapAmount, decimalsIn);
      if (quote) {
        // Set minimum output with 2% slippage
        const minOut = (quote * BigInt(98)) / BigInt(100);
        setSwapMinOut(formatUnits(minOut, decimalsOut));
      }
    };

    // Auto-get quote when amount changes
    // Note: This should be moved outside renderSwap in production
    
    return (
      <div className="grid gap-4 py-4">
        <div className="text-center mb-2">
          <ArrowDownUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
          <h3 className="text-lg font-semibold text-green-900">Swap in Your Pool</h3>
          <p className="text-sm text-green-700">
            Trade directly through your liquidity pool!
          </p>
        </div>

        <div className="rounded-lg border border-green-300 bg-green-50 p-3 mb-2">
          <div className="text-sm text-green-700">
            <div className="font-medium text-green-900 mb-1">Your Pool Details</div>
            <div className="text-xs space-y-1">
              <div>Address: {userPool?.slice(0, 6)}...{userPool?.slice(-4)}</div>
              <div>Pair: WETH/USDC</div>
              <div>Fee: 0.3%</div>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label className="text-green-900">Swap From</Label>
          <select 
            className="flex h-10 w-full rounded-md border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-900"
            value={swapTokenIn}
            onChange={(e) => setSwapTokenIn(e.target.value as 'WETH' | 'USDC')}
          >
            <option value="WETH">WETH</option>
            <option value="USDC">USDC</option>
          </select>
        </div>

        <div className="grid gap-2">
          <Label className="text-green-900">Amount</Label>
          <div className="relative">
            <Input
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
                if (balance > BigInt(0)) {
                  const formattedBalance = formatUnits(balance, decimalsIn);
                  setSwapAmount(formattedBalance);
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
            >
              MAX
            </Button>
          </div>
          <span className="text-xs text-green-700">
            Balance: {formatUnits(balance, decimalsIn).slice(0, 8)} {swapTokenIn}
          </span>
        </div>

        {swapAmount && parseFloat(swapAmount) > 0 && !swapMinOut && (
          <Button
            variant="outline"
            onClick={handleGetQuote}
            className="w-full bg-green-50 border-green-300 text-green-900 hover:bg-green-100"
          >
            Get Quote
          </Button>
        )}

        {swapMinOut && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-3">
            <div className="text-sm font-medium text-green-900 mb-1">You'll Receive</div>
            <div className="text-lg font-bold text-green-800">
              ~{parseFloat(swapMinOut).toFixed(6)} {swapTokenIn === 'WETH' ? 'USDC' : 'WETH'}
            </div>
            <div className="text-xs text-green-600 mt-1">
              (Includes 2% slippage protection)
            </div>
          </div>
        )}

        {(swapError || poolError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{swapError || poolError}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setActiveTab('overview')}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleSwap}
            disabled={
              !address || 
              !swapAmount || 
              !swapMinOut ||
              parseFloat(swapAmount) <= 0 || 
              isSwapping
            }
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {isSwapping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSwapping ? 'Swapping...' : 'Swap'}
          </Button>
        </div>
      </div>
    );
  };

  const renderWithdraw = () => {
    if (!selectedVault) return null;
    
    const decimals = getAssetDecimals(selectedVault.asset);
    const symbol = getAssetSymbol(selectedVault.asset);
    
    return (
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label className="text-pink-900">Piggy Bank: {selectedVault.symbol}</Label>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="withdrawAmount" className="text-pink-900">Coins to Take Out</Label>
          <div className="relative">
            <Input
              id="withdrawAmount"
              type="number"
              placeholder="0.00"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              step="0.01"
              min="0"
              className="pr-16"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (assetsFromShares > BigInt(0)) {
                  const formattedBalance = formatUnits(assetsFromShares, decimals);
                  setWithdrawAmount(formattedBalance);
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
            >
              MAX
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-pink-300 bg-pink-50 p-4">
          <div className="text-sm font-medium mb-2 text-pink-900">Coins Available to Take</div>
          <div className="text-lg font-bold text-pink-800">
            {formatUnits(assetsFromShares, decimals).slice(0, 8)} {symbol}
          </div>
        </div>

        {vaultError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{vaultError}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setActiveTab('overview')}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleWithdraw}
            disabled={
              !address || 
              !withdrawAmount || 
              parseFloat(withdrawAmount) <= 0 || 
              isVaultExecuting
            }
            className="flex-1 bg-pink-600 hover:bg-pink-700 text-white"
          >
            {isVaultExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Take Coins
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 bg-transparent border-0 shadow-none">
        {/* Piggy Bank Background - 2x larger */}
        <div 
          className="relative w-full h-[800px] bg-cover bg-center bg-no-repeat rounded-lg overflow-hidden"
          style={{
            backgroundImage: 'url(/piggy.png)',
            backgroundSize: 'contain',
            backgroundPosition: 'center'
          }}
        >
          {/* Overlay for better text readability - more opaque and brown */}
          <div className="absolute inset-0 bg-amber-900/60 backdrop-blur-[1px]" />
          
          {/* Dialog Content */}
          <div className="relative z-10 p-6 h-full flex flex-col">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2 text-pink-900 text-xl font-bold drop-shadow-md">
                <PiggyBank className="h-6 w-6 text-pink-700" />
                Piggy Bank Vault
              </DialogTitle>
              <DialogDescription className="text-pink-800 font-medium drop-shadow-sm">
                {activeTab === 'overview' 
                  ? 'Save your coins in the magical piggy bank to earn yield!'
                  : activeTab === 'deposit'
                  ? `Put ${selectedVault ? getAssetSymbol(selectedVault.asset) : ''} coins into the piggy bank`
                  : activeTab === 'withdraw'
                  ? `Take ${selectedVault ? getAssetSymbol(selectedVault.asset) : ''} coins from the piggy bank`
                  : activeTab === 'pool'
                  ? 'Create a liquidity pool to earn trading fees!'
                  : activeTab === 'swap'
                  ? 'Swap tokens using your liquidity pool!'
                  : 'Advanced token configuration'
                }
              </DialogDescription>
            </DialogHeader>

            {/* Spacer to push content towards bottom */}
            <div className="flex-1" />

            {/* Content Area positioned above center */}
            <div className="flex justify-center items-center -mt-16">
              <div className="w-full max-w-lg bg-amber-50/95 backdrop-blur-sm rounded-lg border-2 border-amber-400 shadow-lg p-4 max-h-[300px] overflow-y-auto">
                {activeTab === 'overview' ? renderOverview() : 
                 activeTab === 'deposit' ? renderDeposit() : 
                 activeTab === 'withdraw' ? renderWithdraw() :
                 activeTab === 'pool' ? renderPool() :
                 activeTab === 'swap' ? renderSwap() :
                 renderOverview()}
              </div>
            </div>

            {activeTab === 'overview' && (
              <div className="flex justify-end mt-4">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="bg-pink-100 border-pink-300 text-pink-900 hover:bg-pink-200 shadow-md"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}