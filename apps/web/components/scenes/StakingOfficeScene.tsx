import { useUI } from '@/app/store';
import { InteractiveBuildingScene } from './InteractiveBuildingScene';

/**
 * StakingOfficeScene component for general staking operations
 * Full-screen interactive dialogue with the Staking Office NPC
 * This is a new building dedicated to staking services
 */
export function StakingOfficeScene() {
  const { isStakingOfficeModalOpen, hideStakingOfficeModal, showStakeModal } = useUI();

  const handleStakeClick = () => {
    hideStakingOfficeModal();
    showStakeModal();
  };

  const handleClose = () => {
    hideStakingOfficeModal();
  };

  const npcConfig = {
    npcName: 'Eager Businessman',
    greeting: "Welcome, traveler! I've heard great things about your farm. I have a proposition for you - I want to stake in your business! Your FVIX tokens can help my venture grow, and you'll earn rewards in return. This is exactly the opportunity you've been looking for!",
    backgroundColorHex: 0x2C3E50, // Dark blue-grey for professional theme
    actionChoiceText: 'I just want to stake now.',
    actionCallback: handleStakeClick,
    infoChoiceText: 'Tell me more about the risks.',
    infoDialogue: "Of course, every venture has risks. The value of rewards can fluctuate with market conditions. But I believe the potential is immense! Your FVIX tokens will be working hard while you tend to your farm, earning you passive rewards. The longer you stake, the better the multiplier. Are you ready to start earning?",
    leaveText: 'No, thank you.'
  };

  return (
    <InteractiveBuildingScene
      isOpen={isStakingOfficeModalOpen}
      onClose={handleClose}
      config={npcConfig}
      sceneKey="staking-office"
    />
  );
}