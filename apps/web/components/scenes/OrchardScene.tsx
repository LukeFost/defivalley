import { useUI } from '@/app/store';
import { BuildingInteractionScene } from './BuildingInteractionScene';

/**
 * OrchardScene component for FVIX → sFVIX staking
 * Displays when user interacts with the Orchard building
 */
export function OrchardScene() {
  const { isOrchardModalOpen, hideOrchardModal, showStakeModal } = useUI();

  const handleStakeClick = () => {
    hideOrchardModal();
    showStakeModal();
  };

  const handleClose = () => {
    hideOrchardModal();
  };

  const sceneConfig = {
    emoji: '🌳',
    title: 'Sacred FVIX Orchard',
    description: 'A serene grove where FVIX tokens grow into yield-bearing sFVIX',
    backdropEmoji: '🌳',
    backdropText: 'Sacred Orchard',
    npcEmoji: '🧝‍♂️',
    npcDialogue: '"Welcome to the Sacred Orchard, dear traveler! Here, your FVIX tokens can take root and flourish. Plant them in our staking vault and watch them grow into sFVIX - bearing fruit through yield rewards over time!"',
    actionButtonText: '🌱 Stake FVIX → sFVIX',
    leaveButtonText: '🚶‍♀️ Leave Orchard',
    walletHint: 'Connect your wallet to start staking',
    gradientFrom: 'from-green-100',
    gradientTo: 'to-green-200',
    borderColor: 'border-green-300',
    buttonBg: 'bg-green-600',
    buttonHoverBg: 'hover:bg-green-700',
    infoPanelConfig: {
      bgColor: 'bg-green-50',
      textColor: 'text-green-800',
      title: '🌟 Staking Benefits:',
      items: [
        '• Earn yield rewards over time',
        '• sFVIX represents your staked position',
        '• Claim rewards anytime without unstaking'
      ]
    }
  };

  return (
    <BuildingInteractionScene
      isOpen={isOrchardModalOpen}
      onClose={handleClose}
      onActionClick={handleStakeClick}
      config={sceneConfig}
    />
  );
}