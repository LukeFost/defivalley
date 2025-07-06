import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStakeFVIX, useFVIXAllowance, useSFVIXBalance, useSFVIXVaultInfo } from './useStakeFVIX';
import { useAccount, useWriteContract, useBalance, useReadContract, usePublicClient } from 'wagmi';
import { parseUnits } from 'viem';

// Mock wagmi hooks
vi.mock('wagmi');
vi.mock('viem');

// Mock the Flow helper functions
vi.mock('../flow/stakeFVIX', () => ({
  stakeFVIXForShares: vi.fn(),
  unstakeFVIXFromShares: vi.fn(),
  claimStakingRewards: vi.fn(),
  checkStakingEligibility: vi.fn(),
  getMaxStakeableFVIX: vi.fn(),
  estimateSFVIXShares: vi.fn(),
  hasStakeableFVIX: vi.fn(),
  sFVIX_ABI: [],
  sFVIX_TOKEN: '0x2751dB789ab49e4f1CFA192831c19D8f40c708c9',
  FVIX_TOKEN: '0x00f4CE400130C9383115f3858F9CA54677426583',
}));

// Mock constants
vi.mock('../../../../packages/contracts/flow/constants', () => ({
  FVIX_TOKEN: '0x00f4CE400130C9383115f3858F9CA54677426583',
  sFVIX_TOKEN: '0x2751dB789ab49e4f1CFA192831c19D8f40c708c9',
  TOKEN_DECIMALS: {
    FLOW: 18,
    FROTH: 18,
    FVIX: 18,
    sFVIX: 18,
  },
}));

