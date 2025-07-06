import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useSwapFlow, useFlowAllowance } from './useSwapFlow';
import { useAccount, useWriteContract, useBalance, useReadContract, usePublicClient } from 'wagmi';
import { parseUnits } from 'viem';

// Mock wagmi hooks
vi.mock('wagmi');
vi.mock('viem');

// Mock the Flow helper functions
vi.mock('../flow/swap', () => ({
  swapExactFLOWForTokens: vi.fn(),
  estimateFROTHOutput: vi.fn(),
  hasInsufficientBalance: vi.fn(),
  PUNCHSWAP_V2_ROUTER: '0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d',
  PUNCHSWAP_V2_ABI: [],
  FLOW_TOKEN: '0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e',
  FROTH_TOKEN: '0xB73BF8e6A4477a952E0338e6CC00cC0ce5AD04bA',
}));

// Mock constants
vi.mock('../../../../packages/contracts/flow/constants', () => ({
  FLOW_TOKEN: '0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e',
  FROTH_TOKEN: '0xB73BF8e6A4477a952E0338e6CC00cC0ce5AD04bA',
  PUNCHSWAP_V2_ROUTER: '0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d',
  SWAP_PATHS: {
    FLOW_TO_FROTH: ['0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e', '0xB73BF8e6A4477a952E0338e6CC00cC0ce5AD04bA'],
  },
  TOKEN_DECIMALS: {
    FLOW: 18,
    FROTH: 18,
    FVIX: 18,
    sFVIX: 18,
  },
}));

