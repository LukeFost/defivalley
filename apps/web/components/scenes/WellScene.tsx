import { useUI } from '@/app/store';
import { FlowInteractiveScene } from './FlowInteractiveScene';

/**
 * WellScene component for FROTH → FVIX minting
 * Full-screen interactive dialogue with direct transaction handling
 */
export function WellScene() {
  const { isWellModalOpen, hideWellModal } = useUI();

  const handleClose = () => {
    hideWellModal();
  };

  const npcConfig = {
    npcName: 'Sorceress Lyralei',
    greeting: "Ah, a seeker of the ancient art! I am Sorceress Lyralei, keeper of this mystical well. For centuries, these waters have flowed with magical energies that can transform FROTH into the precious FVIX tokens. Are you ready to begin the minting ritual?",
    backgroundColorHex: 0x4169E1, // Royal blue for mystical theme
    buildingType: 'well' as const,
  };

  return (
    <FlowInteractiveScene
      isOpen={isWellModalOpen}
      onClose={handleClose}
      config={npcConfig}
    />
  );
}