'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useFlowStaking } from '@/hooks/useFlowStaking';
import { parseUnits, formatUnits } from 'viem';

interface FlowStakingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function FlowStakingModalComponent({ isOpen, onClose }: FlowStakingModalProps) {
  const [amount, setAmount] = useState('');
  const {
    fvixBalance,
    sFvixBalance,
    approve,
    deposit,
    checkApproval,
    approvalNeeded,
    isApproving,
    isDepositing,
    calculateAPY,
    minimumDeposit,
    error,
    refetchBalance,
    refetchStakedBalance
  } = useFlowStaking();

  const depositAmountBigInt = useMemo(() => {
    try {
      return parseUnits(amount || '0', 18);
    } catch {
      return BigInt(0);
    }
  }, [amount]);

  // Check if the amount is valid
  const isAmountInvalid = amount && minimumDeposit ? depositAmountBigInt < minimumDeposit : false;

  // Refresh balances when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Staking modal opened, refreshing balances...');
      refetchBalance();
      refetchStakedBalance();
    }
  }, [isOpen, refetchBalance, refetchStakedBalance]);

  useEffect(() => {
    if (depositAmountBigInt > 0) {
      checkApproval(depositAmountBigInt);
    }
  }, [depositAmountBigInt, checkApproval]);

  const handleDeposit = async () => {
    const depositAmount = parseUnits(amount || '0', 18);
    const needsApproval = await checkApproval(depositAmount);
    if(needsApproval) {
        await approve(depositAmount);
        // Note: For simplicity, user will need to click again after approval.
    } else {
        await deposit(depositAmount);
    }
  };

  // Handler for the Max button
  const handleSetMax = () => {
    if (fvixBalance) {
      // formatUnits converts the bigint balance to a readable string
      setAmount(formatUnits(fvixBalance, 18));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flow Bank: Stake FVIX</DialogTitle>
          <DialogDescription>Stake your FVIX tokens to earn yield in the sFVIX vault.</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm">Current Staking APY: <span className="font-bold text-green-600">{calculateAPY().toFixed(2)}%</span></p>
              <p className="text-sm">Your FVIX Balance: {fvixBalance ? formatUnits(fvixBalance, 18) : '0'}</p>
              <p className="text-sm">Your Staked (sFVIX) Balance: {sFvixBalance ? formatUnits(sFvixBalance, 18) : '0'}</p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Stake FVIX</h4>
            <Label htmlFor="stake-amount">Amount to Stake</Label>
            
            {/* Wrap the Input component to position the Max button inside it */}
            <div className="relative">
              <Input
                id="stake-amount"
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.0"
                min="0"
                step="any"
                className="pr-16" // Add padding to make room for the button
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-8 -translate-y-1/2 px-3"
                onClick={handleSetMax}
              >
                Max
              </Button>
            </div>
            
            {/* Display the minimum staking amount */}
            {minimumDeposit && (
              <p className="text-xs text-muted-foreground mt-1">
                Minimum to stake: {formatUnits(minimumDeposit, 18)} FVIX
              </p>
            )}

            {/* Show an error message if the amount is too low */}
            {amount && minimumDeposit && depositAmountBigInt < minimumDeposit && (
              <p className="text-red-500 text-xs mt-1">
                Amount is below the minimum required for staking.
              </p>
            )}
            
            <Button onClick={handleDeposit} disabled={isApproving || isDepositing || !amount || (minimumDeposit !== undefined && depositAmountBigInt < minimumDeposit)} className="mt-2 w-full">
              {(isApproving || isDepositing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {approvalNeeded ? 'Approve FVIX' : 'Stake Now'}
            </Button>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const FlowStakingModal = React.memo(FlowStakingModalComponent);