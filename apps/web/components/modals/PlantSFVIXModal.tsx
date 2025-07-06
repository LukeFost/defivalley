import { useState, useEffect } from 'react';
import { useChainId, useAccount, useBalance } from 'wagmi';
import { TxModal } from './TxModal';
import { useUI, useFlowQuest, useAppStore } from '@/app/store';
import { useSFVIXPlantStats, useSFVIXPlantRequirements } from '@/lib/hooks/usePlantSFVIX';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { flowMainnet } from '@/app/wagmi';
import { parseEther, formatEther } from 'viem';
import { sFVIX_TOKEN } from '@/../packages/contracts/flow/constants';

/**
 * Simple sFVIX Plant Modal - Quick implementation for planting sFVIX tokens
 * This creates a "planted" record in the store without visual game integration
 */
export function PlantSFVIXModal() {
  const { ui, addOptimisticSeed } = useAppStore();
  const { hideSwapModal, addNotification } = useUI();
  const { address } = useAccount();
  const chainId = useChainId();
  const { setPlanted, initializeQuest } = useFlowQuest();
  
  const [sFvixAmount, setSFvixAmount] = useState('');
  const [isPlanting, setIsPlanting] = useState(false);

  const isOnFlow = chainId === flowMainnet.id;

  // Get user's sFVIX balance
  const { data: sFvixBalance } = useBalance({
    address,
    token: sFVIX_TOKEN,
    chainId: flowMainnet.id,
    query: { enabled: !!address }
  });

  const {
    sFvixBalance: currentBalance,
    formattedBalance,
    pendingRewards,
    formattedRewards,
    hasBalance
  } = useSFVIXPlantStats();

  const {
    canPlant,
    needsSwap,
    needsMint,
    needsStake,
    questCompleted
  } = useSFVIXPlantRequirements();

  // Initialize quest when modal opens
  useEffect(() => {
    if (ui.showSwapModal && address) {
      initializeQuest(address);
    }
  }, [ui.showSwapModal, address, initializeQuest]);

  const handlePlant = async () => {
    if (!address || !sFvixAmount || !isOnFlow) return;

    setIsPlanting(true);
    try {
      // Simple implementation: just add to store as planted seed
      const plantAmount = parseEther(sFvixAmount);
      const seedId = addOptimisticSeed(
        4, // sFVIX seed type
        plantAmount,
        `sfvix_plant_${Date.now()}`
      );

      // Update quest progress
      setPlanted(address, sFvixAmount, seedId);
      
      addNotification({
        type: 'success',
        title: 'sFVIX Plant Created! 🌱',
        message: `Planted ${sFvixAmount} sFVIX as volatility plant #${seedId}`
      });

      // Reset and close
      setSFvixAmount('');
      hideSwapModal();
      
    } catch (err) {
      console.error('Plant failed:', err);
      addNotification({
        type: 'error',
        title: 'Plant Failed',
        message: 'Unable to create sFVIX plant. Please try again.'
      });
    } finally {
      setIsPlanting(false);
    }
  };

  const handleClose = () => {
    setSFvixAmount('');
    hideSwapModal();
  };

  const handleMaxAmount = () => {
    if (sFvixBalance) {
      setSFvixAmount(sFvixBalance.formatted);
    }
  };

  const isValidAmount = sFvixAmount && parseFloat(sFvixAmount) >= 1;
  const hasEnoughBalance = sFvixBalance && isValidAmount && parseEther(sFvixAmount) <= sFvixBalance.value;

  if (!isOnFlow) {
    return (
      <TxModal
        isOpen={ui.showSwapModal}
        onClose={handleClose}
        title="Network Not Supported"
        description="sFVIX planting requires Flow Network connection"
        showCancel={true}
        cancelText="Close"
      >
        <div className="text-center py-4">
          <div className="text-4xl mb-4">🌊</div>
          <p className="text-gray-600">
            Please switch to Flow Network to plant sFVIX seeds.
          </p>
        </div>
      </TxModal>
    );
  }

  return (
    <TxModal
      isOpen={ui.showSwapModal}
      onClose={handleClose}
      title="🌱 Plant sFVIX Volatility Seeds"
      description="Convert your sFVIX tokens into planted volatility positions"
      onConfirm={handlePlant}
      confirmText={`Plant ${sFvixAmount || '0'} sFVIX`}
      confirmDisabled={!isValidAmount || !hasEnoughBalance || isPlanting || !canPlant}
      isLoading={isPlanting}
    >
      <div className="space-y-6">
        {/* Quest Requirements Check */}
        {!canPlant && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="text-sm text-yellow-800 font-medium mb-2">
              Complete Flow Quest First:
            </div>
            <div className="text-xs text-yellow-600 space-y-1">
              {needsSwap && <div>❌ Swap FLOW → FROTH</div>}
              {needsMint && <div>❌ Mint FROTH → FVIX</div>}
              {needsStake && <div>❌ Stake FVIX → sFVIX</div>}
              {!needsSwap && !needsMint && !needsStake && <div>✅ Ready to plant!</div>}
            </div>
          </div>
        )}

        {/* sFVIX Balance Display */}
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-purple-800 font-medium">Your sFVIX Balance:</span>
            <span className="text-purple-900 font-bold">
              {sFvixBalance ? parseFloat(sFvixBalance.formatted).toLocaleString() : '0'} sFVIX
            </span>
          </div>
          {pendingRewards > 0n && (
            <div className="text-xs text-purple-600">
              Pending rewards: {formattedRewards} FVIX
            </div>
          )}
        </div>

        {/* Plant Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="sfvix-amount">sFVIX Amount to Plant</Label>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleMaxAmount}
              className="h-6 px-2 text-xs"
              disabled={!hasBalance}
            >
              Max
            </Button>
          </div>
          <Input
            id="sfvix-amount"
            type="number"
            placeholder="Enter sFVIX amount (min 1.0)"
            value={sFvixAmount}
            onChange={(e) => setSFvixAmount(e.target.value)}
            min="1"
            step="0.1"
            className="text-lg"
          />
          {!hasBalance && (
            <p className="text-yellow-600 text-sm">
              You need sFVIX tokens to plant. Complete the Flow quest first.
            </p>
          )}
          {isValidAmount && !hasEnoughBalance && (
            <p className="text-red-500 text-sm">
              Insufficient sFVIX balance
            </p>
          )}
        </div>

        {/* Plant Preview */}
        {isValidAmount && hasEnoughBalance && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-800 font-medium mb-2">
              Will create: sFVIX Volatility Plant
            </div>
            <div className="text-xs text-green-600 space-y-1">
              <div>• Amount: {sFvixAmount} sFVIX locked</div>
              <div>• Growth time: 24 hours</div>
              <div>• Estimated APY: 8% (Flow network rewards)</div>
              <div>• Harvestable: Flow volatility yields</div>
            </div>
          </div>
        )}

        {/* Plant Details */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Network:</span>
            <span className="font-medium">Flow Mainnet</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Seed Type:</span>
            <span className="font-medium">sFVIX Volatility Plant</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Implementation:</span>
            <span className="font-medium text-yellow-600">Store-based (Quick)</span>
          </div>
        </div>
      </div>
    </TxModal>
  );
}