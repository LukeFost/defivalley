import { useState, useEffect } from 'react';
import { useChainId, useAccount } from 'wagmi';
import { TxModal } from './TxModal';
import { useUI, useFlowQuest } from '@/app/store';
import { useStakeFVIX, useFVIXAllowance } from '@/lib/hooks/useStakeFVIX';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { flowMainnet } from '@/app/wagmi';
import { parseEther, formatEther } from 'viem';

/**
 * StakeModal component for FVIX → sFVIX token staking
 * Only functional when connected to Flow network
 */
export function StakeModal() {
  const { isStakeModalOpen, hideStakeModal, addNotification } = useUI();
  const { address } = useAccount();
  const chainId = useChainId();
  const { setStaked, initializeQuest } = useFlowQuest();
  
  const [fvixAmount, setFvixAmount] = useState('');
  const [estimatedShares, setEstimatedShares] = useState<string | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [showUnstakeMode, setShowUnstakeMode] = useState(false);
  const [sFvixAmount, setSFvixAmount] = useState('');
  
  const { 
    writeAsync: executeStake,
    unstakeAsync: executeUnstake,
    claimRewardsAsync: executeClaim,
    isLoading: isStaking, 
    data: stakeTxHash, 
    error: stakeError,
    checkEligibility,
    getMaxStakeable,
    hasStakeable,
    estimateShares,
    pendingRewards
  } = useStakeFVIX();

  const {
    allowance,
    approveAsync,
    isApproving,
    refetch: refetchAllowance
  } = useFVIXAllowance();

  const isOnFlow = chainId === flowMainnet.id;
  const isValidAmount = fvixAmount && parseFloat(fvixAmount) > 0;
  const isValidUnstakeAmount = sFvixAmount && parseFloat(sFvixAmount) > 0;
  const eligibility = isValidAmount ? checkEligibility(fvixAmount) : null;
  const hasStakeableFVIX = hasStakeable();
  const hasPendingRewards = pendingRewards > 0n;

  // Initialize quest when modal opens
  useEffect(() => {
    if (isStakeModalOpen && address) {
      initializeQuest(address);
    }
  }, [isStakeModalOpen, address, initializeQuest]);

  // Check if approval is needed
  useEffect(() => {
    if (isValidAmount && allowance !== undefined && !showUnstakeMode) {
      const amountWei = parseEther(fvixAmount);
      setNeedsApproval(allowance < amountWei);
    } else {
      setNeedsApproval(false);
    }
  }, [fvixAmount, allowance, isValidAmount, showUnstakeMode]);

  // Estimate shares when amount changes
  useEffect(() => {
    if (isValidAmount && isOnFlow && !showUnstakeMode) {
      const getEstimate = async () => {
        const shares = await estimateShares(fvixAmount);
        setEstimatedShares(shares);
      };
      getEstimate();
    } else {
      setEstimatedShares(null);
    }
  }, [fvixAmount, isValidAmount, isOnFlow, estimateShares, showUnstakeMode]);

  const handleApprove = async () => {
    if (!address || !isValidAmount) return;

    try {
      const amountWei = parseEther(fvixAmount);
      const hash = await approveAsync(amountWei);

      addNotification({
        type: 'success',
        title: 'Approval Successful! ✅',
        message: `Approved ${fvixAmount} FVIX for staking`
      });

      // Refetch allowance after approval
      await refetchAllowance();
      
    } catch (err) {
      console.error('Approval failed:', err);
      addNotification({
        type: 'error',
        title: 'Approval Failed',
        message: 'Failed to approve FVIX tokens for staking'
      });
    }
  };

  const handleStake = async () => {
    if (!address || !isValidAmount || !isOnFlow || !eligibility?.canStake) return;

    try {
      const hash = await executeStake({
        fvixAmount: fvixAmount
      });

      // Update quest progress
      if (estimatedShares) {
        setStaked(address, estimatedShares);
      }

      // Show success notification
      addNotification({
        type: 'success',
        title: 'Stake Successful! 🎉',
        message: `Staked ${fvixAmount} FVIX for ${estimatedShares || 'sFVIX'} shares`
      });

      // Reset form and close modal
      setFvixAmount('');
      setEstimatedShares(null);
      hideStakeModal();
      
    } catch (err) {
      console.error('Stake failed:', err);
      // Error notification is handled by TxModal
    }
  };

  const handleUnstake = async () => {
    if (!address || !isValidUnstakeAmount || !isOnFlow) return;

    try {
      const hash = await executeUnstake({
        sFvixAmount: sFvixAmount
      });

      // Show success notification
      addNotification({
        type: 'success',
        title: 'Unstake Successful! 🎉',
        message: `Unstaked ${sFvixAmount} sFVIX shares`
      });

      // Reset form
      setSFvixAmount('');
      
    } catch (err) {
      console.error('Unstake failed:', err);
    }
  };

  const handleClaimRewards = async () => {
    if (!address || !isOnFlow) return;

    try {
      const hash = await executeClaim();

      // Show success notification
      addNotification({
        type: 'success',
        title: 'Rewards Claimed! 💰',
        message: `Claimed ${formatEther(pendingRewards)} FVIX rewards`
      });
      
    } catch (err) {
      console.error('Claim failed:', err);
    }
  };

  const handleClose = () => {
    setFvixAmount('');
    setSFvixAmount('');
    setEstimatedShares(null);
    setShowUnstakeMode(false);
    hideStakeModal();
  };

  const handleMaxAmount = () => {
    if (showUnstakeMode) {
      // For unstaking, we'd need the user's sFVIX balance
      // This would require adding useSFVIXBalance hook usage
      return;
    } else {
      const maxStakeable = getMaxStakeable();
      setFvixAmount(maxStakeable);
    }
  };

  if (!isOnFlow) {
    return (
      <TxModal
        isOpen={isStakeModalOpen}
        onClose={handleClose}
        title="Network Not Supported"
        description="FVIX token staking is only available on Flow Network"
        showCancel={true}
        cancelText="Close"
      >
        <div className="text-center py-4">
          <div className="text-4xl mb-4">🥩</div>
          <p className="text-gray-600">
            Please switch to Flow Network to stake FVIX tokens for sFVIX.
          </p>
        </div>
      </TxModal>
    );
  }

  return (
    <TxModal
      isOpen={isStakeModalOpen}
      onClose={handleClose}
      title={showUnstakeMode ? "🔄 Unstake sFVIX → FVIX" : "🥩 Stake FVIX → sFVIX"}
      description={showUnstakeMode ? "Unstake your sFVIX shares to receive FVIX" : "Stake FVIX tokens to earn sFVIX shares and rewards"}
      onConfirm={showUnstakeMode ? handleUnstake : (needsApproval ? handleApprove : handleStake)}
      confirmText={
        showUnstakeMode 
          ? `Unstake ${sFvixAmount || '0'} sFVIX`
          : needsApproval 
            ? `Approve ${fvixAmount || '0'} FVIX` 
            : `Stake ${fvixAmount || '0'} FVIX`
      }
      confirmDisabled={
        showUnstakeMode 
          ? !isValidUnstakeAmount || isStaking
          : !isValidAmount || (!needsApproval && !eligibility?.canStake) || isStaking || isApproving
      }
      isLoading={isStaking || isApproving}
      txHash={stakeTxHash}
      error={stakeError}
    >
      <div className="space-y-6">
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={!showUnstakeMode ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUnstakeMode(false)}
            className="flex-1"
          >
            Stake FVIX
          </Button>
          <Button
            variant={showUnstakeMode ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUnstakeMode(true)}
            className="flex-1"
          >
            Unstake sFVIX
          </Button>
        </div>

        {/* Pending Rewards Display */}
        {hasPendingRewards && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <span className="text-yellow-800 font-medium">Pending Rewards:</span>
              <div className="flex items-center gap-2">
                <span className="text-yellow-900 font-bold">
                  {parseFloat(formatEther(pendingRewards)).toLocaleString()} FVIX
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClaimRewards}
                  disabled={isStaking}
                  className="h-6 px-2 text-xs"
                >
                  Claim
                </Button>
              </div>
            </div>
          </div>
        )}

        {!showUnstakeMode ? (
          // Stake Mode
          <>
            {/* Stake Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="stake-amount">FVIX Amount</Label>
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
                id="stake-amount"
                type="number"
                placeholder="Enter FVIX amount to stake"
                value={fvixAmount}
                onChange={(e) => setFvixAmount(e.target.value)}
                min="0"
                step="0.01"
                className="text-lg"
              />
              {isValidAmount && eligibility && !eligibility.canStake && (
                <p className="text-red-500 text-sm">
                  Insufficient FVIX balance. Missing: {eligibility.missingFvix.toString()}
                </p>
              )}
              {!hasStakeableFVIX && (
                <p className="text-yellow-600 text-sm">
                  You don't have any FVIX tokens to stake
                </p>
              )}
            </div>

            {/* Stake Preview */}
            {estimatedShares && isValidAmount && eligibility?.canStake && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="text-purple-800 font-medium">You'll receive:</span>
                  <span className="text-purple-900 font-bold text-lg">
                    ~{parseFloat(estimatedShares).toLocaleString()} sFVIX
                  </span>
                </div>
                <p className="text-purple-600 text-sm mt-1">
                  sFVIX shares earn continuous rewards
                </p>
              </div>
            )}

            {/* Approval Status */}
            {isValidAmount && needsApproval && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center justify-between">
                  <span className="text-yellow-800 font-medium">Approval Required:</span>
                  <span className="text-yellow-900 font-bold">
                    {fvixAmount} FVIX
                  </span>
                </div>
                <p className="text-yellow-600 text-sm mt-1">
                  You need to approve FVIX tokens before staking
                </p>
              </div>
            )}
          </>
        ) : (
          // Unstake Mode
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="unstake-amount">sFVIX Amount</Label>
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
              id="unstake-amount"
              type="number"
              placeholder="Enter sFVIX amount to unstake"
              value={sFvixAmount}
              onChange={(e) => setSFvixAmount(e.target.value)}
              min="0"
              step="0.01"
              className="text-lg"
            />
          </div>
        )}

        {/* Stake Details */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Network:</span>
            <span className="font-medium">Flow Mainnet</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Vault Type:</span>
            <span className="font-medium">ERC4626 Staking</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Reward Token:</span>
            <span className="font-medium">FVIX</span>
          </div>
        </div>
      </div>
    </TxModal>
  );
}