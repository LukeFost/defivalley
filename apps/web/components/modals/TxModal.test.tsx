import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TxModal } from './TxModal';

// Mock the store
vi.mock('@/app/store', () => ({
  useUI: vi.fn(() => ({
    addNotification: vi.fn()
  }))
}));

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => 
    open ? <div data-testid="dialog" onClick={() => onOpenChange?.(false)}>{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h1 data-testid="dialog-title">{children}</h1>,
  DialogDescription: ({ children }: any) => <p data-testid="dialog-description">{children}</p>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      data-variant={variant}
      className={className}
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  )
}));

describe('TxModal', () => {
  const mockAddNotification = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    title: 'Test Transaction',
    children: <div>Modal Content</div>
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    const { useUI } = require('@/app/store');
    useUI.mockReturnValue({
      addNotification: mockAddNotification
    });
  });

  describe('modal visibility', () => {
    it('should render when isOpen is true', () => {
      render(<TxModal {...defaultProps} />);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Test Transaction');
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<TxModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should display description when provided', () => {
      render(<TxModal {...defaultProps} description="Test description" />);

      expect(screen.getByTestId('dialog-description')).toHaveTextContent('Test description');
    });
  });

  describe('confirm button', () => {
    it('should render confirm button when onConfirm is provided', () => {
      render(<TxModal {...defaultProps} onConfirm={mockOnConfirm} />);

      expect(screen.getByText('Confirm Transaction')).toBeInTheDocument();
    });

    it('should use custom confirm text', () => {
      render(<TxModal {...defaultProps} onConfirm={mockOnConfirm} confirmText="Custom Confirm" />);

      expect(screen.getByText('Custom Confirm')).toBeInTheDocument();
    });

    it('should disable confirm button when confirmDisabled is true', () => {
      render(<TxModal {...defaultProps} onConfirm={mockOnConfirm} confirmDisabled={true} />);

      const confirmButton = screen.getByText('Confirm Transaction').closest('button');
      expect(confirmButton).toBeDisabled();
    });

    it('should call onConfirm when confirm button is clicked', async () => {
      mockOnConfirm.mockResolvedValue(undefined);
      
      render(<TxModal {...defaultProps} onConfirm={mockOnConfirm} />);

      fireEvent.click(screen.getByText('Confirm Transaction'));

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(<TxModal {...defaultProps} onConfirm={mockOnConfirm} isLoading={true} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByText('Processing...').closest('button')).toBeDisabled();
    });

    it('should disable close during loading', () => {
      render(<TxModal {...defaultProps} isLoading={true} />);

      const cancelButton = screen.getByText('Cancel').closest('button');
      expect(cancelButton).toBeDisabled();
    });

    it('should prevent modal close during loading', () => {
      render(<TxModal {...defaultProps} isLoading={true} />);

      fireEvent.click(screen.getByTestId('dialog'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('transaction hash display', () => {
    it('should show transaction hash when provided', () => {
      const txHash = '0x1234567890abcdef';
      render(<TxModal {...defaultProps} txHash={txHash} />);

      expect(screen.getByText('Transaction Submitted')).toBeInTheDocument();
      expect(screen.getByText(`Hash: ${txHash}`)).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
    });

    it('should not show transaction hash section when not provided', () => {
      render(<TxModal {...defaultProps} />);

      expect(screen.queryByText('Transaction Submitted')).not.toBeInTheDocument();
    });
  });

  describe('error display', () => {
    it('should show error message when error is provided', () => {
      const error = new Error('Test error message');
      render(<TxModal {...defaultProps} error={error} />);

      expect(screen.getByText('Transaction Failed')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
      expect(screen.getByText('❌')).toBeInTheDocument();
    });

    it('should handle string error', () => {
      render(<TxModal {...defaultProps} error="String error message" />);

      expect(screen.getByText('Transaction Failed')).toBeInTheDocument();
      expect(screen.getByText('String error message')).toBeInTheDocument();
    });

    it('should not show error section when no error', () => {
      render(<TxModal {...defaultProps} />);

      expect(screen.queryByText('Transaction Failed')).not.toBeInTheDocument();
    });
  });

  describe('cancel button', () => {
    it('should show cancel button by default', () => {
      render(<TxModal {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should hide cancel button when showCancel is false', () => {
      render(<TxModal {...defaultProps} showCancel={false} />);

      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('should use custom cancel text', () => {
      render(<TxModal {...defaultProps} cancelText="Custom Cancel" />);

      expect(screen.getByText('Custom Cancel')).toBeInTheDocument();
    });

    it('should call onClose when cancel button is clicked', () => {
      render(<TxModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('success notification', () => {
    it('should add success notification when transaction succeeds', async () => {
      mockOnConfirm.mockResolvedValue(undefined);
      const txHash = '0x1234567890abcdef';
      
      render(<TxModal {...defaultProps} onConfirm={mockOnConfirm} txHash={txHash} />);

      fireEvent.click(screen.getByText('Confirm Transaction'));

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith({
          type: 'success',
          title: 'Transaction Submitted',
          message: 'Transaction: 0x12345678...'
        });
      });
    });

    it('should add success notification without txHash', async () => {
      mockOnConfirm.mockResolvedValue(undefined);
      
      render(<TxModal {...defaultProps} onConfirm={mockOnConfirm} />);

      fireEvent.click(screen.getByText('Confirm Transaction'));

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith({
          type: 'success',
          title: 'Transaction Submitted',
          message: 'Transaction submitted successfully'
        });
      });
    });
  });
});