import { useState, useEffect } from 'react';
import { useChainId, useAccount } from 'wagmi';
import { TxModal } from './TxModal';
import { useUI, useFlowQuest } from '@/app/store';
import { useMintFVIX, useFrothAllowance } from '@/lib/hooks/useMintFVIX';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { flowMainnet } from '@/app/wagmi';
import { parseEther } from 'viem';

/**
 * MintModal component for FROTH → FVIX token minting
 * Only functional when connected to Flow network
 */
export function MintModal() {
  const { isMintModalOpen, hideMintModal, addNotification } = useUI();
  const { address } = useAccount();
  const chainId = useChainId();
  const { setMinted, initializeQuest } = useFlowQuest();
  
  const [frothAmount, setFrothAmount] = useState('');
  const [needsApproval, setNeedsApproval] = useState(false);
  
  const { 
    writeAsync: executeMint, 
    isLoading: isMinting, 
    data: mintTxHash, 
    error: mintError,
    checkEligibility,
    getMaxMintable,
    meetsThreshold
  } = useMintFVIX();

  const {
    allowance,
    approveAsync,
    isApproving,
    refetch: refetchAllowance
  } = useFrothAllowance();

  const isOnFlow = chainId === flowMainnet.id;
  const isValidAmount = frothAmount && parseFloat(frothAmount) > 0;
  const eligibility = isValidAmount ? checkEligibility(frothAmount) : null;
  const meetsMinThreshold = isValidAmount ? meetsThreshold(frothAmount) : false;

  // Initialize quest when modal opens
  useEffect(() => {
    if (isMintModalOpen && address) {
      initializeQuest(address);
    }
  }, [isMintModalOpen, address, initializeQuest]);

  // Check if approval is needed
  useEffect(() => {
    if (isValidAmount && allowance !== undefined) {
      const amountWei = parseEther(frothAmount);
      setNeedsApproval(allowance < amountWei);
    } else {
      setNeedsApproval(false);
    }
  }, [frothAmount, allowance, isValidAmount]);

  const handleApprove = async () => {
    if (!address || !isValidAmount) return;

    try {
      const amountWei = parseEther(frothAmount);
      const hash = await approveAsync(amountWei);

      addNotification({
        type: 'success',
        title: 'Approval Successful! ✅',
        message: `Approved ${frothAmount} FROTH for minting`
      });

      // Refetch allowance after approval
      await refetchAllowance();
      
    } catch (err) {
      console.error('Approval failed:', err);
      addNotification({
        type: 'error',
        title: 'Approval Failed',
        message: 'Failed to approve FROTH tokens for minting'
      });
    }
  };

  const handleMint = async () => {
    if (!address || !isValidAmount || !isOnFlow || !eligibility?.canMint) return;

    try {
      const hash = await executeMint({
        frothAmount: frothAmount
      });

      // Update quest progress - estimate 1:1 FROTH to FVIX ratio
      setMinted(address, frothAmount);

      // Show success notification
      addNotification({
        type: 'success',
        title: 'Mint Successful! 🎉',
        message: `Minted FVIX tokens with ${frothAmount} FROTH`
      });

      // Reset form and close modal
      setFrothAmount('');
      hideMintModal();
      
    } catch (err) {
      console.error('Mint failed:', err);
      // Error notification is handled by TxModal
    }
  };

  const handleClose = () => {
    setFrothAmount('');
    hideMintModal();
  };

  const handleMaxAmount = () => {
    const maxMintable = getMaxMintable();
    setFrothAmount(maxMintable);
  };

  if (!isOnFlow) {
    return (
      <TxModal
        isOpen={isMintModalOpen}
        onClose={handleClose}
        title="Network Not Supported"
        description="FVIX token minting is only available on Flow Network"
        showCancel={true}
        cancelText="Close"
      >
        <div className="text-center py-4">
          <div className="text-4xl mb-4">🏗️</div>
          <p className="text-gray-600">
            Please switch to Flow Network to mint FVIX tokens with FROTH.
          </p>
        </div>
      </TxModal>
    );
  }

  return (
    <TxModal
      isOpen={isMintModalOpen}
      onClose={handleClose}
      title="🏗️ Mint FROTH → FVIX"
      description="Mint FVIX tokens using your FROTH balance"
      onConfirm={needsApproval ? handleApprove : handleMint}
      confirmText={needsApproval ? `Approve ${frothAmount || '0'} FROTH` : `Mint ${frothAmount || '0'} FVIX`}
      confirmDisabled={!isValidAmount || !meetsMinThreshold || (!needsApproval && !eligibility?.canMint) || isMinting || isApproving}
      isLoading={isMinting || isApproving}
      txHash={mintTxHash}
      error={mintError}
    >
      <div className="space-y-6">
        {/* Mint Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="mint-amount">FROTH Amount</Label>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleMaxAmount}
              className="h-6 px-2 text-xs"
            >
              Max
            </Button>
          </div>
          <Input
            id="mint-amount"
            type="number"
            placeholder="Enter FROTH amount to mint FVIX"
            value={frothAmount}
            onChange={(e) => setFrothAmount(e.target.value)}
            min="0"
            step="1000"
            className="text-lg"
          />
          {isValidAmount && !meetsMinThreshold && (
            <p className="text-red-500 text-sm">
              Minimum 10,000 FROTH required for minting
            </p>
          )}
          {isValidAmount && eligibility && !eligibility.canMint && eligibility.hasMinimumThreshold && (
            <p className="text-red-500 text-sm">
              Insufficient FROTH balance. Missing: {eligibility.missingFroth}
            </p>
          )}
        </div>

        {/* Mint Preview */}
        {isValidAmount && meetsMinThreshold && eligibility?.canMint && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <span className="text-green-800 font-medium">You'll receive:</span>
              <span className="text-green-900 font-bold text-lg">
                ~{parseFloat(frothAmount).toLocaleString()} FVIX
              </span>
            </div>
            <p className="text-green-600 text-sm mt-1">
              1:1 ratio FROTH to FVIX minting
            </p>
          </div>
        )}

        {/* Approval Status */}
        {isValidAmount && needsApproval && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <span className="text-yellow-800 font-medium">Approval Required:</span>
              <span className="text-yellow-900 font-bold">
                {frothAmount} FROTH
              </span>
            </div>
            <p className="text-yellow-600 text-sm mt-1">
              You need to approve FROTH tokens before minting
            </p>
          </div>
        )}

        {/* Mint Details */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Network:</span>
            <span className="font-medium">Flow Mainnet</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Minimum Amount:</span>
            <span className="font-medium">10,000 FROTH</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Mint Ratio:</span>
            <span className="font-medium">1:1 FROTH → FVIX</span>
          </div>
        </div>
      </div>
    </TxModal>
  );
}