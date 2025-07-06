import { useUI } from '@/app/store';
import { InteractiveBuildingScene } from './InteractiveBuildingScene';

/**
 * WellScene component for FROTH → FVIX minting
 * Full-screen interactive dialogue with the Well NPC
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

  const npcConfig = {
    npcName: 'Sorceress Lyralei',
    greeting: "Ah, a seeker of the ancient art! I am Sorceress Lyralei, keeper of this mystical well. For centuries, these waters have flowed with magical energies that can transform FROTH into the precious FVIX tokens. The ritual requires focus, patience, and a minimum offering of 10,000 FROTH to awaken the well's power.",
    backgroundColorHex: 0x4169E1, // Royal blue for mystical theme
    actionChoiceText: 'I want to mint FVIX with FROTH',
    actionCallback: handleMintClick,
    infoChoiceText: 'Tell me about the minting ritual',
    infoDialogue: "The minting ritual is both ancient and precise! You must bring at least 10,000 FROTH tokens as an offering to the well. First, you'll need to approve your FROTH for the FVIX contract - this grants permission for the magical transformation. Then, the well will convert your FROTH into FVIX at the sacred exchange rate. Are you prepared to begin the ritual?",
    leaveText: '🚶 Step away from the well'
  };

  return (
    <InteractiveBuildingScene
      isOpen={isWellModalOpen}
      onClose={handleClose}
      config={npcConfig}
      sceneKey="well"
    />
  );
}