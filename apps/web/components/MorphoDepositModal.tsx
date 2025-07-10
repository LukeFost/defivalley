'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { parseUnits, formatUnits, type Address } from 'viem';
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
import { Loader2, AlertCircle, CheckCircle2, Coins } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMorphoDeposit, type VaultType } from '@/hooks/useMorphoDeposit';
import { useMorphoPosition } from '@/hooks/useMorphoPosition';
import { useAccount } from 'wagmi';
import { MORPHO_VAULTS } from '@/constants/katana-tokens';

interface MorphoDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MorphoDepositModal = React.memo(function MorphoDepositModal({ isOpen, onClose }: MorphoDepositModalProps) {
  const [depositAmount, setDepositAmount] = useState('');
  const { address } = useAccount();
  
  const {
    vbUsdcBalance,
    isLoadingBalance,
    approve,
    deposit,
    isApproving,
    isDepositing,
    approvalNeeded,
    checkApproval,
    error,
    txHash,
    isSuccess,
    selectedVault,
    setSelectedVault
  } = useMorphoDeposit();

  // Get position and APY data for selected vault
  const {
    supplyAPY,
    borrowAPY,
    utilization,
    userSupplyValue,
    userSupplyAssets,
    isLoading: isLoadingPosition,
    marketData,
    positionData,
    refetchMarket,
    refetchPosition
  } = useMorphoPosition(selectedVault);

  // Parse deposit amount
  const depositAmountBigInt = useMemo(() => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return BigInt(0);
    try {
      return parseUnits(depositAmount, 6); // vbUSDC has 6 decimals
    } catch {
      return BigInt(0);
    }
  }, [depositAmount]);

  // Check allowance whenever amount changes
  useEffect(() => {
    if (depositAmountBigInt > 0) {
      checkApproval(depositAmountBigInt);
    }
  }, [depositAmountBigInt, checkApproval]);

  // Check if user has sufficient balance
  const hasSufficientBalance = useMemo(() => {
    if (!vbUsdcBalance || depositAmountBigInt === BigInt(0)) return true;
    return vbUsdcBalance >= depositAmountBigInt;
  }, [vbUsdcBalance, depositAmountBigInt]);

  // Refetch position data when deposit is successful
  useEffect(() => {
    if (isSuccess && refetchMarket && refetchPosition) {
      // Refetch immediately
      refetchMarket();
      refetchPosition();
      
      // Also refetch after a delay to ensure blockchain state is updated
      setTimeout(() => {
        refetchMarket();
        refetchPosition();
      }, 3000);
    }
  }, [isSuccess, refetchMarket, refetchPosition]);

  // Handle approval
  const handleApprove = async () => {
    if (depositAmountBigInt === BigInt(0)) return;
    try {
      console.log('🏦 Approving vbUSDC spend...');
      await approve(depositAmountBigInt);
    } catch (err) {
      console.error('Approval error:', err);
    }
  };

  // Handle deposit (only called when approval is sufficient)
  const handleDeposit = async () => {
    if (depositAmountBigInt === BigInt(0)) return;
    try {
      console.log(`🏦 Depositing to Morpho ${selectedVault} vault...`);
      await deposit(depositAmountBigInt, selectedVault);
      
      // Reset form on success
      setDepositAmount('');
    } catch (err) {
      console.error('Deposit error:', err);
    }
  };

  // Determine button state and action
  const getButtonState = () => {
    if (!address) {
      return { text: 'Connect Wallet', disabled: true, action: null };
    }
    
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      return { text: 'Enter Amount', disabled: true, action: null };
    }

    if (!hasSufficientBalance) {
      return { text: 'Insufficient Balance', disabled: true, action: null };
    }

    if (isApproving) {
      return { text: 'Approving...', disabled: true, action: null };
    }

    if (approvalNeeded) {
      return { text: 'Approve vbUSDC', disabled: false, action: handleApprove };
    }

    if (isDepositing) {
      return { text: 'Depositing...', disabled: true, action: null };
    }

    return { text: 'Deposit to Morpho', disabled: false, action: handleDeposit };
  };

  const buttonState = getButtonState();

  const maxBalance = () => {
    if (vbUsdcBalance) {
      setDepositAmount(formatUnits(vbUsdcBalance, 6));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🏦 Morpho Bank - Katana Network
          </DialogTitle>
          <DialogDescription>
            Deposit vbUSDC into Morpho vaults to earn yield. Choose your preferred collateral type.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Balance Display */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Your vbUSDC Balance:</span>
            <span className="font-medium">
              {isLoadingBalance ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `${vbUsdcBalance ? formatUnits(vbUsdcBalance, 6) : '0'} vbUSDC`
              )}
            </span>
          </div>

          {/* Current Position Display */}
          {address && (
            <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">Your Morpho Position</h3>
                {isLoadingPosition && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplied:</span>
                    <span className="font-medium">
                      {userSupplyValue.toFixed(4)} vbUSDC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current APY:</span>
                    <span className="font-medium text-green-600">
                      {(supplyAPY * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Borrow APY:</span>
                    <span className="font-medium text-orange-600">
                      {(borrowAPY * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utilization:</span>
                    <span className="font-medium">
                      {(utilization * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {userSupplyValue > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground">
                    💡 You're earning {(supplyAPY * 100).toFixed(2)}% APY on your {userSupplyValue.toFixed(2)} vbUSDC supply
                  </div>
                </div>
              )}

              {userSupplyValue === 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground">
                    🚀 Start earning {(supplyAPY * 100).toFixed(2)}% APY by supplying vbUSDC to this vault
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vault Selection */}
          <div className="grid gap-2">
            <Label>Select Vault</Label>
            <div className="grid gap-2">
              {(['vbETH', 'POL'] as VaultType[]).map((vaultType) => {
                const vault = MORPHO_VAULTS[vaultType];
                return (
                  <VaultOption
                    key={vaultType}
                    vaultType={vaultType}
                    vault={vault}
                    isSelected={selectedVault === vaultType}
                    onSelect={() => setSelectedVault(vaultType)}
                  />
                );
              })}
            </div>
          </div>

          {/* Deposit Input */}
          <div className="grid gap-2">
            <Label htmlFor="amount">Deposit Amount</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="pr-20"
                step="0.01"
                min="0"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={maxBalance}
                  className="h-7 px-2 text-xs"
                >
                  MAX
                </Button>
                <span className="text-sm text-muted-foreground">vbUSDC</span>
              </div>
            </div>
          </div>

          {/* Status Display */}
          {depositAmount && parseFloat(depositAmount) > 0 && (
            <div className="rounded-lg border bg-muted/10 p-3">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Balance Check:</span>
                  <span className={`font-medium ${hasSufficientBalance ? 'text-green-600' : 'text-red-600'}`}>
                    {hasSufficientBalance ? '✓ Sufficient' : '✗ Insufficient'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Allowance Check:</span>
                  <span className={`font-medium ${approvalNeeded ? 'text-orange-600' : 'text-green-600'}`}>
                    {approvalNeeded ? '⚠ Approval Required' : '✓ Approved'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ready to Deposit:</span>
                  <span className={`font-medium ${!approvalNeeded && hasSufficientBalance ? 'text-green-600' : 'text-gray-500'}`}>
                    {!approvalNeeded && hasSufficientBalance ? '✓ Ready' : '⏳ Pending'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {isSuccess && txHash && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Deposit successful!{' '}
                <a
                  href={`https://testnet.axelarscan.io/gmp/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  View transaction
                </a>
              </AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Deposits are processed on Katana network. Your vbUSDC will be supplied to the selected
              Morpho vault to earn yield. Make sure you have vbUSDC (bridged USDC) to deposit.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isApproving || isDepositing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={buttonState.action || (() => {})}
            disabled={buttonState.disabled}
            className={`flex-1 ${
              !hasSufficientBalance ? 'bg-red-500 hover:bg-red-600' : 
              approvalNeeded ? 'bg-orange-500 hover:bg-orange-600' : 
              'bg-primary hover:bg-primary/90'
            }`}
          >
            {(isApproving || isDepositing) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {buttonState.text}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

// Vault Option Component with APY display
function VaultOption({ 
  vaultType, 
  vault, 
  isSelected, 
  onSelect 
}: {
  vaultType: VaultType;
  vault: any;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { supplyAPY, isLoading } = useMorphoPosition(vaultType);

  return (
    <button
      onClick={onSelect}
      className={`p-3 rounded-lg border text-left transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium">{vault.name}</div>
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : (
              <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">
                {(supplyAPY * 100).toFixed(2)}% APY
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {vault.description}
          </div>
        </div>
        <Coins className="h-5 w-5 text-muted-foreground" />
      </div>
    </button>
  );
}