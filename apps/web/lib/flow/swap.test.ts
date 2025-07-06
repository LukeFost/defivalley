import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseUnits, type Address } from 'viem';
import { 
  swapExactFLOWForTokens, 
  estimateFROTHOutput, 
  hasInsufficientBalance,
  PUNCHSWAP_V2_ROUTER,
  FLOW_TOKEN,
  FROTH_TOKEN
} from './swap';

// Mock viem functions
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    parseUnits: vi.fn(),
    formatUnits: vi.fn(),
  };
});

describe('Flow Swap Helper', () => {
  const mockParseUnits = vi.mocked(parseUnits);
  const mockRecipient = '0x1234567890123456789012345678901234567890' as Address;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockParseUnits.mockImplementation((value: string, decimals: number) => {
      if (decimals === 18) {
        return BigInt(value) * 10n ** 18n;
      }
      return BigInt(value);
    });
  });

  describe('swapExactFLOWForTokens', () => {
    it('should prepare swap transaction with correct parameters', async () => {
      const mockGetAmountsOut = vi.fn().mockResolvedValue([
        BigInt('100') * 10n ** 18n, // FLOW amount in
        BigInt('95') * 10n ** 18n,  // FROTH amount out
      ]);

      const params = {
        amountIn: '100',
        recipient: mockRecipient,
        slippage: 0.5,
      };

      const result = await swapExactFLOWForTokens(params, mockGetAmountsOut);

      expect(result.txData.address).toBe(PUNCHSWAP_V2_ROUTER);
      expect(result.txData.functionName).toBe('swapExactTokensForTokens');
      expect(result.txData.args[0]).toBe(BigInt('100') * 10n ** 18n); // amountIn
      expect(result.txData.args[2]).toEqual([FLOW_TOKEN, FROTH_TOKEN]); // path
      expect(result.txData.args[3]).toBe(mockRecipient); // to
      expect(result.estimatedOutput).toBe(BigInt('95') * 10n ** 18n);
      expect(mockGetAmountsOut).toHaveBeenCalledWith(
        BigInt('100') * 10n ** 18n,
        [FLOW_TOKEN, FROTH_TOKEN]
      );
    });

    it('should calculate slippage protection correctly', async () => {
      const mockGetAmountsOut = vi.fn().mockResolvedValue([
        BigInt('100') * 10n ** 18n,
        BigInt('1000') * 10n ** 18n, // 1000 FROTH output
      ]);

      const params = {
        amountIn: '100',
        recipient: mockRecipient,
        slippage: 1.0, // 1% slippage
      };

      const result = await swapExactFLOWForTokens(params, mockGetAmountsOut);

      // Expected: 1000 - (1000 * 1% = 10) = 990 FROTH minimum
      const expectedMinimum = BigInt('1000') * 10n ** 18n * 9900n / 10000n;
      expect(result.minimumOutput).toBe(expectedMinimum);
      expect(result.txData.args[1]).toBe(expectedMinimum); // amountOutMin
    });

    it('should use custom amountOutMin when provided', async () => {
      const mockGetAmountsOut = vi.fn().mockResolvedValue([
        BigInt('100') * 10n ** 18n,
        BigInt('95') * 10n ** 18n,
      ]);

      const params = {
        amountIn: '100',
        amountOutMin: '90', // Custom minimum
        recipient: mockRecipient,
      };

      const result = await swapExactFLOWForTokens(params, mockGetAmountsOut);

      expect(result.txData.args[1]).toBe(BigInt('90') * 10n ** 18n); // Custom amountOutMin
      expect(result.minimumOutput).toBe(BigInt('90') * 10n ** 18n);
    });

    it('should set deadline 20 minutes from now', async () => {
      const mockGetAmountsOut = vi.fn().mockResolvedValue([
        BigInt('100') * 10n ** 18n,
        BigInt('95') * 10n ** 18n,
      ]);

      const now = 1700000000; // Fixed timestamp
      vi.spyOn(Date, 'now').mockReturnValue(now * 1000);

      const params = {
        amountIn: '100',
        recipient: mockRecipient,
      };

      const result = await swapExactFLOWForTokens(params, mockGetAmountsOut);

      const expectedDeadline = BigInt(now + 1200); // +20 minutes
      expect(result.deadline).toBe(expectedDeadline);
      expect(result.txData.args[4]).toBe(expectedDeadline);
    });
  });

  describe('estimateFROTHOutput', () => {
    it('should return formatted FROTH output estimate', async () => {
      const mockFormatUnits = vi.fn().mockReturnValue('95.5');
      vi.doMock('viem', () => ({
        parseUnits: mockParseUnits,
        formatUnits: mockFormatUnits,
      }));

      const mockGetAmountsOut = vi.fn().mockResolvedValue([
        BigInt('100') * 10n ** 18n,
        BigInt('955') * 10n ** 17n, // 95.5 FROTH
      ]);

      const output = await estimateFROTHOutput('100', mockGetAmountsOut);

      expect(output).toBe('95.5');
      expect(mockGetAmountsOut).toHaveBeenCalledWith(
        BigInt('100') * 10n ** 18n,
        [FLOW_TOKEN, FROTH_TOKEN]
      );
    });
  });

  describe('hasInsufficientBalance', () => {
    it('should return true when balance is insufficient', () => {
      const flowBalance = BigInt('50') * 10n ** 18n; // 50 FLOW
      const amountIn = '100'; // Trying to swap 100 FLOW

      const result = hasInsufficientBalance(flowBalance, amountIn);

      expect(result).toBe(true);
    });

    it('should return false when balance is sufficient', () => {
      const flowBalance = BigInt('150') * 10n ** 18n; // 150 FLOW
      const amountIn = '100'; // Trying to swap 100 FLOW

      const result = hasInsufficientBalance(flowBalance, amountIn);

      expect(result).toBe(false);
    });

    it('should return false when balance exactly equals amount', () => {
      const flowBalance = BigInt('100') * 10n ** 18n; // 100 FLOW
      const amountIn = '100'; // Trying to swap 100 FLOW

      const result = hasInsufficientBalance(flowBalance, amountIn);

      expect(result).toBe(false);
    });
  });
});