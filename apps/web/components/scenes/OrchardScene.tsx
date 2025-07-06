import { useUI } from '@/app/store';
import { InteractiveBuildingScene } from './InteractiveBuildingScene';

/**
 * OrchardScene component for FVIX → sFVIX staking
 * Full-screen interactive dialogue with the Orchard NPC
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

  const npcConfig = {
    npcName: 'Elder Thessa',
    greeting: "Welcome to the Sacred Orchard, dear traveler! I am Elder Thessa, guardian of this mystical grove. Here, your FVIX tokens can take root and flourish into sFVIX, bearing fruit through yield rewards over time. Once you have sFVIX, you can plant them as volatility crops in the valley's fertile soil!",
    backgroundColorHex: 0x228B22, // Forest green for orchard theme
    actionChoiceText: 'I want to stake FVIX → sFVIX',
    actionCallback: handleStakeClick,
    infoChoiceText: 'Tell me about sFVIX planting',
    infoDialogue: "Ah, the ancient art of volatility farming! Once you've staked FVIX into sFVIX here in my orchard, those sFVIX tokens can be planted as special crops in DeFi Valley. These aren't ordinary seeds - they're volatility plants that grow with the Flow network's market movements! Visit the Trading Corral when you have sFVIX tokens, and they can help you plant them as crops that earn real yields while you tend your digital farm.",
    leaveText: '🚶‍♀️ Leave the sacred grove'
  };

  return (
    <InteractiveBuildingScene
      isOpen={isOrchardModalOpen}
      onClose={handleClose}
      config={npcConfig}
      sceneKey="orchard"
    />
  );
}