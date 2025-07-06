import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseUnits, formatUnits, type Address } from 'viem';
import { 
  stakeFVIXForShares, 
  unstakeFVIXFromShares,
  claimStakingRewards,
  checkStakingEligibility, 
  getMaxStakeableFVIX,
  estimateSFVIXShares,
  hasStakeableFVIX,
  sFVIX_TOKEN,
  FVIX_TOKEN
} from './stakeFVIX';

// Mock viem functions
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    parseUnits: vi.fn(),
    formatUnits: vi.fn(),
  };
});

describe('FVIX Staking Helper', () => {
  const mockParseUnits = vi.mocked(parseUnits);
  const mockFormatUnits = vi.mocked(formatUnits);
  const mockRecipient = '0x1234567890123456789012345678901234567890' as Address;
  const mockOwner = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef' as Address;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockParseUnits.mockImplementation((value: string, decimals: number) => {
      if (decimals === 18) {
        return BigInt(value) * 10n ** 18n;
      }
      return BigInt(value);
    });
    
    mockFormatUnits.mockImplementation((value: bigint, decimals: number) => {
      if (decimals === 18) {
        return (Number(value) / Number(10n ** 18n)).toString();
      }
      return value.toString();
    });
  });

  describe('stakeFVIXForShares', () => {
    it('should prepare staking transaction when user has sufficient FVIX', () => {
      const fvixBalance = BigInt('500') * 10n ** 18n; // 500 FVIX
      const params = { 
        fvixAmount: '100', 
        recipient: mockRecipient 
      };

      const result = stakeFVIXForShares(params, fvixBalance);

      expect(result.txData.address).toBe(sFVIX_TOKEN);
      expect(result.txData.functionName).toBe('deposit');
      expect(result.txData.args[0]).toBe(BigInt('100') * 10n ** 18n); // FVIX amount
      expect(result.txData.args[1]).toBe(mockRecipient); // recipient
      expect(result.canStake).toBe(true);
      expect(result.missingFvix).toBe(0n);
      expect(result.fvixAmountWei).toBe(BigInt('100') * 10n ** 18n);
    });

    it('should indicate insufficient balance when user lacks FVIX', () => {
      const fvixBalance = BigInt('50') * 10n ** 18n; // 50 FVIX
      const params = { 
        fvixAmount: '100', 
        recipient: mockRecipient 
      };

      const result = stakeFVIXForShares(params, fvixBalance);

      expect(result.canStake).toBe(false);
      expect(result.missingFvix).toBe(BigInt('50') * 10n ** 18n); // 100 - 50
      expect(result.fvixAmountWei).toBe(BigInt('100') * 10n ** 18n);
    });

    it('should handle exact balance amount', () => {
      const fvixBalance = BigInt('100') * 10n ** 18n; // Exactly 100 FVIX
      const params = { 
        fvixAmount: '100', 
        recipient: mockRecipient 
      };

      const result = stakeFVIXForShares(params, fvixBalance);

      expect(result.canStake).toBe(true);
      expect(result.missingFvix).toBe(0n);
      expect(result.fvixAmountWei).toBe(BigInt('100') * 10n ** 18n);
    });
  });

  describe('unstakeFVIXFromShares', () => {
    it('should prepare unstaking transaction with correct parameters', () => {
      const params = {
        sFvixAmount: '50',
        recipient: mockRecipient,
        owner: mockOwner
      };

      const result = unstakeFVIXFromShares(params);

      expect(result.address).toBe(sFVIX_TOKEN);
      expect(result.functionName).toBe('withdraw');
      expect(result.args[0]).toBe(BigInt('50') * 10n ** 18n); // sFVIX amount
      expect(result.args[1]).toBe(mockRecipient); // recipient
      expect(result.args[2]).toBe(mockOwner); // owner
    });
  });

  describe('claimStakingRewards', () => {
    it('should prepare rewards claiming transaction', () => {
      const result = claimStakingRewards();

      expect(result.address).toBe(sFVIX_TOKEN);
      expect(result.functionName).toBe('claimRewards');
      expect(result.args).toEqual([]);
    });
  });

  describe('checkStakingEligibility', () => {
    it('should return all positive when fully eligible', () => {
      const fvixBalance = BigInt('500') * 10n ** 18n;
      
      mockFormatUnits.mockReturnValue('0');

      const result = checkStakingEligibility(fvixBalance, '100');

      expect(result.canStake).toBe(true);
      expect(result.hasSufficientBalance).toBe(true);
      expect(result.hasAnyFvix).toBe(true);
      expect(result.missingFvix).toBe('0');
    });

    it('should indicate insufficient balance when lacking FVIX', () => {
      const fvixBalance = BigInt('50') * 10n ** 18n;
      
      mockFormatUnits.mockReturnValue('50'); // Missing 50 FVIX

      const result = checkStakingEligibility(fvixBalance, '100');

      expect(result.canStake).toBe(false);
      expect(result.hasSufficientBalance).toBe(false);
      expect(result.hasAnyFvix).toBe(true);
      expect(result.missingFvix).toBe('50');
    });

    it('should indicate no FVIX when balance is zero', () => {
      const fvixBalance = 0n;
      
      mockFormatUnits.mockReturnValue('100'); // Missing 100 FVIX

      const result = checkStakingEligibility(fvixBalance, '100');

      expect(result.canStake).toBe(false);
      expect(result.hasSufficientBalance).toBe(false);
      expect(result.hasAnyFvix).toBe(false);
      expect(result.missingFvix).toBe('100');
    });
  });

  describe('getMaxStakeableFVIX', () => {
    it('should return formatted balance when balance exists', () => {
      const fvixBalance = BigInt('250') * 10n ** 18n;
      
      mockFormatUnits.mockReturnValue('250');

      const result = getMaxStakeableFVIX(fvixBalance);

      expect(result).toBe('250');
      expect(mockFormatUnits).toHaveBeenCalledWith(fvixBalance, 18);
    });

    it('should return "0" when balance is zero', () => {
      const fvixBalance = 0n;

      const result = getMaxStakeableFVIX(fvixBalance);

      expect(result).toBe('0');
      expect(mockFormatUnits).not.toHaveBeenCalled();
    });
  });

  describe('estimateSFVIXShares', () => {
    it('should return estimated shares from preview function', async () => {
      const mockPreviewDeposit = vi.fn().mockResolvedValue(BigInt('100') * 10n ** 18n);
      
      mockFormatUnits.mockReturnValue('100');

      const result = await estimateSFVIXShares('100', mockPreviewDeposit);

      expect(result).toBe('100');
      expect(mockPreviewDeposit).toHaveBeenCalledWith(BigInt('100') * 10n ** 18n);
      expect(mockFormatUnits).toHaveBeenCalledWith(BigInt('100') * 10n ** 18n, 18);
    });

    it('should handle different exchange rates', async () => {
      const mockPreviewDeposit = vi.fn().mockResolvedValue(BigInt('95') * 10n ** 18n); // 0.95 exchange rate
      
      mockFormatUnits.mockReturnValue('95');

      const result = await estimateSFVIXShares('100', mockPreviewDeposit);

      expect(result).toBe('95');
      expect(mockPreviewDeposit).toHaveBeenCalledWith(BigInt('100') * 10n ** 18n);
    });
  });

  describe('hasStakeableFVIX', () => {
    it('should return true when balance exists', () => {
      const fvixBalance = BigInt('1') * 10n ** 18n;

      const result = hasStakeableFVIX(fvixBalance);

      expect(result).toBe(true);
    });

    it('should return false when balance is zero', () => {
      const fvixBalance = 0n;

      const result = hasStakeableFVIX(fvixBalance);

      expect(result).toBe(false);
    });

    it('should return true for very small amounts', () => {
      const fvixBalance = 1n; // 1 wei

      const result = hasStakeableFVIX(fvixBalance);

      expect(result).toBe(true);
    });
  });
});