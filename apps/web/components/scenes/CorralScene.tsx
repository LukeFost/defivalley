import { useUI } from '@/app/store';
import { useChainId, useSwitchChain } from 'wagmi';
import { flowMainnet } from '@/app/wagmi';
import { BuildingInteractionScene } from './BuildingInteractionScene';

/**
 * CorralScene component for Flow → FROTH swapping
 * Displays when user interacts with the Corral building
 */
export function CorralScene() {
  const { isCorralModalOpen, hideCorralModal, showSwapModal } = useUI();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  const isOnFlow = chainId === flowMainnet.id;

  const handleSwapClick = () => {
    if (!isOnFlow) {
      // Switch to Flow network first
      switchChain({ chainId: flowMainnet.id });
      return;
    }
    
    hideCorralModal();
    showSwapModal();
  };

  const handleClose = () => {
    hideCorralModal();
  };

  const sceneConfig = {
    emoji: '🐴',
    title: 'Flow Trading Corral',
    description: 'Welcome to the rustic trading post where Flow tokens flow like water',
    backdropEmoji: '🐎',
    backdropText: 'Trading Corral',
    npcEmoji: '🤠',
    npcDialogue: '"Howdy, partner! Looking to swap some Flow tokens for FROTH? You\'ve come to the right place. This here corral has the finest trading rates in all the valley!"',
    actionButtonText: '🔄 Swap FLOW → FROTH',
    actionButtonSecondaryText: '🔗 Switch to Flow Network',
    leaveButtonText: '👋 Leave Corral',
    walletHint: 'Connect your wallet to start trading',
    gradientFrom: 'from-amber-100',
    gradientTo: 'to-amber-200',
    borderColor: 'border-amber-300',
    buttonBg: 'bg-amber-600',
    buttonHoverBg: 'hover:bg-amber-700',
    networkConfig: {
      targetChainId: flowMainnet.id,
      currentChainId: chainId,
      switchText: '🌊 Switch to Flow Network to access FLOW token trading'
    }
  };

  return (
    <BuildingInteractionScene
      isOpen={isCorralModalOpen}
      onClose={handleClose}
      onActionClick={handleSwapClick}
      config={sceneConfig}
    />
  );
}