describe('useSwapFlow', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockTxHash = '0xabcdef123456789';
  const mockFlowBalance = BigInt(1000) * 10n ** 18n; // 1,000 FLOW
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

    // Mock useBalance for FLOW
    (useBalance as any).mockReturnValue({
      data: { value: mockFlowBalance, formatted: '1000' },
    });

    // Mock useReadContract
    (useReadContract as any).mockReturnValue({
      data: undefined,
      refetch: vi.fn(),
    });

    // Mock parseUnits
    (parseUnits as any).mockImplementation((value: string, decimals: number) => {
      return BigInt(value) * 10n ** BigInt(decimals);
    });
  });

  describe('useSwapFlow hook', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useSwapFlow());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isPending).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
      expect(typeof result.current.writeAsync).toBe('function');
      expect(typeof result.current.estimateOutput).toBe('function');
      expect(typeof result.current.hasInsufficientBalance).toBe('function');
    });

    it('should handle successful swap transaction', async () => {
      const mockWriteContractAsync = vi.fn().mockResolvedValue(mockTxHash);
      const mockSwapExactFLOWForTokens = vi.fn().mockResolvedValue({
        txData: {
          address: '0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d',
          abi: [],
          functionName: 'swapExactTokensForTokens',
          args: [
            BigInt(100) * 10n ** 18n, // amountIn
            BigInt(90) * 10n ** 18n,  // amountOutMin
            ['0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e', '0xB73BF8e6A4477a952E0338e6CC00cC0ce5AD04bA'],
            mockAddress,
            BigInt(Math.floor(Date.now() / 1000) + 1200),
          ],
        },
        estimatedOutput: BigInt(95) * 10n ** 18n,
        minimumOutput: BigInt(90) * 10n ** 18n,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
      });

      (useWriteContract as any).mockReturnValue({
        writeContractAsync: mockWriteContractAsync,
        isPending: false,
        data: mockTxHash,
        error: null,
      });

      const { swapExactFLOWForTokens } = await import('../flow/swap');
      (swapExactFLOWForTokens as any).mockImplementation(mockSwapExactFLOWForTokens);

      const { result } = renderHook(() => useSwapFlow());

      await act(async () => {
        const txHash = await result.current.writeAsync({ 
          amountIn: '100',
          slippage: 0.5,
        });
        expect(txHash).toBe(mockTxHash);
      });

      expect(mockSwapExactFLOWForTokens).toHaveBeenCalledWith(
        {
          amountIn: '100',
          slippage: 0.5,
          amountOutMin: undefined,
          recipient: mockAddress,
        },
        expect.any(Function)
      );
      expect(mockWriteContractAsync).toHaveBeenCalledWith({
        address: '0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d',
        abi: [],
        functionName: 'swapExactTokensForTokens',
        args: [
          BigInt(100) * 10n ** 18n,
          BigInt(90) * 10n ** 18n,
          ['0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e', '0xB73BF8e6A4477a952E0338e6CC00cC0ce5AD04bA'],
          mockAddress,
          expect.any(BigInt),
        ],
      });
    });

    it('should handle swap with custom amount out min', async () => {
      const mockWriteContractAsync = vi.fn().mockResolvedValue(mockTxHash);
      const mockSwapExactFLOWForTokens = vi.fn().mockResolvedValue({
        txData: {
          address: '0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d',
          abi: [],
          functionName: 'swapExactTokensForTokens',
          args: [
            BigInt(100) * 10n ** 18n, // amountIn
            BigInt(80) * 10n ** 18n,  // custom amountOutMin
            ['0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e', '0xB73BF8e6A4477a952E0338e6CC00cC0ce5AD04bA'],
            mockAddress,
            BigInt(Math.floor(Date.now() / 1000) + 1200),
          ],
        },
        estimatedOutput: BigInt(95) * 10n ** 18n,
        minimumOutput: BigInt(80) * 10n ** 18n,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
      });

      (useWriteContract as any).mockReturnValue({
        writeContractAsync: mockWriteContractAsync,
        isPending: false,
        data: mockTxHash,
        error: null,
      });

      const { swapExactFLOWForTokens } = await import('../flow/swap');
      (swapExactFLOWForTokens as any).mockImplementation(mockSwapExactFLOWForTokens);

      const { result } = renderHook(() => useSwapFlow());

      await act(async () => {
        const txHash = await result.current.writeAsync({ 
          amountIn: '100',
          amountOutMin: '80',
        });
        expect(txHash).toBe(mockTxHash);
      });

      expect(mockSwapExactFLOWForTokens).toHaveBeenCalledWith(
        {
          amountIn: '100',
          slippage: undefined,
          amountOutMin: '80',
          recipient: mockAddress,
        },
        expect.any(Function)
      );
    });

    it('should handle wallet not connected error', async () => {
      (useAccount as any).mockReturnValue({
        address: undefined,
      });

      const { result } = renderHook(() => useSwapFlow());

      await act(async () => {
        await expect(
          result.current.writeAsync({ amountIn: '100' })
        ).rejects.toThrow('Wallet not connected');
      });
    });

    it('should handle public client not available error', async () => {
      (usePublicClient as any).mockReturnValue(null);

      const { result } = renderHook(() => useSwapFlow());

      await act(async () => {
        await expect(
          result.current.writeAsync({ amountIn: '100' })
        ).rejects.toThrow('Public client not available');
      });
    });

    it('should estimate output correctly', async () => {
      const mockEstimateFROTHOutput = vi.fn().mockResolvedValue('95');

      mockPublicClient.readContract.mockResolvedValue([
        BigInt(100) * 10n ** 18n,
        BigInt(95) * 10n ** 18n,
      ]);

      const { estimateFROTHOutput } = await import('../flow/swap');
      (estimateFROTHOutput as any).mockImplementation(mockEstimateFROTHOutput);

      const { result } = renderHook(() => useSwapFlow());

      await act(async () => {
        const output = await result.current.estimateOutput('100');
        expect(output).toBe('95');
      });

      expect(mockEstimateFROTHOutput).toHaveBeenCalledWith(
        '100',
        expect.any(Function)
      );
    });

    it('should handle estimate output with no public client', async () => {
      (usePublicClient as any).mockReturnValue(null);

      const { result } = renderHook(() => useSwapFlow());

      await act(async () => {
        const output = await result.current.estimateOutput('100');
        expect(output).toBeNull();
      });
    });

    it('should handle estimate output with zero amount', async () => {
      const { result } = renderHook(() => useSwapFlow());

      await act(async () => {
        const output = await result.current.estimateOutput('0');
        expect(output).toBeNull();
      });
    });

    it('should handle estimate output error', async () => {
      const mockEstimateFROTHOutput = vi.fn().mockRejectedValue(new Error('Estimation failed'));

      mockPublicClient.readContract.mockRejectedValue(new Error('Estimation failed'));

      const { estimateFROTHOutput } = await import('../flow/swap');
      (estimateFROTHOutput as any).mockImplementation(mockEstimateFROTHOutput);

      const { result } = renderHook(() => useSwapFlow());

      await act(async () => {
        const output = await result.current.estimateOutput('100');
        expect(output).toBeNull();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Estimation failed');
    });

    it('should check insufficient balance correctly', async () => {
      const mockHasInsufficientBalance = vi.fn().mockReturnValue(false);

      const { hasInsufficientBalance } = await import('../flow/swap');
      (hasInsufficientBalance as any).mockImplementation(mockHasInsufficientBalance);

      const { result } = renderHook(() => useSwapFlow());

      const insufficient = result.current.hasInsufficientBalance('100');

      expect(mockHasInsufficientBalance).toHaveBeenCalledWith(
        mockFlowBalance,
        '100'
      );
      expect(insufficient).toBe(false);
    });

    it('should handle insufficient balance with no FLOW balance', () => {
      (useBalance as any).mockReturnValue({
        data: undefined,
      });

      const { result } = renderHook(() => useSwapFlow());

      const insufficient = result.current.hasInsufficientBalance('100');
      expect(insufficient).toBe(true);
    });

    it('should handle insufficient balance with empty amount', () => {
      const { result } = renderHook(() => useSwapFlow());

      const insufficient = result.current.hasInsufficientBalance('');
      expect(insufficient).toBe(true);
    });

    it('should handle loading and pending states', () => {
      (useWriteContract as any).mockReturnValue({
        writeContractAsync: vi.fn(),
        isPending: true,
        data: undefined,
        error: null,
      });

      const { result } = renderHook(() => useSwapFlow());

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

      const { result } = renderHook(() => useSwapFlow());

      expect(result.current.error).toBe(mockError);
    });

    it('should handle estimate error combined with write error', async () => {
      const writeError = new Error('Write failed');
      const estimateError = new Error('Estimate failed');

      (useWriteContract as any).mockReturnValue({
        writeContractAsync: vi.fn(),
        isPending: false,
        data: undefined,
        error: writeError,
      });

      const { result } = renderHook(() => useSwapFlow());

      // First trigger an estimate error
      mockPublicClient.readContract.mockRejectedValue(estimateError);

      await act(async () => {
        await result.current.estimateOutput('100');
      });

      // The hook should prioritize write error over estimate error
      expect(result.current.error).toBe(writeError);
    });
  });

  describe('useFlowAllowance hook', () => {
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

      const { result } = renderHook(() => useFlowAllowance());

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

      const { result } = renderHook(() => useFlowAllowance());

      await act(async () => {
        const txHash = await result.current.approveAsync(approvalAmount);
        expect(txHash).toBe(mockTxHash);
      });

      expect(mockApprove).toHaveBeenCalledWith({
        address: '0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e',
        abi: expect.any(Array),
        functionName: 'approve',
        args: ['0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d', approvalAmount],
      });
    });

    it('should handle approval without wallet connection', async () => {
      (useAccount as any).mockReturnValue({
        address: undefined,
      });

      const { result } = renderHook(() => useFlowAllowance());

      await act(async () => {
        await expect(
          result.current.approveAsync(BigInt(1000) * 10n ** 18n)
        ).rejects.toThrow('Wallet not connected');
      });
    });

    it('should handle default allowance when undefined', () => {
      (useReadContract as any).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useFlowAllowance());

      expect(result.current.allowance).toBe(0n);
    });

    it('should handle approval loading state', () => {
      (useWriteContract as any).mockReturnValue({
        writeContractAsync: vi.fn(),
        isPending: true,
      });

      const { result } = renderHook(() => useFlowAllowance());

      expect(result.current.isApproving).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle full swap flow: check allowance -> approve -> swap', async () => {
      const mockApprove = vi.fn().mockResolvedValue('0xapprove123');
      const mockSwap = vi.fn().mockResolvedValue(mockTxHash);
      const mockSwapExactFLOWForTokens = vi.fn().mockResolvedValue({
        txData: {
          address: '0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d',
          abi: [],
          functionName: 'swapExactTokensForTokens',
          args: [
            BigInt(100) * 10n ** 18n,
            BigInt(90) * 10n ** 18n,
            ['0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e', '0xB73BF8e6A4477a952E0338e6CC00cC0ce5AD04bA'],
            mockAddress,
            expect.any(BigInt),
          ],
        },
        estimatedOutput: BigInt(95) * 10n ** 18n,
        minimumOutput: BigInt(90) * 10n ** 18n,
        deadline: expect.any(BigInt),
      });

      // Mock allowance check
      (useReadContract as any).mockReturnValue({
        data: BigInt(50) * 10n ** 18n, // Insufficient allowance
        refetch: vi.fn(),
      });

      // Mock write contract for both approve and swap
      (useWriteContract as any).mockReturnValue({
        writeContractAsync: vi.fn()
          .mockResolvedValueOnce('0xapprove123') // First call: approve
          .mockResolvedValueOnce(mockTxHash),    // Second call: swap
        isPending: false,
      });

      const { swapExactFLOWForTokens } = await import('../flow/swap');
      (swapExactFLOWForTokens as any).mockImplementation(mockSwapExactFLOWForTokens);

      const { result: allowanceResult } = renderHook(() => useFlowAllowance());
      const { result: swapResult } = renderHook(() => useSwapFlow());

      // Step 1: Approve
      await act(async () => {
        const approveTxHash = await allowanceResult.current.approveAsync(
          BigInt(100) * 10n ** 18n
        );
        expect(approveTxHash).toBe('0xapprove123');
      });

      // Step 2: Swap
      await act(async () => {
        const swapTxHash = await swapResult.current.writeAsync({
          amountIn: '100',
          slippage: 0.5,
        });
        expect(swapTxHash).toBe(mockTxHash);
      });

      expect(mockSwapExactFLOWForTokens).toHaveBeenCalledWith(
        {
          amountIn: '100',
          slippage: 0.5,
          amountOutMin: undefined,
          recipient: mockAddress,
        },
        expect.any(Function)
      );
    });

    it('should handle concurrent estimate and swap operations', async () => {
      const mockEstimateFROTHOutput = vi.fn().mockResolvedValue('95');
      const mockSwapExactFLOWForTokens = vi.fn().mockResolvedValue({
        txData: {
          address: '0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d',
          abi: [],
          functionName: 'swapExactTokensForTokens',
          args: [
            BigInt(100) * 10n ** 18n,
            BigInt(90) * 10n ** 18n,
            ['0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e', '0xB73BF8e6A4477a952E0338e6CC00cC0ce5AD04bA'],
            mockAddress,
            expect.any(BigInt),
          ],
        },
        estimatedOutput: BigInt(95) * 10n ** 18n,
        minimumOutput: BigInt(90) * 10n ** 18n,
        deadline: expect.any(BigInt),
      });

      mockPublicClient.readContract.mockResolvedValue([
        BigInt(100) * 10n ** 18n,
        BigInt(95) * 10n ** 18n,
      ]);

      (useWriteContract as any).mockReturnValue({
        writeContractAsync: vi.fn().mockResolvedValue(mockTxHash),
        isPending: false,
        data: mockTxHash,
        error: null,
      });

      const { estimateFROTHOutput } = await import('../flow/swap');
      (estimateFROTHOutput as any).mockImplementation(mockEstimateFROTHOutput);

      const { swapExactFLOWForTokens } = await import('../flow/swap');
      (swapExactFLOWForTokens as any).mockImplementation(mockSwapExactFLOWForTokens);

      const { result } = renderHook(() => useSwapFlow());

      // Concurrent operations
      await act(async () => {
        const [estimateResult, swapResult] = await Promise.all([
          result.current.estimateOutput('100'),
          result.current.writeAsync({ amountIn: '100' }),
        ]);

        expect(estimateResult).toBe('95');
        expect(swapResult).toBe(mockTxHash);
      });

      expect(mockEstimateFROTHOutput).toHaveBeenCalledWith('100', expect.any(Function));
      expect(mockSwapExactFLOWForTokens).toHaveBeenCalledWith(
        {
          amountIn: '100',
          slippage: undefined,
          amountOutMin: undefined,
          recipient: mockAddress,
        },
        expect.any(Function)
      );
    });
  });
});