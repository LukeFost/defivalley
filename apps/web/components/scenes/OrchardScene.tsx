import { useUI } from '@/app/store';
import { FlowInteractiveScene } from './FlowInteractiveScene';

/**
 * OrchardScene component for FVIX → sFVIX staking
 * Full-screen interactive dialogue with direct transaction handling
 */
export function OrchardScene() {
  const { isOrchardModalOpen, hideOrchardModal } = useUI();

  const handleClose = () => {
    hideOrchardModal();
  };

  const npcConfig = {
    npcName: 'Elder Thessa',
    greeting: "Welcome to the Sacred Orchard, dear traveler! I am Elder Thessa, guardian of this mystical grove. Here, your FVIX tokens can take root and flourish into sFVIX, bearing fruit through yield rewards over time. Ready to stake your FVIX tokens?",
    backgroundColorHex: 0x228B22, // Forest green for orchard theme
    buildingType: 'orchard' as const,
  };

  return (
    <FlowInteractiveScene
      isOpen={isOrchardModalOpen}
      onClose={handleClose}
      config={npcConfig}
    />
  );
}