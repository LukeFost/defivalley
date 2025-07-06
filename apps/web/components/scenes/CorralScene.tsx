import { useUI } from '@/app/store';
import { useChainId } from 'wagmi';
import { flowMainnet } from '@/app/wagmi';
import { SimpleInteractiveScene } from './SimpleInteractiveScene';

/**
 * CorralScene component for Flow → FROTH swapping
 * Full-screen interactive dialogue that opens SwapModal
 */
export function CorralScene() {
  const { isCorralModalOpen, hideCorralModal, showSwapModal } = useUI();
  const chainId = useChainId();
  
  const isOnFlow = chainId === flowMainnet.id;
  
  // Only render this scene on Flow network
  if (!isOnFlow || !isCorralModalOpen) {
    return null;
  }

  const handleSwapClick = () => {
    hideCorralModal();
    showSwapModal();
  };

  const handleClose = () => {
    hideCorralModal();
  };

  const npcConfig = {
    npcName: 'Cowboy Pete',
    greeting: "Howdy, partner! Welcome to the Flow Trading Corral. I handle all the token trading in these parts. Ready to swap some FLOW for FROTH? I'll guide you through the whole process!",
    backgroundColorHex: 0xD2691E, // Saddle brown for western theme
    actionChoiceText: 'I want to swap FLOW → FROTH',
    actionCallback: handleSwapClick,
    infoChoiceText: 'Tell me about the trading process',
    infoDialogue: "Well partner, it's simple as can be! You give me your FLOW tokens, and I'll swap them for FROTH using our advanced DEX. The rates are fair and the process is instant. Your FROTH tokens will be the gateway to the rest of your DeFi valley journey!",
    leaveText: '👋 Tip my hat and leave'
  };

  return (
    <SimpleInteractiveScene
      isOpen={isCorralModalOpen}
      onClose={handleClose}
      config={npcConfig}
      sceneKey="corral"
    />
  );
}