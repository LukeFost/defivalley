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
import { useAccount, useBalance } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { FLOW_TOKENS } from '@/constants/flow-tokens';

interface FlowSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FlowSwapModal({ isOpen, onClose }: FlowSwapModalProps) {
  const { address } = useAccount();
  const { data: flowBalance } = useBalance({ address });
  const { balance: frothBalance, refetch: refetchFrothBalance } = useTokenBalance(FLOW_TOKENS.FROTH, address);
  
  const [amount, setAmount] = useState('');
  
  const { swap, isLoading: isSwapping, error: swapError } = usePunchSwap();
  const { convert, isConverting, error: convertError, getMaxConvertibleFroth, conversionRatio } = useFrothToFvix();

  const handleSwapToFroth = async () => {
    if (amount) {
        // Use the special address for the native token (FLOW)
        const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const;
        await swap(NATIVE_TOKEN_ADDRESS, FLOW_TOKENS.FROTH, parseUnits(amount, 18));
        refetchFrothBalance();
    }
  };

  const handleConvertToFvix = async () => {
    const maxFroth = getMaxConvertibleFroth();
    if (maxFroth > 0n) {
      await convert(maxFroth);
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
            <p className="text-xs text-muted-foreground mt-1">Balance: {flowBalance ? formatUnits(flowBalance.value, 18) : '0'} FLOW</p>
            <Button onClick={handleSwapToFroth} disabled={isSwapping || !amount} className="mt-2 w-full">
              {isSwapping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Swap for FROTH
            </Button>
            {swapError && <p className="text-red-500 text-xs mt-2">{swapError}</p>}
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Step 2: Convert FROTH ➔ FVIX</h4>
            <p className="text-sm text-muted-foreground mb-2">Convert your FROTH into the stakeable token, FVIX. (Ratio: {conversionRatio.toString()}:1)</p>
            <p className="text-sm">Available to convert: {formatUnits(frothBalance, 18)} FROTH</p>
            <Button onClick={handleConvertToFvix} disabled={isConverting || frothBalance === 0n} className="mt-2 w-full">
              {isConverting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Convert all FROTH to FVIX
            </Button>
            {convertError && <p className="text-red-500 text-xs mt-2">{convertError}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}