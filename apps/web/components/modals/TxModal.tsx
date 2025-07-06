import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUI } from '@/app/store';

export interface TxModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  onConfirm?: () => void;
  confirmText?: string;
  confirmDisabled?: boolean;
  isLoading?: boolean;
  txHash?: string;
  error?: Error | string | null;
  showCancel?: boolean;
  cancelText?: string;
}

/**
 * Generic transaction modal wrapper with consistent styling and behavior
 * Provides loading states, success toasts, and error handling
 */
export function TxModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  onConfirm,
  confirmText = 'Confirm Transaction',
  confirmDisabled = false,
  isLoading = false,
  txHash,
  error,
  showCancel = true,
  cancelText = 'Cancel'
}: TxModalProps) {
  const { addNotification } = useUI();

  const handleConfirm = async () => {
    if (!onConfirm || isLoading) return;
    
    try {
      await onConfirm();
      
      // Show success notification
      addNotification({
        type: 'success',
        title: 'Transaction Submitted',
        message: txHash ? `Transaction: ${txHash.slice(0, 10)}...` : 'Transaction submitted successfully'
      });
    } catch (err) {
      // Error handling is managed by the parent component
      console.error('Transaction failed:', err);
    }
  };

  const handleClose = () => {
    if (isLoading) return; // Prevent closing during loading
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-center">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-6">
          {children}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <div className="text-red-500 mt-0.5">❌</div>
              <div>
                <p className="text-red-800 font-medium">Transaction Failed</p>
                <p className="text-red-700 text-sm">
                  {typeof error === 'string' ? error : error.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Hash Display */}
        {txHash && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <div className="text-green-500 mt-0.5">✅</div>
              <div>
                <p className="text-green-800 font-medium">Transaction Submitted</p>
                <p className="text-green-700 text-sm break-all">
                  Hash: {txHash}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
          {showCancel && (
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              {cancelText}
            </Button>
          )}
          
          {onConfirm && (
            <Button
              onClick={handleConfirm}
              className="flex-1"
              disabled={confirmDisabled || isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                confirmText
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}