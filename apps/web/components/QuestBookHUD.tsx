import { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useFlowQuest, useUI } from '@/app/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, BookOpen, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { flowMainnet } from '@/app/wagmi';

/**
 * QuestBookHUD - Interactive quest tracker for Flow Network integration
 * Shows progress through FLOW → FROTH → FVIX → sFVIX journey
 */
export function QuestBookHUD() {
  const { address } = useAccount();
  const chainId = useChainId();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { quest } = useFlowQuest();
  const {
    showSwapModal,
    showMintModal,
    showStakeModal,
    showCorralModal,
    showWellModal,
    showOrchardModal
  } = useUI();
  
  const isOnFlow = chainId === flowMainnet.id;
  
  // Don't show if not connected or not on Flow
  if (!address || !isOnFlow) {
    return null;
  }
  
  // Quest step definitions
  const questSteps = [
    {
      id: 'swap',
      title: 'Trade FLOW → FROTH',
      description: 'Use PunchSwap to convert FLOW tokens to FROTH',
      status: quest?.currentStep === 'SWAPPED' || quest?.completedSteps.includes('SWAPPED') ? 'completed' : 'pending',
      action: () => showSwapModal(),
      actionText: 'Swap Tokens',
      building: 'Corral',
      buildingAction: () => showCorralModal()
    },
    {
      id: 'mint',
      title: 'Mint FROTH → FVIX',
      description: 'Mint FVIX tokens with 10,000+ FROTH',
      status: quest?.currentStep === 'MINTED' || quest?.completedSteps.includes('MINTED') ? 'completed' : 
              quest?.completedSteps.includes('SWAPPED') ? 'available' : 'locked',
      action: () => showMintModal(),
      actionText: 'Mint Tokens',
      building: 'Well',
      buildingAction: () => showWellModal()
    },
    {
      id: 'stake',
      title: 'Stake FVIX → sFVIX',
      description: 'Stake FVIX to earn sFVIX shares and rewards',
      status: quest?.currentStep === 'STAKED' || quest?.completedSteps.includes('STAKED') ? 'completed' :
              quest?.completedSteps.includes('MINTED') ? 'available' : 'locked',
      action: () => showStakeModal(),
      actionText: 'Stake Tokens',
      building: 'Orchard',
      buildingAction: () => showOrchardModal()
    }
  ];
  
  const completedSteps = questSteps.filter(step => step.status === 'completed').length;
  const totalSteps = questSteps.length;
  const isQuestComplete = completedSteps === totalSteps;
  
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'available':
        return <Circle className="w-5 h-5 text-blue-500" />;
      case 'locked':
        return <Circle className="w-5 h-5 text-gray-400" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };
  
  const getStepBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'available':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'locked':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      <Card className="bg-white/95 backdrop-blur-sm shadow-lg border border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg text-blue-900">Flow Quest</CardTitle>
              {isQuestComplete && (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  ✅ Complete
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
          <CardDescription className="text-sm text-blue-700">
            Progress: {completedSteps}/{totalSteps} steps completed
          </CardDescription>
          
          {/* Progress Bar */}
          <div className="w-full bg-blue-100 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
            />
          </div>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              {questSteps.map((step, index) => (
                <div key={step.id} className="space-y-2">
                  <div className="flex items-start gap-3">
                    {getStepIcon(step.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm text-gray-900">
                          {step.title}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStepBadgeColor(step.status)}`}
                        >
                          {step.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {step.description}
                      </p>
                      
                      {/* Building Reference */}
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={step.buildingAction}
                          className="h-6 px-2 text-xs"
                        >
                          🏗️ {step.building}
                        </Button>
                        
                        {step.status === 'available' && (
                          <>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <Button
                              variant="default"
                              size="sm"
                              onClick={step.action}
                              className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                            >
                              {step.actionText}
                            </Button>
                          </>
                        )}
                        
                        {step.status === 'completed' && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            ✅ Done
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Connector Line */}
                  {index < questSteps.length - 1 && (
                    <div className="ml-2.5 w-0.5 h-4 bg-blue-200" />
                  )}
                </div>
              ))}
              
              {/* Quest Completion Message */}
              {isQuestComplete && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800 text-sm">
                      Quest Complete! 🎉
                    </span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    You've mastered the Flow ecosystem. Your sFVIX is earning rewards!
                  </p>
                </div>
              )}
              
              {/* Current Balances Summary */}
              {quest && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-medium text-blue-900 text-sm mb-2">Your Balances</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-blue-700">FROTH:</span>
                      <span className="font-mono text-blue-900">{parseFloat(quest.frothBalance).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">FVIX:</span>
                      <span className="font-mono text-blue-900">{parseFloat(quest.fvixBalance).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span className="text-blue-700">sFVIX:</span>
                      <span className="font-mono text-blue-900">{parseFloat(quest.sFvixBalance).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}