describe('useStakeFVIX', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockTxHash = '0xabcdef123456789';
  const mockFVIXBalance = BigInt(1000) * 10n ** 18n; // 1,000 FVIX
  const mockSFVIXBalance = BigInt(500) * 10n ** 18n; // 500 sFVIX
  const mockPendingRewards = BigInt(50) * 10n ** 18n; // 50 FVIX rewards
  const mockPublicClient = {
    readContract: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useAccount
    (useAccount as any).mockReturnValue({
      address: mockAddress,
    });

    // Mock usePublicClient
    (usePublicClient as any).mockReturnValue(mockPublicClient);

    // Mock useWriteContract
    (useWriteContract as any).mockReturnValue({
      writeContractAsync: vi.fn(),
      isPending: false,
      data: undefined,
      error: null,
    });

    // Mock useBalance
    (useBalance as any).mockImplementation(({ token }) => {
      if (token === '0x00f4CE400130C9383115f3858F9CA54677426583') {
        return {
          data: { value: mockFVIXBalance, formatted: '1000' },
        };
      }
      if (token === '0x2751dB789ab49e4f1CFA192831c19D8f40c708c9') {
        return {
          data: { value: mockSFVIXBalance, formatted: '500' },
        };
      }
      return { data: undefined };
    });

    // Mock useReadContract for pending rewards
    (useReadContract as any).mockReturnValue({
      data: mockPendingRewards,
    });

    // Mock parseUnits
    (parseUnits as any).mockImplementation((value: string, decimals: number) => {
      return BigInt(value) * 10n ** BigInt(decimals);
    });
  });

  describe('useStakeFVIX hook', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useStakeFVIX());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isPending).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
      expect(result.current.pendingRewards).toBe(mockPendingRewards);
      expect(typeof result.current.writeAsync).toBe('function');
      expect(typeof result.current.unstakeAsync).toBe('function');
      expect(typeof result.current.claimRewardsAsync).toBe('function');
      expect(typeof result.current.checkEligibility).toBe('function');
      expect(typeof result.current.getMaxStakeable).toBe('function');
      expect(typeof result.current.hasStakeable).toBe('function');
      expect(typeof result.current.estimateShares).toBe('function');
    });

    it('should handle successful stake transaction', async () => {
      const mockWriteContractAsync = vi.fn().mockResolvedValue(mockTxHash);
      const mockStakeFVIXForShares = vi.fn().mockReturnValue({
        canStake: true,
        missingFvix: 0n,
        txData: {
          address: '0x2751dB789ab49e4f1CFA192831c19D8f40c708c9',
          abi: [],
          functionName: 'deposit',
          args: [BigInt(100) * 10n ** 18n, mockAddress],
        },
      });

      (useWriteContract as any).mockReturnValue({
        writeContractAsync: mockWriteContractAsync,
        isPending: false,
        data: mockTxHash,
        error: null,
      });

      const { stakeFVIXForShares } = await import('../flow/stakeFVIX');
      (stakeFVIXForShares as any).mockImplementation(mockStakeFVIXForShares);

      const { result } = renderHook(() => useStakeFVIX());

      await act(async () => {
        const txHash = await result.current.writeAsync({ fvixAmount: '100' });
        expect(txHash).toBe(mockTxHash);
      });

      expect(mockStakeFVIXForShares).toHaveBeenCalledWith(
        { fvixAmount: '100', recipient: mockAddress },
        mockFVIXBalance
      );
      expect(mockWriteContractAsync).toHaveBeenCalledWith({
        address: '0x2751dB789ab49e4f1CFA192831c19D8f40c708c9',
        abi: [],
        functionName: 'deposit',
        args: [BigInt(100) * 10n ** 18n, mockAddress],
      });
    });

    it('should handle insufficient FVIX balance error', async () => {
      const mockStakeFVIXForShares = vi.fn().mockReturnValue({
        canStake: false,
        missingFvix: BigInt(500) * 10n ** 18n,
        txData: {
          address: '0x2751dB789ab49e4f1CFA192831c19D8f40c708c9',
          abi: [],
          functionName: 'deposit',
          args: [BigInt(1500) * 10n ** 18n, mockAddress],
        },
      });

      const { stakeFVIXForShares } = await import('../flow/stakeFVIX');
      (stakeFVIXForShares as any).mockImplementation(mockStakeFVIXForShares);

      const { result } = renderHook(() => useStakeFVIX());

      await act(async () => {
        await expect(
          result.current.writeAsync({ fvixAmount: '1500' })
        ).rejects.toThrow('Insufficient FVIX balance');
      });
    });

    it('should handle successful unstake transaction', async () => {
      const mockWriteContractAsync = vi.fn().mockResolvedValue(mockTxHash);
      const mockUnstakeFVIXFromShares = vi.fn().mockReturnValue({
        address: '0x2751dB789ab49e4f1CFA192831c19D8f40c708c9',
        abi: [],
        functionName: 'withdraw',
        args: [BigInt(100) * 10n ** 18n, mockAddress, mockAddress],
      });

      (useWriteContract as any).mockReturnValue({
        writeContractAsync: mockWriteContractAsync,
        isPending: false,
        data: mockTxHash,
        error: null,
      });

      const { unstakeFVIXFromShares } = await import('../flow/stakeFVIX');
      (unstakeFVIXFromShares as any).mockImplementation(mockUnstakeFVIXFromShares);

      const { result } = renderHook(() => useStakeFVIX());

      await act(async () => {
        const txHash = await result.current.unstakeAsync({ sFvixAmount: '100' });
        expect(txHash).toBe(mockTxHash);
      });

      expect(mockUnstakeFVIXFromShares).toHaveBeenCalledWith({
        sFvixAmount: '100',
        recipient: mockAddress,
        owner: mockAddress,
      });
      expect(mockWriteContractAsync).toHaveBeenCalledWith({
        address: '0x2751dB789ab49e4f1CFA192831c19D8f40c708c9',
        abi: [],
        functionName: 'withdraw',
        args: [BigInt(100) * 10n ** 18n, mockAddress, mockAddress],
      });
    });

    it('should handle successful claim rewards transaction', async () => {
      const mockWriteContractAsync = vi.fn().mockResolvedValue(mockTxHash);
      const mockClaimStakingRewards = vi.fn().mockReturnValue({
        address: '0x2751dB789ab49e4f1CFA192831c19D8f40c708c9',
        abi: [],
        functionName: 'claimRewards',
        args: [],
      });

      (useWriteContract as any).mockReturnValue({
        writeContractAsync: mockWriteContractAsync,
        isPending: false,
        data: mockTxHash,
        error: null,
      });

      const { claimStakingRewards } = await import('../flow/stakeFVIX');
      (claimStakingRewards as any).mockImplementation(mockClaimStakingRewards);

      const { result } = renderHook(() => useStakeFVIX());

      await act(async () => {
        const txHash = await result.current.claimRewardsAsync();
        expect(txHash).toBe(mockTxHash);
      });

      expect(mockClaimStakingRewards).toHaveBeenCalled();
      expect(mockWriteContractAsync).toHaveBeenCalledWith({
        address: '0x2751dB789ab49e4f1CFA192831c19D8f40c708c9',
        abi: [],
        functionName: 'claimRewards',
        args: [],
      });
    });

    it('should handle wallet not connected error', async () => {
      (useAccount as any).mockReturnValue({
        address: undefined,
      });

      const { result } = renderHook(() => useStakeFVIX());

      await act(async () => {
        await expect(
          result.current.writeAsync({ fvixAmount: '100' })
        ).rejects.toThrow('Wallet not connected');
      });

      await act(async () => {
        await expect(
          result.current.unstakeAsync({ sFvixAmount: '100' })
        ).rejects.toThrow('Wallet not connected');
      });

      await act(async () => {
        await expect(
          result.current.claimRewardsAsync()
        ).rejects.toThrow('Wallet not connected');
      });
    });

    it('should handle FVIX balance not available error', async () => {
      (useBalance as any).mockImplementation(() => ({
        data: undefined,
      }));

      const { result } = renderHook(() => useStakeFVIX());

      await act(async () => {
        await expect(
          result.current.writeAsync({ fvixAmount: '100' })
        ).rejects.toThrow('FVIX balance not available');
      });
    });

    it('should check eligibility correctly', async () => {
      const mockCheckStakingEligibility = vi.fn().mockReturnValue({
        canStake: true,
        hasSufficientBalance: true,
        missingFvix: '0',
        hasAnyFvix: true,
      });

      const { checkStakingEligibility } = await import('../flow/stakeFVIX');
      (checkStakingEligibility as any).mockImplementation(mockCheckStakingEligibility);

      const { result } = renderHook(() => useStakeFVIX());

      const eligibility = result.current.checkEligibility('100');

      expect(mockCheckStakingEligibility).toHaveBeenCalledWith(
        mockFVIXBalance,
        '100'
      );
      expect(eligibility.canStake).toBe(true);
      expect(eligibility.hasSufficientBalance).toBe(true);
      expect(eligibility.hasAnyFvix).toBe(true);
    });

    it('should return correct max stakeable amount', async () => {
      const mockGetMaxStakeableFVIX = vi.fn().mockReturnValue('1000');

      const { getMaxStakeableFVIX } = await import('../flow/stakeFVIX');
      (getMaxStakeableFVIX as any).mockImplementation(mockGetMaxStakeableFVIX);

      const { result } = renderHook(() => useStakeFVIX());

      const maxStakeable = result.current.getMaxStakeable();

      expect(mockGetMaxStakeableFVIX).toHaveBeenCalledWith(mockFVIXBalance);
      expect(maxStakeable).toBe('1000');
    });

    it('should check if user has stakeable FVIX', async () => {
      const mockHasStakeableFVIX = vi.fn().mockReturnValue(true);

      const { hasStakeableFVIX } = await import('../flow/stakeFVIX');
      (hasStakeableFVIX as any).mockImplementation(mockHasStakeableFVIX);

      const { result } = renderHook(() => useStakeFVIX());

      const hasStakeable = result.current.hasStakeable();

      expect(mockHasStakeableFVIX).toHaveBeenCalledWith(mockFVIXBalance);
      expect(hasStakeable).toBe(true);
    });

    it('should estimate shares correctly', async () => {
      const mockEstimateSFVIXShares = vi.fn().mockResolvedValue('100');
      const mockPreviewDeposit = vi.fn().mockResolvedValue(BigInt(100) * 10n ** 18n);

      mockPublicClient.readContract.mockResolvedValue(BigInt(100) * 10n ** 18n);

      const { estimateSFVIXShares } = await import('../flow/stakeFVIX');
      (estimateSFVIXShares as any).mockImplementation(mockEstimateSFVIXShares);

      const { result } = renderHook(() => useStakeFVIX());

      await act(async () => {
        const shares = await result.current.estimateShares('100');
        expect(shares).toBe('100');
      });

      expect(mockEstimateSFVIXShares).toHaveBeenCalledWith(
        '100',
        expect.any(Function)
      );
    });

    it('should handle estimate shares with no public client', async () => {
      (usePublicClient as any).mockReturnValue(null);

      const { result } = renderHook(() => useStakeFVIX());

      await act(async () => {
        const shares = await result.current.estimateShares('100');
        expect(shares).toBeNull();
      });
    });

    it('should handle estimate shares with zero amount', async () => {
      const { result } = renderHook(() => useStakeFVIX());

      await act(async () => {
        const shares = await result.current.estimateShares('0');
        expect(shares).toBeNull();
      });
    });

    it('should handle loading and pending states', () => {
      (useWriteContract as any).mockReturnValue({
        writeContractAsync: vi.fn(),
        isPending: true,
        data: undefined,
        error: null,
      });

      const { result } = renderHook(() => useStakeFVIX());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isPending).toBe(true);
    });

    it('should handle write contract error', () => {
      const mockError = new Error('Transaction failed');
      (useWriteContract as any).mockReturnValue({
        writeContractAsync: vi.fn(),
        isPending: false,
        data: undefined,
        error: mockError,
      });

      const { result } = renderHook(() => useStakeFVIX());

      expect(result.current.error).toBe(mockError);
    });
  });

  describe('useFVIXAllowance hook', () => {
    it('should return correct allowance and approval function', () => {
      const mockAllowance = BigInt(1000) * 10n ** 18n;
      const mockApprove = vi.fn().mockResolvedValue(mockTxHash);

      (useReadContract as any).mockReturnValue({
        data: mockAllowance,
        refetch: vi.fn(),
      });

      (useWriteContract as any).mockReturnValue({
        writeContractAsync: mockApprove,
        isPending: false,
      });

      const { result } = renderHook(() => useFVIXAllowance());

      expect(result.current.allowance).toBe(mockAllowance);
      expect(result.current.isApproving).toBe(false);
      expect(typeof result.current.approveAsync).toBe('function');
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should handle approval transaction', async () => {
      const mockApprove = vi.fn().mockResolvedValue(mockTxHash);
      const approvalAmount = BigInt(1000) * 10n ** 18n;

      (useWriteContract as any).mockReturnValue({
        writeContractAsync: mockApprove,
        isPending: false,
      });

      const { result } = renderHook(() => useFVIXAllowance());

      await act(async () => {
        const txHash = await result.current.approveAsync(approvalAmount);
        expect(txHash).toBe(mockTxHash);
      });

      expect(mockApprove).toHaveBeenCalledWith({
        address: '0x00f4CE400130C9383115f3858F9CA54677426583',
        abi: expect.any(Array),
        functionName: 'approve',
        args: ['0x2751dB789ab49e4f1CFA192831c19D8f40c708c9', approvalAmount],
      });
    });
  });

  describe('useSFVIXBalance hook', () => {
    it('should return correct balance information', () => {
      const mockBalance = {
        value: mockSFVIXBalance,
        formatted: '500',
      };

      (useBalance as any).mockReturnValue({
        data: mockBalance,
        isLoading: false,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useSFVIXBalance());

      expect(result.current.balance).toBe(mockSFVIXBalance);
      expect(result.current.formatted).toBe('500');
      expect(result.current.isLoading).toBe(false);
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should handle undefined balance', () => {
      (useBalance as any).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useSFVIXBalance());

      expect(result.current.balance).toBe(0n);
      expect(result.current.formatted).toBe('0');
    });
  });

  describe('useSFVIXVaultInfo hook', () => {
    it('should return vault information', () => {
      const mockTotalAssets = BigInt(10000) * 10n ** 18n;
      const mockUserShares = BigInt(500) * 10n ** 18n;

      (useReadContract as any).mockImplementation(({ functionName }) => {
        if (functionName === 'totalSupply') {
          return { data: mockTotalAssets };
        }
        if (functionName === 'balanceOf') {
          return { data: mockUserShares };
        }
        return { data: undefined };
      });

      const { result } = renderHook(() => useSFVIXVaultInfo());

      expect(result.current.totalAssets).toBe(mockTotalAssets);
      expect(result.current.userShares).toBe(mockUserShares);
    });

    it('should handle undefined vault data', () => {
      (useReadContract as any).mockReturnValue({
        data: undefined,
      });

      const { result } = renderHook(() => useSFVIXVaultInfo());

      expect(result.current.totalAssets).toBe(0n);
      expect(result.current.userShares).toBe(0n);
    });
  });
});