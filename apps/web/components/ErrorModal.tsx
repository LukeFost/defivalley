'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GameError {
  title: string;
  message: string;
  canReload?: boolean;
}

export function ErrorModal() {
  const [error, setError] = useState<GameError | null>(null);

  useEffect(() => {
    // Listen for game errors
    const handleError = (event: CustomEvent) => {
      const { message, error: errorObj } = event.detail;
      
      // Map technical errors to user-friendly messages
      if (message.includes('registerBuilding')) {
        setError({
          title: 'Game Loading Error',
          message: 'Some game features failed to load properly. Please refresh the page to try again.',
          canReload: true
        });
      } else if (message.includes('authorized')) {
        setError({
          title: 'Connection Issue',
          message: 'Unable to connect to your wallet properly. Please ensure your wallet is unlocked and try reconnecting.',
          canReload: false
        });
      } else if (message.includes('BuildingInteractionManager')) {
        setError({
          title: 'Game Initialization Error',
          message: 'The game failed to start properly. Please refresh the page to continue.',
          canReload: true
        });
      } else {
        setError({
          title: 'Unexpected Error',
          message: 'Something went wrong. Our farming robots are looking into it!',
          canReload: true
        });
      }
    };

    window.addEventListener('game:error', handleError as EventListener);
    
    // Also catch unhandled errors
    const handleUnhandledError = (event: ErrorEvent) => {
      console.error('Unhandled error:', event.error);
      handleError(new CustomEvent('game:error', { 
        detail: { message: event.error?.message || 'Unknown error' }
      }));
    };
    
    window.addEventListener('error', handleUnhandledError);

    return () => {
      window.removeEventListener('game:error', handleError as EventListener);
      window.removeEventListener('error', handleUnhandledError);
    };
  }, []);

  if (!error) return null;

  return (
    <Dialog open={!!error} onOpenChange={() => setError(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            {error.title}
          </DialogTitle>
          <DialogDescription className="mt-3">
            {error.message}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-3 mt-4">
          {error.canReload && (
            <Button 
              onClick={() => window.location.reload()} 
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Game
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => setError(null)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}