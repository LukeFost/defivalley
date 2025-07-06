import { useUI } from '@/app/store';
import { BuildingInteractionScene } from './BuildingInteractionScene';

/**
 * WellScene component for FROTH → FVIX minting
 * Displays when user interacts with the Well building
 */
export function WellScene() {
  const { isWellModalOpen, hideWellModal, showMintModal } = useUI();

  const handleMintClick = () => {
    hideWellModal();
    showMintModal();
  };

  const handleClose = () => {
    hideWellModal();
  };

  const sceneConfig = {
    emoji: '🪣',
    title: 'Ancient FVIX Well',
    description: 'A mystical well where FROTH transforms into powerful FVIX tokens',
    backdropEmoji: '⛲',
    backdropText: 'Mystical Well',
    npcEmoji: '🧙‍♀️',
    npcDialogue: '"Ah, a seeker of the ancient art! This well has flowed with magical energies for centuries. Bring forth your FROTH, and I shall help you mint the precious FVIX tokens. Remember, the minimum offering is 10,000 FROTH!"',
    actionButtonText: '⚡ Mint FVIX with FROTH',
    leaveButtonText: '🚶 Leave Well',
    walletHint: 'Connect your wallet to begin minting',
    gradientFrom: 'from-blue-100',
    gradientTo: 'to-blue-200',
    borderColor: 'border-blue-300',
    buttonBg: 'bg-blue-600',
    buttonHoverBg: 'hover:bg-blue-700',
    infoPanelConfig: {
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
      title: '💡 Minting Requirements:',
      items: [
        '• Minimum 10,000 FROTH tokens',
        '• FROTH must be approved for the FVIX contract'
      ]
    }
  };

  return (
    <BuildingInteractionScene
      isOpen={isWellModalOpen}
      onClose={handleClose}
      onActionClick={handleMintClick}
      config={sceneConfig}
    />
  );
}