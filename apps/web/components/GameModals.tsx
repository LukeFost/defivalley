'use client';

import { useCallback } from 'react';
import { MorphoDepositModal } from './MorphoDepositModal';
import { MarketplaceModal } from './MarketplaceModal';
import { FlowSwapModal } from './FlowSwapModal';
import { FlowStakingModal } from './FlowStakingModal';
import { PepeModal } from './PepeModal';

interface GameModalsProps {
  // Modal visibility states
  showMorphoModal: boolean;
  showMarketplaceModal: boolean;
  showFlowStakingModal: boolean;
  showFlowSwapModal: boolean;
  showPepeModal: boolean;
  
  // Modal close handlers
  onCloseMorpho: () => void;
  onCloseMarketplace: () => void;
  onCloseFlowStaking: () => void;
  onCloseFlowSwap: () => void;
  onClosePepe: () => void;
}

export function GameModals({
  showMorphoModal,
  showMarketplaceModal,
  showFlowStakingModal,
  showFlowSwapModal,
  showPepeModal,
  onCloseMorpho,
  onCloseMarketplace,
  onCloseFlowStaking,
  onCloseFlowSwap,
  onClosePepe,
}: GameModalsProps) {
  return (
    <>
      {/* Morpho Deposit Modal */}
      <MorphoDepositModal
        isOpen={showMorphoModal}
        onClose={onCloseMorpho}
      />

      {/* Marketplace Modal */}
      <MarketplaceModal
        isOpen={showMarketplaceModal}
        onClose={onCloseMarketplace}
      />

      {/* Flow Staking Modal */}
      <FlowStakingModal
        isOpen={showFlowStakingModal}
        onClose={onCloseFlowStaking}
      />

      {/* Flow Swap Modal */}
      <FlowSwapModal
        isOpen={showFlowSwapModal}
        onClose={onCloseFlowSwap}
      />

      {/* Pepe Modal */}
      <PepeModal
        isOpen={showPepeModal}
        onClose={onClosePepe}
      />
    </>
  );
}