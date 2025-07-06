import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAccount } from 'wagmi';

interface SceneConfig {
  emoji: string;
  title: string;
  description: string;
  backdropEmoji: string;
  backdropText: string;
  npcEmoji: string;
  npcDialogue: string;
  actionButtonText: string;
  actionButtonSecondaryText?: string;
  leaveButtonText: string;
  walletHint: string;
  // Theme colors
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  buttonBg: string;
  buttonHoverBg: string;
  // Optional info panel
  infoPanelConfig?: {
    bgColor: string;
    textColor: string;
    title: string;
    items: string[];
  };
  // Optional network-specific config
  networkConfig?: {
    targetChainId: number;
    currentChainId?: number;
    switchText: string;
  };
}

interface BuildingInteractionSceneProps {
  isOpen: boolean;
  onClose: () => void;
  onActionClick: () => void;
  config: SceneConfig;
}

/**
 * Generic BuildingInteractionScene component
 * Handles the common structure for all building interaction modals (Corral, Orchard, Well)
 */
export function BuildingInteractionScene({ 
  isOpen, 
  onClose, 
  onActionClick, 
  config 
}: BuildingInteractionSceneProps) {
  const { address } = useAccount();

  // Determine if we need to switch networks
  const needsNetworkSwitch = config.networkConfig && 
    config.networkConfig.currentChainId !== config.networkConfig.targetChainId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {config.emoji} {config.title}
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-6">
          {/* Scene backdrop/illustration */}
          <div className={`w-full h-48 bg-gradient-to-b ${config.gradientFrom} ${config.gradientTo} rounded-lg flex items-center justify-center border-2 ${config.borderColor}`}>
            <div className="text-center">
              <div className="text-6xl mb-2">{config.backdropEmoji}</div>
              <p className={`font-medium ${config.borderColor.replace('border-', 'text-').replace('-300', '-800')}`}>
                {config.backdropText}
              </p>
            </div>
          </div>

          {/* NPC Dialogue */}
          <div className="bg-white rounded-lg p-4 border-2 border-gray-200 shadow-lg max-w-lg">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">{config.npcEmoji}</div>
              <div>
                <p className="text-gray-800 leading-relaxed">
                  {config.npcDialogue}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <Button
              onClick={onActionClick}
              className={`flex-1 ${config.buttonBg} ${config.buttonHoverBg} text-white font-semibold py-3`}
              disabled={!address}
            >
              {needsNetworkSwitch && config.actionButtonSecondaryText 
                ? config.actionButtonSecondaryText 
                : config.actionButtonText
              }
            </Button>
            
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 py-3"
            >
              {config.leaveButtonText}
            </Button>
          </div>

          {/* Status Messages */}
          {!address && (
            <p className="text-sm text-gray-500 text-center">
              {config.walletHint}
            </p>
          )}
          
          {/* Network Switch Message */}
          {address && needsNetworkSwitch && config.networkConfig && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-yellow-800 text-sm">
                {config.networkConfig.switchText}
              </p>
            </div>
          )}

          {/* Optional Info Panel */}
          {config.infoPanelConfig && (
            <div className={`${config.infoPanelConfig.bgColor} rounded-lg p-3 text-sm ${config.infoPanelConfig.textColor} text-center max-w-lg`}>
              <p className="font-medium">{config.infoPanelConfig.title}</p>
              {config.infoPanelConfig.items.map((item, index) => (
                <p key={index}>{item}</p>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}