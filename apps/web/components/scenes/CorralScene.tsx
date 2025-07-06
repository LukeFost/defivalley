import { useUI } from '@/app/store';
import { useChainId, useSwitchChain } from 'wagmi';
import { flowMainnet } from '@/app/wagmi';
import { InteractiveBuildingScene } from './InteractiveBuildingScene';

/**
 * CorralScene component for Flow → FROTH swapping
 * Full-screen interactive dialogue with the Corral NPC
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

  const npcConfig = {
    npcName: 'Cowboy Pete',
    greeting: "Howdy, partner! Welcome to the Flow Trading Corral. I handle all the token trading in these parts - from FLOW to FROTH swaps, all the way to helping folks plant their sFVIX volatility crops! This here's your one-stop shop for the complete Flow DeFi journey.",
    backgroundColorHex: 0xD2691E, // Saddle brown for western theme
    actionChoiceText: 'Start my Flow journey (FLOW→FROTH→FVIX→sFVIX)',
    actionCallback: handleSwapClick,
    infoChoiceText: 'Tell me about sFVIX volatility farming',
    infoDialogue: "Well I'll be! You're asking about the advanced stuff, partner. See, once you complete the full journey - swapping FLOW to FROTH at my corral, minting FVIX at the Ancient Well, and staking for sFVIX at the Sacred Orchard - then you can plant those sFVIX tokens as special volatility crops right here in the valley! These ain't your ordinary crops - they grow with the Flow network's market movements and earn real yields. It's the future of farming, I tell ya!",
    leaveText: '👋 Tip my hat and leave'
  };

  return (
    <InteractiveBuildingScene
      isOpen={isCorralModalOpen}
      onClose={handleClose}
      config={npcConfig}
      sceneKey="corral"
    />
  );
}