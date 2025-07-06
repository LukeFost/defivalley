import { useState, useEffect } from 'react';
import { useChainId, useAccount, useBalance } from 'wagmi';
import { TxModal } from './TxModal';
import { useUI, useFlowQuest } from '@/app/store';
import { useSwapFlow } from '@/lib/hooks/useSwapFlow';
import { useMintFVIX } from '@/lib/hooks/useMintFVIX';
import { useStakeFVIX, useFVIXAllowance } from '@/lib/hooks/useStakeFVIX';
import { usePlantSFVIX, useSFVIXPlantRequirements } from '@/lib/hooks/usePlantSFVIX';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { flowMainnet } from '@/app/wagmi';
import { parseEther, formatEther } from 'viem';
import { FROTH_TOKEN, FVIX_TOKEN, sFVIX_TOKEN, FLOW_TOKEN, FROTH_THRESHOLD } from '@/../packages/contracts/flow/constants';

/**
 * FlowSwapModal component for complete FLOW → FROTH → FVIX → sFVIX flow
 * Handles the entire DeFi pipeline and quest progression
 */
export function FlowSwapModal() {
  const { isSwapModalOpen, hideSwapModal, addNotification } = useUI();
  const { address } = useAccount();
  const chainId = useChainId();
  const { setSwapped, setMinted, setStaked, setPlanted, initializeQuest } = useFlowQuest();
  
  // Current step in the flow
  const [currentStep, setCurrentStep] = useState<'swap' | 'mint' | 'stake' | 'plant'>('swap');
  const [flowAmount, setFlowAmount] = useState('');
  const [frothAmount, setFrothAmount] = useState('');
  const [fvixAmount, setFvixAmount] = useState('');
  const [sFvixAmount, setSFvixAmount] = useState('');
  
  // Step completion tracking
  const [swapCompleted, setSwapCompleted] = useState(false);
  const [mintCompleted, setMintCompleted] = useState(false);
  const [stakeCompleted, setStakeCompleted] = useState(false);

  const isOnFlow = chainId === flowMainnet.id;

  // Hook instances for each step
  const {
    swapAsync: executeSwap,
    isLoading: isSwapping,
    data: swapTxHash,
    error: swapError,
    estimateOutput: estimateSwapOutput,
    checkEligibility: checkSwapEligibility
  } = useSwapFlow();

  const {
    mintAsync: executeMint,
    isLoading: isMinting,
    data: mintTxHash,
    error: mintError,
    checkEligibility: checkMintEligibility
  } = useMintFVIX();

  const {
    writeAsync: executeStake,
    isLoading: isStaking,
    data: stakeTxHash,
    error: stakeError,
    checkEligibility: checkStakeEligibility,
    estimateShares
  } = useStakeFVIX();

  const {
    plantAsync: executePlant,
    isLoading: isPlanting,
    data: plantTxHash,
    error: plantError,
    checkEligibility: checkPlantEligibility,
    needsFlowNetwork,
    switchToFlow
  } = usePlantSFVIX();

  const {
    allowance,
    approveAsync,
    isApproving,
    refetch: refetchAllowance
  } = useFVIXAllowance();

  const {
    canPlant: canPlantSFVIX,
    needsSwap,
    needsMint,
    needsStake,
    questCompleted
  } = useSFVIXPlantRequirements();

  // Get user balances
  const { data: flowBalance } = useBalance({
    address,
    chainId: flowMainnet.id,
    query: { enabled: !!address && isOnFlow }
  });

  const { data: frothBalance } = useBalance({
    address,
    token: FROTH_TOKEN,
    chainId: flowMainnet.id,
    query: { enabled: !!address && isOnFlow }
  });

  const { data: fvixBalance } = useBalance({
    address,
    token: FVIX_TOKEN,
    chainId: flowMainnet.id,
    query: { enabled: !!address && isOnFlow }
  });

  const { data: sFvixBalance } = useBalance({
    address,
    token: sFVIX_TOKEN,
    chainId: flowMainnet.id,
    query: { enabled: !!address && isOnFlow }
  });

  // Initialize quest when modal opens
  useEffect(() => {
    if (isSwapModalOpen && address) {
      initializeQuest(address);
    }
  }, [isSwapModalOpen, address, initializeQuest]);

  // Auto-progress through steps based on balances
  useEffect(() => {
    if (!isOnFlow || !address) return;

    // Check if user has enough FROTH to mint FVIX
    if (frothBalance && frothBalance.value >= FROTH_THRESHOLD && !mintCompleted) {
      if (currentStep === 'swap') {
        setCurrentStep('mint');
      }
    }

    // Check if user has FVIX to stake
    if (fvixBalance && fvixBalance.value > 0n && !stakeCompleted) {
      if (currentStep === 'mint' && mintCompleted) {
        setCurrentStep('stake');
      }
    }

    // Check if user has sFVIX to plant
    if (sFvixBalance && sFvixBalance.value > 0n && stakeCompleted) {
      if (currentStep === 'stake') {
        setCurrentStep('plant');
      }
    }
  }, [frothBalance, fvixBalance, sFvixBalance, currentStep, mintCompleted, stakeCompleted, isOnFlow, address]);

  const handleSwap = async () => {
    if (!address || !flowAmount || !isOnFlow) return;

    try {
      const hash = await executeSwap({
        flowAmount: flowAmount,
        slippageTolerance: 5 // 5% slippage
      });

      setSwapped(address, formatEther(frothBalance?.value || 0n));
      setSwapCompleted(true);
      
      addNotification({
        type: 'success',
        title: 'Swap Successful! 🔄',
        message: `Swapped ${flowAmount} FLOW for FROTH`
      });

      // Move to next step
      setCurrentStep('mint');
      
    } catch (err) {
      console.error('Swap failed:', err);
    }
  };

  const handleMint = async () => {
    if (!address || !frothAmount || !isOnFlow) return;

    try {
      const hash = await executeMint({
        frothAmount: frothAmount
      });

      setMinted(address, formatEther(fvixBalance?.value || 0n));
      setMintCompleted(true);
      
      addNotification({
        type: 'success',
        title: 'Mint Successful! 🪙',
        message: `Minted FVIX from ${frothAmount} FROTH`
      });

      // Move to next step
      setCurrentStep('stake');
      
    } catch (err) {
      console.error('Mint failed:', err);
    }
  };

  const handleApprove = async () => {
    if (!address || !fvixAmount) return;

    try {
      const amountWei = parseEther(fvixAmount);
      const hash = await approveAsync(amountWei);

      addNotification({
        type: 'success',
        title: 'Approval Successful! ✅',
        message: `Approved ${fvixAmount} FVIX for staking`
      });

      await refetchAllowance();
      
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const handleStake = async () => {
    if (!address || !fvixAmount || !isOnFlow) return;

    try {
      const hash = await executeStake({
        fvixAmount: fvixAmount
      });

      setStaked(address, formatEther(sFvixBalance?.value || 0n));
      setStakeCompleted(true);
      
      addNotification({
        type: 'success',
        title: 'Stake Successful! 🥩',
        message: `Staked ${fvixAmount} FVIX for sFVIX shares`
      });

      // Move to final step
      setCurrentStep('plant');
      
    } catch (err) {
      console.error('Stake failed:', err);
    }
  };

  const handlePlant = async () => {
    if (!address || !sFvixAmount || !isOnFlow) return;

    try {
      // For now, "planting" means completing the sFVIX volatility farming quest
      // The sFVIX tokens themselves represent your planted volatility position
      
      // Generate a quest completion record
      const questSeedId = Date.now();
      
      // Update quest progress - mark as planted (quest complete)
      setPlanted(address, sFvixAmount, questSeedId);
      
      addNotification({
        type: 'success',
        title: 'Flow Quest Complete! 🌱✨',
        message: `You now have ${sFvixAmount} sFVIX volatility tokens earning rewards on Flow network!`
      });

      // Close modal on successful quest completion
      handleClose();
      
    } catch (err) {
      console.error('Quest completion failed:', err);
      addNotification({
        type: 'error',
        title: 'Quest Failed',
        message: 'Unable to complete Flow quest. Please try again.'
      });
    }
  };

  const handleClose = () => {
    setFlowAmount('');
    setFrothAmount('');
    setFvixAmount('');
    setSFvixAmount('');
    setCurrentStep('swap');
    setSwapCompleted(false);
    setMintCompleted(false);
    setStakeCompleted(false);
    hideSwapModal();
  };

  const getStepBadgeVariant = (step: string) => {
    if (currentStep === step) return 'default';
    if ((step === 'swap' && swapCompleted) || 
        (step === 'mint' && mintCompleted) || 
        (step === 'stake' && stakeCompleted)) {
      return 'secondary';
    }
    return 'outline';
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'swap':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="flow-amount">FLOW Amount</Label>
              <Input
                id="flow-amount"
                type="number"
                placeholder="Enter FLOW amount"
                value={flowAmount}
                onChange={(e) => setFlowAmount(e.target.value)}
                min="0"
                step="0.01"
                className="text-lg"
              />
              <div className="text-sm text-gray-600">
                Balance: {flowBalance ? parseFloat(flowBalance.formatted).toLocaleString() : '0'} FLOW
              </div>
            </div>
            
            {flowAmount && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-sm text-blue-800">
                  Estimated output: ~{parseFloat(flowAmount) * 1000} FROTH
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Rate may vary based on liquidity
                </div>
              </div>
            )}
          </div>
        );

      case 'mint':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="froth-amount">FROTH Amount</Label>
              <Input
                id="froth-amount"
                type="number"
                placeholder="Enter FROTH amount (min 10,000)"
                value={frothAmount}
                onChange={(e) => setFrothAmount(e.target.value)}
                min="10000"
                step="1000"
                className="text-lg"
              />
              <div className="text-sm text-gray-600">
                Balance: {frothBalance ? parseFloat(frothBalance.formatted).toLocaleString() : '0'} FROTH
              </div>
            </div>
            
            {frothAmount && parseEther(frothAmount) >= FROTH_THRESHOLD && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-sm text-green-800">
                  Will mint: {(parseFloat(frothAmount) / 10000).toFixed(4)} FVIX
                </div>
                <div className="text-xs text-green-600 mt-1">
                  10,000 FROTH = 1 FVIX
                </div>
              </div>
            )}
          </div>
        );

      case 'stake':
        const needsApproval = fvixAmount && allowance !== undefined && parseEther(fvixAmount) > allowance;
        
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fvix-amount">FVIX Amount</Label>
              <Input
                id="fvix-amount"
                type="number"
                placeholder="Enter FVIX amount to stake"
                value={fvixAmount}
                onChange={(e) => setFvixAmount(e.target.value)}
                min="0"
                step="0.01"
                className="text-lg"
              />
              <div className="text-sm text-gray-600">
                Balance: {fvixBalance ? parseFloat(fvixBalance.formatted).toLocaleString() : '0'} FVIX
              </div>
            </div>

            {needsApproval && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="text-sm text-yellow-800">
                  Approval required before staking
                </div>
              </div>
            )}
            
            {fvixAmount && !needsApproval && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="text-sm text-purple-800">
                  Will receive: ~{fvixAmount} sFVIX shares
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  sFVIX earns continuous rewards
                </div>
              </div>
            )}
          </div>
        );

      case 'plant':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sfvix-amount">sFVIX Amount</Label>
              <Input
                id="sfvix-amount"
                type="number"
                placeholder="Enter sFVIX amount to plant (min 1)"
                value={sFvixAmount}
                onChange={(e) => setSFvixAmount(e.target.value)}
                min="1"
                step="0.1"
                className="text-lg"
              />
              <div className="text-sm text-gray-600">
                Balance: {sFvixBalance ? parseFloat(sFvixBalance.formatted).toLocaleString() : '0'} sFVIX
              </div>
            </div>
            
            {sFvixAmount && parseFloat(sFvixAmount) >= 1 && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-sm text-green-800">
                  Will grow: sFVIX Volatility Plant
                </div>
                <div className="text-xs text-green-600 mt-1">
                  24hr growth time • 8% APY • Flow network rewards
                </div>
              </div>
            )}

            {!canPlantSFVIX && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="text-sm text-red-800 font-medium">Quest Requirements</div>
                <div className="text-xs text-red-600 mt-1 space-y-1">
                  {needsSwap && <div>❌ Swap FLOW → FROTH</div>}
                  {needsMint && <div>❌ Mint FROTH → FVIX</div>}
                  {needsStake && <div>❌ Stake FVIX → sFVIX</div>}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getConfirmAction = () => {
    switch (currentStep) {
      case 'swap':
        return handleSwap;
      case 'mint':
        return handleMint;
      case 'stake':
        const needsApproval = fvixAmount && allowance !== undefined && parseEther(fvixAmount) > allowance;
        return needsApproval ? handleApprove : handleStake;
      case 'plant':
        return handlePlant;
      default:
        return () => {};
    }
  };

  const getConfirmText = () => {
    switch (currentStep) {
      case 'swap':
        return `Swap ${flowAmount || '0'} FLOW`;
      case 'mint':
        return `Mint ${frothAmount || '0'} FROTH`;
      case 'stake':
        const needsApproval = fvixAmount && allowance !== undefined && parseEther(fvixAmount) > allowance;
        return needsApproval ? `Approve ${fvixAmount || '0'} FVIX` : `Stake ${fvixAmount || '0'} FVIX`;
      case 'plant':
        return `Plant ${sFvixAmount || '0'} sFVIX`;
      default:
        return 'Continue';
    }
  };

  const isConfirmDisabled = () => {
    switch (currentStep) {
      case 'swap':
        return !flowAmount || parseFloat(flowAmount) <= 0 || isSwapping;
      case 'mint':
        return !frothAmount || parseEther(frothAmount) < FROTH_THRESHOLD || isMinting;
      case 'stake':
        return !fvixAmount || parseFloat(fvixAmount) <= 0 || isStaking || isApproving;
      case 'plant':
        return !sFvixAmount || parseFloat(sFvixAmount) < 1 || isPlanting || !canPlantSFVIX;
      default:
        return true;
    }
  };

  const getCurrentTxHash = () => {
    switch (currentStep) {
      case 'swap': return swapTxHash;
      case 'mint': return mintTxHash;
      case 'stake': return stakeTxHash;
      case 'plant': return plantTxHash;
      default: return undefined;
    }
  };

  const getCurrentError = () => {
    switch (currentStep) {
      case 'swap': return swapError;
      case 'mint': return mintError;
      case 'stake': return stakeError;
      case 'plant': return plantError;
      default: return null;
    }
  };

  if (!isOnFlow) {
    return (
      <TxModal
        isOpen={isSwapModalOpen}
        onClose={handleClose}
        title="Network Not Supported"
        description="Flow DeFi operations require Flow Network connection"
        showCancel={true}
        cancelText="Close"
      >
        <div className="text-center py-4">
          <div className="text-4xl mb-4">🌊</div>
          <p className="text-gray-600">
            Please switch to Flow Network to access the complete DeFi pipeline.
          </p>
          <Button 
            onClick={switchToFlow} 
            className="mt-4"
            disabled={needsFlowNetwork}
          >
            Switch to Flow
          </Button>
        </div>
      </TxModal>
    );
  }

  return (
    <TxModal
      isOpen={isSwapModalOpen}
      onClose={handleClose}
      title="🌊 Flow DeFi Pipeline"
      description="Complete the FLOW → FROTH → FVIX → sFVIX → Plant journey"
      onConfirm={getConfirmAction()}
      confirmText={getConfirmText()}
      confirmDisabled={isConfirmDisabled()}
      isLoading={isSwapping || isMinting || isStaking || isApproving || isPlanting}
      txHash={getCurrentTxHash()}
      error={getCurrentError()}
    >
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant={getStepBadgeVariant('swap')} className="text-xs">
            1. Swap {swapCompleted && '✓'}
          </Badge>
          <Badge variant={getStepBadgeVariant('mint')} className="text-xs">
            2. Mint {mintCompleted && '✓'}
          </Badge>
          <Badge variant={getStepBadgeVariant('stake')} className="text-xs">
            3. Stake {stakeCompleted && '✓'}
          </Badge>
          <Badge variant={getStepBadgeVariant('plant')} className="text-xs">
            4. Plant
          </Badge>
        </div>

        {/* Current Step Content */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">
            {currentStep === 'swap' && '🔄 Step 1: Swap FLOW → FROTH'}
            {currentStep === 'mint' && '🪙 Step 2: Mint FROTH → FVIX'}
            {currentStep === 'stake' && '🥩 Step 3: Stake FVIX → sFVIX'}
            {currentStep === 'plant' && '🌱 Step 4: Plant sFVIX Seeds'}
          </h3>
          
          {renderStepContent()}
        </div>

        {/* Flow Details */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Network:</span>
            <span className="font-medium">Flow Mainnet</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Current Step:</span>
            <span className="font-medium capitalize">{currentStep}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Quest Progress:</span>
            <span className="font-medium">
              {[swapCompleted, mintCompleted, stakeCompleted].filter(Boolean).length}/3 Complete
            </span>
          </div>
        </div>
      </div>
    </TxModal>
  );
}