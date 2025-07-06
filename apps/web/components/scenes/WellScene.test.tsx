import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WellScene } from './WellScene';

// Mock the store and wagmi
vi.mock('@/app/store', () => ({
  useUI: vi.fn()
}));

vi.mock('wagmi', () => ({
  useAccount: vi.fn()
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
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      data-variant={variant}
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  )
}));

describe('WellScene', () => {
  const mockHideWellModal = vi.fn();
  const mockUseUI = vi.fn();
  const mockUseAccount = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseUI.mockReturnValue({
      isWellModalOpen: true,
      hideWellModal: mockHideWellModal
    });
    
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890'
    });

    const { useUI } = require('@/app/store');
    const { useAccount } = require('wagmi');
    
    useUI.mockImplementation(mockUseUI);
    useAccount.mockImplementation(mockUseAccount);
  });

  describe('modal visibility', () => {
    it('should render when isWellModalOpen is true', () => {
      render(<WellScene />);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('🪣 Ancient FVIX Well');
      expect(screen.getByTestId('dialog-description')).toHaveTextContent('A mystical well where FROTH transforms');
    });

    it('should not render when isWellModalOpen is false', () => {
      mockUseUI.mockReturnValue({
        isWellModalOpen: false,
        hideWellModal: mockHideWellModal
      });

      render(<WellScene />);

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });
  });

  describe('scene content', () => {
    it('should display NPC dialogue', () => {
      render(<WellScene />);

      expect(screen.getByText(/Ah, a seeker of the ancient art!/)).toBeInTheDocument();
      expect(screen.getByText(/minimum offering is 10,000 FROTH/)).toBeInTheDocument();
      expect(screen.getByText('🧙‍♀️')).toBeInTheDocument();
    });

    it('should display minting requirements', () => {
      render(<WellScene />);

      expect(screen.getByText('💡 Minting Requirements:')).toBeInTheDocument();
      expect(screen.getByText('• Minimum 10,000 FROTH tokens')).toBeInTheDocument();
      expect(screen.getByText('• FROTH must be approved for the FVIX contract')).toBeInTheDocument();
    });
  });

  describe('wallet connection state', () => {
    it('should enable mint button when wallet is connected', () => {
      render(<WellScene />);

      const mintButton = screen.getByText('⚡ Mint FVIX with FROTH').closest('button');
      expect(mintButton).not.toBeDisabled();
      expect(screen.queryByText('Connect your wallet to begin minting')).not.toBeInTheDocument();
    });

    it('should disable mint button when wallet is not connected', () => {
      mockUseAccount.mockReturnValue({
        address: undefined
      });

      render(<WellScene />);

      const mintButton = screen.getByText('⚡ Mint FVIX with FROTH').closest('button');
      expect(mintButton).toBeDisabled();
      expect(screen.getByText('Connect your wallet to begin minting')).toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('should call hideWellModal when mint button is clicked', () => {
      render(<WellScene />);

      const mintButton = screen.getByText('⚡ Mint FVIX with FROTH');
      fireEvent.click(mintButton);

      expect(mockHideWellModal).toHaveBeenCalledTimes(1);
    });

    it('should call hideWellModal when leave button is clicked', () => {
      render(<WellScene />);

      const leaveButton = screen.getByText('🚶 Leave Well');
      fireEvent.click(leaveButton);

      expect(mockHideWellModal).toHaveBeenCalledTimes(1);
    });
  });
});