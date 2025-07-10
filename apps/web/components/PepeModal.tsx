'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useFlowPumpLaunch } from '@/hooks/useFlowPumpLaunch';
import { formatEther } from 'viem';

interface PepeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * A small component to render the animated Pepe sprite from its spritesheet.
 */
const PepeSprite = ({ size }: { size: number }) => {
  const totalFrames = 13;

  return (
    <>
      <style jsx>{`
        .pepe-anim {
          width: ${size}px;
          height: ${size}px;
          background-image: url('/sprites/Pepe/_idle_pepe/idle_pepe.png');
          /* Create a "filmstrip" by making the background N times wider than the container */
          background-size: ${totalFrames * 100}% 100%;
          animation: pepe-idle-anim 1s steps(${totalFrames - 1}) infinite;
          image-rendering: pixelated; /* Keeps the pixel art crisp */
        }

        @keyframes pepe-idle-anim {
          to {
            /* Animate to the end of the filmstrip to cycle through all frames */
            background-position: 100% 0;
          }
        }
      `}</style>
      <div className="pepe-anim" />
    </>
  );
};

/**
 * PepeModal - Unified modal for Pepe character interaction and Flow pump launch
 * Combines character dialogue with token creation functionality
 */
export const PepeModal = React.memo(function PepeModal({ isOpen, onClose }: PepeModalProps) {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [showLaunchForm, setShowLaunchForm] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { createMemeToken, isCreating, error, creationFee } = useFlowPumpLaunch();

  const handleLaunch = async () => {
    const result = await createMemeToken(name, symbol);
    if (result?.success && result.hash) {
      setTxHash(result.hash);
    }
  };

  const handleClose = () => {
    setShowLaunchForm(false);
    setName('');
    setSymbol('');
    setTxHash(null);
    onClose();
  };

  const handleCreateAnother = () => {
    setName('');
    setSymbol('');
    setTxHash(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-900 border-2 border-green-400 flex items-center justify-center overflow-hidden">
              {/* Replaced frog emoji with animated sprite */}
              <PepeSprite size={48} />
            </div>
            Pepe's Pump Launchpad
          </DialogTitle>
          <DialogDescription>
            {txHash 
              ? "Your token has been created on the Flow network!"
              : !showLaunchForm 
              ? "Feels good, man... Welcome to my launchpad. Ready to pump some tokens?" 
              : "Create and launch your own meme coin on the Flow network."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {txHash ? (
            // Success View
            <div className="space-y-4 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-lg font-medium">Congratulations!</h3>
              <p className="text-sm text-muted-foreground">
                Your token <span className="font-bold">{name} ({symbol})</span> has been successfully created.
              </p>
              <Button asChild variant="link">
                <a href={`https://flowscan.io/transaction/${txHash}`} target="_blank" rel="noopener noreferrer">
                  View on Flowscan
                </a>
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCreateAnother} className="flex-1">Create Another</Button>
                <Button onClick={handleClose} className="flex-1">Done</Button>
              </div>
            </div>
          ) : !showLaunchForm ? (
            // Character introduction screen
            <div className="space-y-4 text-center">
              {/* Replaced frog emoji with larger animated sprite */}
              <div className="w-32 h-32 mx-auto mb-4">
                <PepeSprite size={128} />
              </div>
              <p className="text-muted-foreground">
                "Hey there, anon. I've been watching the charts and... feels good, man. 
                Want to create your own meme coin? I can help you launch it on Flow."
              </p>
              <p className="text-sm text-green-600 font-medium">
                Only costs {formatEther(creationFee)} FLOW to get started.
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={() => setShowLaunchForm(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {/* Replaced Rocket icon with small animated sprite */}
                  <div className="w-4 h-4 mr-2">
                    <PepeSprite size={16} />
                  </div>
                  Let's pump it!
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Maybe later
                </Button>
              </div>
            </div>
          ) : (
            // Token creation form
            <div className="space-y-4">
              <div className="text-center mb-4">
                {/* Replaced rocket emoji with animated sprite */}
                <div className="w-16 h-16 mx-auto mb-2">
                  <PepeSprite size={64} />
                </div>
                <p className="text-sm text-muted-foreground">
                  "Alright anon, let's make this token legendary..."
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="token-name">Token Name</Label>
                <Input 
                  id="token-name" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g., Pepe's Farm Token" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token-symbol">Token Symbol</Label>
                <Input 
                  id="token-symbol" 
                  value={symbol} 
                  onChange={e => setSymbol(e.target.value.toUpperCase())} 
                  placeholder="e.g., PEPEFARM" 
                  maxLength={10} 
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Launch fee: <strong>{formatEther(creationFee)} FLOW</strong> 
                  <br />
                  <span className="text-xs text-muted-foreground">
                    "Don't worry anon, it's worth it for the pump."
                  </span>
                </AlertDescription>
              </Alert>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error.message}
                    <br />
                    <span className="text-xs">"Feels bad, man. Try again?"</span>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleLaunch} 
                  disabled={isCreating || !name || !symbol} 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isCreating ? 'Pumping...' : 'Launch Token'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowLaunchForm(false)}
                  disabled={isCreating}
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});