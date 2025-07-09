'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight } from 'lucide-react';
import { usePunchSwap } from '@/hooks/usePunchSwap';
import { useFrothToFvix } from '@/hooks/useFrothToFvix';
import { useTokenBalance } from '@/hooks/useTokenBalance'; 
import { useTokenAllowance } from '@/hooks/useTokenAllowance';
import { useAccount, useBalance } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { FLOW_TOKENS, FLOW_PROTOCOLS, NATIVE_TOKEN_ADDRESS } from '@/constants/flow-tokens';
import { flowMainnet } from '@/app/wagmi';

interface FlowSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FlowSwapModal({ isOpen, onClose }: FlowSwapModalProps) {
  const { address, chainId } = useAccount();
  const { data: flowBalance, refetch: refetchFlowBalance } = useBalance({ 
    address,
    chainId: flowMainnet.id // Force Flow mainnet chain ID
  });
  const { balance: frothBalance, refetch: refetchFrothBalance } = useTokenBalance(FLOW_TOKENS.FROTH, address, flowMainnet.id);
  
  const [amount, setAmount] = useState('');
  
  const { swap, isLoading: isSwapping, error: swapError } = usePunchSwap();
  const { 
    frothBalance: frothBalanceFromHook, 
    isConverting, 
    error: convertError, 
    getMaxConvertibleFroth, 
    conversionRatio 
  } = useFrothToFvix();
  
  // Add FROTH allowance hook for PunchSwap router
  const {
    allowance: frothAllowance,
    approve: approveFroth,
    isApproving: isApprovingFroth,
    checkApprovalNeeded: checkFrothApprovalNeeded
  } = useTokenAllowance(FLOW_TOKENS.FROTH, FLOW_PROTOCOLS.PUNCHSWAP_V2_ROUTER);

  const handleSwapToFroth = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }
    
    if (chainId !== flowMainnet.id) {
      alert('Please switch to Flow network to perform this swap');
      return;
    }
    
    try {
      console.log('Swapping:', {
        from: NATIVE_TOKEN_ADDRESS,
        to: FLOW_TOKENS.FROTH,
        amount: amount,
        parsedAmount: parseUnits(amount, 18).toString()
      });
      
      await swap(NATIVE_TOKEN_ADDRESS, FLOW_TOKENS.FROTH, parseUnits(amount, 18));
      setAmount(''); // Clear the input after successful swap
      refetchFrothBalance();
      refetchFlowBalance(); // Refetch FLOW balance after swap
    } catch (error) {
      console.error('Swap failed:', error);
    }
  };

  const handleConvertToFvix = async () => {
    if (frothBalance <= 0n) return;

    // Check if approval is needed first
    if (checkFrothApprovalNeeded(frothBalance)) {
      // If approval is needed, approve first
      await approveFroth(frothBalance);
      // The user will need to click again after approval confirms
    } else {
      // If already approved, perform the swap
      await swap(FLOW_TOKENS.FROTH, FLOW_TOKENS.FVIX, frothBalance);
      // Refetch balance after swap
      setTimeout(() => {
        refetchFrothBalance();
      }, 1000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flow DeFi Hub: Get Staking Tokens</DialogTitle>
          <DialogDescription>First, swap FLOW for FROTH, then convert FROTH to FVIX for staking.</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Step 1: Swap FLOW ➔ FROTH</h4>
            <p className="text-sm text-muted-foreground mb-2">Use PunchSwap to get the initial token.</p>
            <Label htmlFor="flow-amount">FLOW Amount</Label>
            <Input id="flow-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" />
            <p className="text-xs text-muted-foreground mt-1">
              Balance: {flowBalance && flowBalance.value > 0n ? formatUnits(flowBalance.value, 18) : '0'} FLOW
              {chainId !== flowMainnet.id && ' (Switch to Flow network)'}
            </p>
            <Button 
              onClick={handleSwapToFroth} 
              disabled={isSwapping || !amount || chainId !== flowMainnet.id || parseFloat(amount || '0') <= 0} 
              className="mt-2 w-full"
            >
              {isSwapping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {chainId !== flowMainnet.id ? 'Switch to Flow Network' : 'Swap for FROTH'}
            </Button>
            {swapError && <p className="text-red-500 text-xs mt-2">{swapError}</p>}
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Step 2: Convert FROTH ➔ FVIX</h4>
            <p className="text-sm text-muted-foreground mb-2">Convert your FROTH into the stakeable token, FVIX. (Ratio: {conversionRatio.toString()}:1)</p>
            <p className="text-sm">Available to convert: {formatUnits(frothBalance, 18)} FROTH</p>
            <Button onClick={handleConvertToFvix} disabled={isSwapping || isApprovingFroth || frothBalance === 0n} className="mt-2 w-full">
              {(isSwapping || isApprovingFroth) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {checkFrothApprovalNeeded(frothBalance) ? 'Approve FROTH' : 'Convert all FROTH to FVIX'}
            </Button>
            {swapError && <p className="text-red-500 text-xs mt-2">{swapError}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}