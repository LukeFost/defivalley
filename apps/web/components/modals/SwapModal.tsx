import { useState, useEffect } from 'react';
import { useChainId, useAccount } from 'wagmi';
import { TxModal } from './TxModal';
import { useUI, useFlowQuest } from '@/app/store';
import { useSwapFlow } from '@/lib/hooks/useSwapFlow';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { flowMainnet } from '@/app/wagmi';

/**
 * SwapModal component for FLOW → FROTH token swapping
 * Only functional when connected to Flow network
 */
export function SwapModal() {
  const { isSwapModalOpen, hideSwapModal, addNotification } = useUI();
  const { address } = useAccount();
  const chainId = useChainId();
  const { setSwapped, initializeQuest } = useFlowQuest();
  
  const [swapAmount, setSwapAmount] = useState('');
  const [estimatedOutput, setEstimatedOutput] = useState<string | null>(null);
  
  const { 
    writeAsync: executeSwap, 
    isLoading, 
    data: txHash, 
    error,
    estimateOutput,
    hasInsufficientBalance 
  } = useSwapFlow();

  const isOnFlow = chainId === flowMainnet.id;
  const isValidAmount = swapAmount && parseFloat(swapAmount) > 0;
  const insufficientBalance = isValidAmount && hasInsufficientBalance(swapAmount);

  // Initialize quest when modal opens
  useEffect(() => {
    if (isSwapModalOpen && address) {
      initializeQuest(address);
    }
  }, [isSwapModalOpen, address]);

  // Estimate output when amount changes
  useEffect(() => {
    if (isValidAmount && isOnFlow) {
      const getEstimate = async () => {
        const output = await estimateOutput(swapAmount);
        setEstimatedOutput(output);
      };
      getEstimate();
    } else {
      setEstimatedOutput(null);
    }
  }, [swapAmount, isValidAmount, isOnFlow]);

  const handleSwap = async () => {
    if (!address || !isValidAmount || !isOnFlow) return;

    try {
      const hash = await executeSwap({
        amountIn: swapAmount,
        slippage: 0.5 // 0.5% slippage tolerance
      });

      // Update quest progress
      if (estimatedOutput) {
        setSwapped(address, estimatedOutput);
      }

      // Show success notification
      addNotification({
        type: 'success',
        title: 'Swap Successful! 🎉',
        message: `Swapped ${swapAmount} FLOW for ${estimatedOutput || 'FROTH'} tokens`
      });

      // Reset form and close modal
      setSwapAmount('');
      setEstimatedOutput(null);
      hideSwapModal();
      
    } catch (err) {
      console.error('Swap failed:', err);
      // Error notification is handled by TxModal
    }
  };

  const handleClose = () => {
    setSwapAmount('');
    setEstimatedOutput(null);
    hideSwapModal();
  };

  if (!isOnFlow) {
    return (
      <TxModal
        isOpen={isSwapModalOpen}
        onClose={handleClose}
        title="Network Not Supported"
        description="Flow token swapping is only available on Flow Network"
        showCancel={true}
        cancelText="Close"
      >
        <div className="text-center py-4">
          <div className="text-4xl mb-4">🌊</div>
          <p className="text-gray-600">
            Please switch to Flow Network to swap FLOW tokens for FROTH.
          </p>
        </div>
      </TxModal>
    );
  }

  return (
    <TxModal
      isOpen={isSwapModalOpen}
      onClose={handleClose}
      title="🔄 Swap FLOW → FROTH"
      description="Trade your FLOW tokens for FROTH using PunchSwap"
      onConfirm={handleSwap}
      confirmText={`Swap ${swapAmount || '0'} FLOW`}
      confirmDisabled={!isValidAmount || insufficientBalance || isLoading}
      isLoading={isLoading}
      txHash={txHash}
      error={error}
    >
      <div className="space-y-6">
        {/* Swap Input */}
        <div className="space-y-2">
          <Label htmlFor="swap-amount">FLOW Amount</Label>
          <Input
            id="swap-amount"
            type="number"
            placeholder="Enter FLOW amount to swap"
            value={swapAmount}
            onChange={(e) => setSwapAmount(e.target.value)}
            min="0"
            step="0.01"
            className="text-lg"
          />
          {insufficientBalance && (
            <p className="text-red-500 text-sm">
              Insufficient FLOW balance
            </p>
          )}
        </div>

        {/* Swap Preview */}
        {estimatedOutput && isValidAmount && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">You'll receive:</span>
              <span className="text-blue-900 font-bold text-lg">
                ~{parseFloat(estimatedOutput).toLocaleString()} FROTH
              </span>
            </div>
            <p className="text-blue-600 text-sm mt-1">
              Rate includes 0.5% slippage protection
            </p>
          </div>
        )}

        {/* Swap Details */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Network:</span>
            <span className="font-medium">Flow Mainnet</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">DEX:</span>
            <span className="font-medium">PunchSwap V2</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Slippage:</span>
            <span className="font-medium">0.5%</span>
          </div>
        </div>
      </div>
    </TxModal>
  );
}