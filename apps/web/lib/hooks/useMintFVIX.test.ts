import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useMintFVIX, useFrothAllowance, useFVIXBalance } from './useMintFVIX';
import { useAccount, useWriteContract, useBalance, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';

// Mock wagmi hooks
vi.mock('wagmi');
vi.mock('viem');

// Mock the Flow helper functions
vi.mock('../flow/mintFVIX', () => ({
  mintFVIXWithFroth: vi.fn(),
  checkFVIXMintEligibility: vi.fn(),
  getMaxMintableFVIX: vi.fn(),
  meetsMinimumThreshold: vi.fn(),
  FVIX_ABI: [],
  FVIX_TOKEN: '0x00f4CE400130C9383115f3858F9CA54677426583',
  FROTH_TOKEN: '0xB73BF8e6A4477a952E0338e6CC00cC0ce5AD04bA',
}));

// Mock constants
vi.mock('../../../../packages/contracts/flow/constants', () => ({
  FVIX_TOKEN: '0x00f4CE400130C9383115f3858F9CA54677426583',
  FROTH_TOKEN: '0xB73BF8e6A4477a952E0338e6CC00cC0ce5AD04bA',
  FROTH_THRESHOLD: BigInt(10_000) * 10n ** 18n,
  TOKEN_DECIMALS: {
    FLOW: 18,
    FROTH: 18,
    FVIX: 18,
    sFVIX: 18,
  },
}));

describe('useMintFVIX', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockTxHash = '0xabcdef123456789';
  const mockFrothBalance = BigInt(20000) * 10n ** 18n; // 20,000 FROTH
  const mockFVIXBalance = BigInt(1000) * 10n ** 18n; // 1,000 FVIX

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useAccount
    (useAccount as any).mockReturnValue({
      address: mockAddress,
    });

    // Mock useWriteContract
    (useWriteContract as any).mockReturnValue({
      writeContractAsync: vi.fn(),
      isPending: false,
      data: undefined,
      error: null,
    });

    // Mock useBalance for FROTH
    (useBalance as any).mockImplementation(({ token }) => {
      if (token === '0xB73BF8e6A4477a952E0338e6CC00cC0ce5AD04bA') {
        return {
          data: { value: mockFrothBalance, formatted: '20000' },
        };
      }
      if (token === '0x00f4CE400130C9383115f3858F9CA54677426583') {
        return {
          data: { value: mockFVIXBalance, formatted: '1000' },
        };
      }
      return { data: undefined };
    });

    // Mock parseUnits
    (parseUnits as any).mockImplementation((value: string, decimals: number) => {
      return BigInt(value) * 10n ** BigInt(decimals);
    });
  });

  describe('useMintFVIX hook', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useMintFVIX());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isPending).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
      expect(typeof result.current.writeAsync).toBe('function');
      expect(typeof result.current.checkEligibility).toBe('function');
      expect(typeof result.current.getMaxMintable).toBe('function');
      expect(typeof result.current.meetsThreshold).toBe('function');
    });

    it('should handle successful mint transaction', async () => {
      const mockWriteContractAsync = vi.fn().mockResolvedValue(mockTxHash);
      const mockMintFVIXWithFroth = vi.fn().mockReturnValue({
        canMint: true,
        missingFroth: 0n,
        txData: {
          address: '0x00f4CE400130C9383115f3858F9CA54677426583',
          abi: [],
          functionName: 'mint',
          args: [BigInt(15000) * 10n ** 18n],
        },
      });

      (useWriteContract as any).mockReturnValue({
        writeContractAsync: mockWriteContractAsync,
        isPending: false,
        data: mockTxHash,
        error: null,
      });

      const { mintFVIXWithFroth } = await import('../flow/mintFVIX');
      (mintFVIXWithFroth as any).mockImplementation(mockMintFVIXWithFroth);

      const { result } = renderHook(() => useMintFVIX());

      await act(async () => {
        const txHash = await result.current.writeAsync({ frothAmount: '15000' });
        expect(txHash).toBe(mockTxHash);
      });

      expect(mockMintFVIXWithFroth).toHaveBeenCalledWith(
        { frothAmount: '15000' },
        mockFrothBalance
      );
      expect(mockWriteContractAsync).toHaveBeenCalledWith({
        address: '0x00f4CE400130C9383115f3858F9CA54677426583',
        abi: [],
        functionName: 'mint',
        args: [BigInt(15000) * 10n ** 18n],
      });
    });

    it('should handle insufficient balance error', async () => {
      const mockMintFVIXWithFroth = vi.fn().mockReturnValue({
        canMint: false,
        missingFroth: BigInt(5000) * 10n ** 18n,
        txData: {
          address: '0x00f4CE400130C9383115f3858F9CA54677426583',
          abi: [],
          functionName: 'mint',
          args: [BigInt(25000) * 10n ** 18n],
        },
      });

      const { mintFVIXWithFroth } = await import('../flow/mintFVIX');
      (mintFVIXWithFroth as any).mockImplementation(mockMintFVIXWithFroth);

      const { result } = renderHook(() => useMintFVIX());

      await act(async () => {
        await expect(
          result.current.writeAsync({ frothAmount: '25000' })
        ).rejects.toThrow('Insufficient FROTH balance');
      });
    });

    it('should handle minimum threshold error', async () => {
      const mockMintFVIXWithFroth = vi.fn().mockReturnValue({
        canMint: false,
        missingFroth: 0n,
        txData: {
          address: '0x00f4CE400130C9383115f3858F9CA54677426583',
          abi: [],
          functionName: 'mint',
          args: [BigInt(5000) * 10n ** 18n],
        },
      });

      const { mintFVIXWithFroth } = await import('../flow/mintFVIX');
      (mintFVIXWithFroth as any).mockImplementation(mockMintFVIXWithFroth);

      const { result } = renderHook(() => useMintFVIX());

      await act(async () => {
        await expect(
          result.current.writeAsync({ frothAmount: '5000' })
        ).rejects.toThrow('Amount is below minimum threshold');
      });
    });

    it('should handle wallet not connected error', async () => {
      (useAccount as any).mockReturnValue({
        address: undefined,
      });

      const { result } = renderHook(() => useMintFVIX());

      await act(async () => {
        await expect(
          result.current.writeAsync({ frothAmount: '15000' })
        ).rejects.toThrow('Wallet not connected');
      });
    });

    it('should handle FROTH balance not available error', async () => {
      (useBalance as any).mockImplementation(() => ({
        data: undefined,
      }));

      const { result } = renderHook(() => useMintFVIX());

      await act(async () => {
        await expect(
          result.current.writeAsync({ frothAmount: '15000' })
        ).rejects.toThrow('FROTH balance not available');
      });
    });

    it('should check eligibility correctly', async () => {
      const mockCheckFVIXMintEligibility = vi.fn().mockReturnValue({
        canMint: true,
        hasMinimumThreshold: true,
        hasSufficientBalance: true,
        missingFroth: '0',
        thresholdMet: true,
      });

      const { checkFVIXMintEligibility } = await import('../flow/mintFVIX');
      (checkFVIXMintEligibility as any).mockImplementation(mockCheckFVIXMintEligibility);

      const { result } = renderHook(() => useMintFVIX());

      const eligibility = result.current.checkEligibility('15000');

      expect(mockCheckFVIXMintEligibility).toHaveBeenCalledWith(
        mockFrothBalance,
        '15000'
      );
      expect(eligibility.canMint).toBe(true);
      expect(eligibility.hasMinimumThreshold).toBe(true);
      expect(eligibility.hasSufficientBalance).toBe(true);
    });

    it('should return correct max mintable amount', async () => {
      const mockGetMaxMintableFVIX = vi.fn().mockReturnValue('20000');

      const { getMaxMintableFVIX } = await import('../flow/mintFVIX');
      (getMaxMintableFVIX as any).mockImplementation(mockGetMaxMintableFVIX);

      const { result } = renderHook(() => useMintFVIX());

      const maxMintable = result.current.getMaxMintable();

      expect(mockGetMaxMintableFVIX).toHaveBeenCalledWith(mockFrothBalance);
      expect(maxMintable).toBe('20000');
    });

    it('should check minimum threshold correctly', async () => {
      const mockMeetsMinimumThreshold = vi.fn().mockReturnValue(true);

      const { meetsMinimumThreshold } = await import('../flow/mintFVIX');
      (meetsMinimumThreshold as any).mockImplementation(mockMeetsMinimumThreshold);

      const { result } = renderHook(() => useMintFVIX());

      const meetsThreshold = result.current.meetsThreshold('15000');

      expect(mockMeetsMinimumThreshold).toHaveBeenCalledWith('15000');
      expect(meetsThreshold).toBe(true);
    });

    it('should handle loading and pending states', () => {
      (useWriteContract as any).mockReturnValue({
        writeContractAsync: vi.fn(),
        isPending: true,
        data: undefined,
        error: null,
      });

      const { result } = renderHook(() => useMintFVIX());

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

      const { result } = renderHook(() => useMintFVIX());

      expect(result.current.error).toBe(mockError);
    });
  });

  describe('useFrothAllowance hook', () => {
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

      const { result } = renderHook(() => useFrothAllowance());

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

      const { result } = renderHook(() => useFrothAllowance());

      await act(async () => {
        const txHash = await result.current.approveAsync(approvalAmount);
        expect(txHash).toBe(mockTxHash);
      });

      expect(mockApprove).toHaveBeenCalledWith({
        address: '0xB73BF8e6A4477a952E0338e6CC00cC0ce5AD04bA',
        abi: expect.any(Array),
        functionName: 'approve',
        args: ['0x00f4CE400130C9383115f3858F9CA54677426583', approvalAmount],
      });
    });

    it('should handle approval without wallet connection', async () => {
      (useAccount as any).mockReturnValue({
        address: undefined,
      });

      const { result } = renderHook(() => useFrothAllowance());

      await act(async () => {
        await expect(
          result.current.approveAsync(BigInt(1000) * 10n ** 18n)
        ).rejects.toThrow('Wallet not connected');
      });
    });
  });

  describe('useFVIXBalance hook', () => {
    it('should return correct balance information', () => {
      const mockBalance = {
        value: mockFVIXBalance,
        formatted: '1000',
      };

      (useBalance as any).mockReturnValue({
        data: mockBalance,
        isLoading: false,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useFVIXBalance());

      expect(result.current.balance).toBe(mockFVIXBalance);
      expect(result.current.formatted).toBe('1000');
      expect(result.current.isLoading).toBe(false);
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should handle loading state', () => {
      (useBalance as any).mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useFVIXBalance());

      expect(result.current.balance).toBe(0n);
      expect(result.current.formatted).toBe('0');
      expect(result.current.isLoading).toBe(true);
    });

    it('should handle undefined balance', () => {
      (useBalance as any).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useFVIXBalance());

      expect(result.current.balance).toBe(0n);
      expect(result.current.formatted).toBe('0');
    });
  });
});