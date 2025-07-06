'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Rocket, AlertCircle } from 'lucide-react';
import { useFlowPumpLaunch } from '@/hooks/useFlowPumpLaunch';
import { formatEther } from 'viem';

interface PepeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * PepeModal - Unified modal for Pepe character interaction and Flow pump launch
 * Combines character dialogue with token creation functionality
 */
export function PepeModal({ isOpen, onClose }: PepeModalProps) {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [showLaunchForm, setShowLaunchForm] = useState(false);
  const { createMemeToken, isCreating, error, creationFee } = useFlowPumpLaunch();

  const handleLaunch = async () => {
    const result = await createMemeToken(name, symbol);
    if (result?.success) {
      // Reset form on success
      setName('');
      setSymbol('');
      setShowLaunchForm(false);
    }
  };

  const handleClose = () => {
    setShowLaunchForm(false);
    setName('');
    setSymbol('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-900 border-2 border-green-400 flex items-center justify-center">
              <span className="text-2xl">🐸</span>
            </div>
            Pepe's Pump Launchpad
          </DialogTitle>
          <DialogDescription>
            {!showLaunchForm ? 
              "Feels good, man... Welcome to my launchpad. Ready to pump some tokens?" :
              "Create and launch your own meme coin on the Flow network."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!showLaunchForm ? (
            // Character introduction screen
            <div className="space-y-4 text-center">
              <div className="text-6xl mb-4">🐸</div>
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
                  <Rocket className="mr-2 h-4 w-4" />
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
                <div className="text-4xl mb-2">🚀</div>
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
}