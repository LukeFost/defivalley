import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrchardScene } from './OrchardScene';

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

describe('OrchardScene', () => {
  const mockHideOrchardModal = vi.fn();
  const mockUseUI = vi.fn();
  const mockUseAccount = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseUI.mockReturnValue({
      isOrchardModalOpen: true,
      hideOrchardModal: mockHideOrchardModal
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
    it('should render when isOrchardModalOpen is true', () => {
      render(<OrchardScene />);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('🌳 Sacred FVIX Orchard');
      expect(screen.getByTestId('dialog-description')).toHaveTextContent('A serene grove where FVIX tokens grow');
    });

    it('should not render when isOrchardModalOpen is false', () => {
      mockUseUI.mockReturnValue({
        isOrchardModalOpen: false,
        hideOrchardModal: mockHideOrchardModal
      });

      render(<OrchardScene />);

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });
  });

  describe('scene content', () => {
    it('should display NPC dialogue', () => {
      render(<OrchardScene />);

      expect(screen.getByText(/Welcome to the Sacred Orchard/)).toBeInTheDocument();
      expect(screen.getByText(/FVIX tokens can take root and flourish/)).toBeInTheDocument();
      expect(screen.getByText('🧝‍♂️')).toBeInTheDocument();
    });

    it('should display staking benefits', () => {
      render(<OrchardScene />);

      expect(screen.getByText('🌟 Staking Benefits:')).toBeInTheDocument();
      expect(screen.getByText('• Earn yield rewards over time')).toBeInTheDocument();
      expect(screen.getByText('• sFVIX represents your staked position')).toBeInTheDocument();
      expect(screen.getByText('• Claim rewards anytime without unstaking')).toBeInTheDocument();
    });
  });

  describe('wallet connection state', () => {
    it('should enable stake button when wallet is connected', () => {
      render(<OrchardScene />);

      const stakeButton = screen.getByText('🌱 Stake FVIX → sFVIX').closest('button');
      expect(stakeButton).not.toBeDisabled();
      expect(screen.queryByText('Connect your wallet to start staking')).not.toBeInTheDocument();
    });

    it('should disable stake button when wallet is not connected', () => {
      mockUseAccount.mockReturnValue({
        address: undefined
      });

      render(<OrchardScene />);

      const stakeButton = screen.getByText('🌱 Stake FVIX → sFVIX').closest('button');
      expect(stakeButton).toBeDisabled();
      expect(screen.getByText('Connect your wallet to start staking')).toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('should call hideOrchardModal when stake button is clicked', () => {
      render(<OrchardScene />);

      const stakeButton = screen.getByText('🌱 Stake FVIX → sFVIX');
      fireEvent.click(stakeButton);

      expect(mockHideOrchardModal).toHaveBeenCalledTimes(1);
    });

    it('should call hideOrchardModal when leave button is clicked', () => {
      render(<OrchardScene />);

      const leaveButton = screen.getByText('🚶‍♀️ Leave Orchard');
      fireEvent.click(leaveButton);

      expect(mockHideOrchardModal).toHaveBeenCalledTimes(1);
    });
  });
});