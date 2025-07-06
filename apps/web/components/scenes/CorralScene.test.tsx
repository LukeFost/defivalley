import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CorralScene } from './CorralScene';

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
  Button: ({ children, onClick, disabled, className, variant, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={className}
      data-variant={variant}
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  )
}));

describe('CorralScene', () => {
  const mockHideCorralModal = vi.fn();
  const mockUseUI = vi.fn();
  const mockUseAccount = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockUseUI.mockReturnValue({
      isCorralModalOpen: true,
      hideCorralModal: mockHideCorralModal
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
    it('should render when isCorralModalOpen is true', () => {
      mockUseUI.mockReturnValue({
        isCorralModalOpen: true,
        hideCorralModal: mockHideCorralModal
      });

      render(<CorralScene />);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('🐴 Flow Trading Corral');
      expect(screen.getByTestId('dialog-description')).toHaveTextContent('Welcome to the rustic trading post');
    });

    it('should not render when isCorralModalOpen is false', () => {
      mockUseUI.mockReturnValue({
        isCorralModalOpen: false,
        hideCorralModal: mockHideCorralModal
      });

      render(<CorralScene />);

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });
  });

  describe('scene content', () => {
    it('should display NPC dialogue', () => {
      render(<CorralScene />);

      expect(screen.getByText(/Howdy, partner!/)).toBeInTheDocument();
      expect(screen.getByText(/Looking to swap some Flow tokens for FROTH/)).toBeInTheDocument();
      expect(screen.getByText('🤠')).toBeInTheDocument();
    });

    it('should display trading corral backdrop', () => {
      render(<CorralScene />);

      expect(screen.getByText('🐎')).toBeInTheDocument();
      expect(screen.getByText('Trading Corral')).toBeInTheDocument();
    });
  });

  describe('wallet connection state', () => {
    it('should enable swap button when wallet is connected', () => {
      mockUseAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890'
      });

      render(<CorralScene />);

      const swapButton = screen.getByText('🔄 Swap FLOW → FROTH').closest('button');
      expect(swapButton).not.toBeDisabled();
      expect(screen.queryByText('Connect your wallet to start trading')).not.toBeInTheDocument();
    });

    it('should disable swap button when wallet is not connected', () => {
      mockUseAccount.mockReturnValue({
        address: undefined
      });

      render(<CorralScene />);

      const swapButton = screen.getByText('🔄 Swap FLOW → FROTH').closest('button');
      expect(swapButton).toBeDisabled();
      expect(screen.getByText('Connect your wallet to start trading')).toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('should call hideCorralModal when swap button is clicked', () => {
      render(<CorralScene />);

      const swapButton = screen.getByText('🔄 Swap FLOW → FROTH');
      fireEvent.click(swapButton);

      expect(mockHideCorralModal).toHaveBeenCalledTimes(1);
    });

    it('should call hideCorralModal when leave button is clicked', () => {
      render(<CorralScene />);

      const leaveButton = screen.getByText('👋 Leave Corral');
      fireEvent.click(leaveButton);

      expect(mockHideCorralModal).toHaveBeenCalledTimes(1);
    });

    it('should call hideCorralModal when dialog is closed', () => {
      render(<CorralScene />);

      const dialog = screen.getByTestId('dialog');
      fireEvent.click(dialog);

      expect(mockHideCorralModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('button styling', () => {
    it('should apply correct styling to swap button', () => {
      render(<CorralScene />);

      const swapButton = screen.getByText('🔄 Swap FLOW → FROTH').closest('button');
      expect(swapButton).toHaveClass('bg-amber-600', 'hover:bg-amber-700');
    });

    it('should apply outline variant to leave button', () => {
      render(<CorralScene />);

      const leaveButton = screen.getByText('👋 Leave Corral').closest('button');
      expect(leaveButton).toHaveAttribute('data-variant', 'outline');
    });
  });
});