import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseUnits, formatUnits } from 'viem';
import { 
  mintFVIXWithFroth, 
  checkFVIXMintEligibility, 
  getMaxMintableFVIX,
  getFrothThresholdFormatted,
  meetsMinimumThreshold,
  FVIX_TOKEN,
  FROTH_THRESHOLD
} from './mintFVIX';

// Mock viem functions
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    parseUnits: vi.fn(),
    formatUnits: vi.fn(),
  };
});

describe('FVIX Minting Helper', () => {
  const mockParseUnits = vi.mocked(parseUnits);
  const mockFormatUnits = vi.mocked(formatUnits);
  
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

  describe('mintFVIXWithFroth', () => {
    it('should prepare mint transaction when user has sufficient FROTH', () => {
      const frothBalance = BigInt('15000') * 10n ** 18n; // 15,000 FROTH
      const params = { frothAmount: '12000' }; // Mint with 12,000 FROTH

      const result = mintFVIXWithFroth(params, frothBalance);

      expect(result.txData.address).toBe(FVIX_TOKEN);
      expect(result.txData.functionName).toBe('mint');
      expect(result.txData.args[0]).toBe(BigInt('12000') * 10n ** 18n);
      expect(result.canMint).toBe(true);
      expect(result.missingFroth).toBe(0n);
      expect(result.frothAmountWei).toBe(BigInt('12000') * 10n ** 18n);
    });

    it('should indicate insufficient balance when user lacks FROTH', () => {
      const frothBalance = BigInt('8000') * 10n ** 18n; // 8,000 FROTH
      const params = { frothAmount: '12000' }; // Trying to mint with 12,000 FROTH

      const result = mintFVIXWithFroth(params, frothBalance);

      expect(result.canMint).toBe(false);
      expect(result.missingFroth).toBe(BigInt('4000') * 10n ** 18n); // 12,000 - 8,000
      expect(result.frothAmountWei).toBe(BigInt('12000') * 10n ** 18n);
    });

    it('should indicate cannot mint when amount is below threshold', () => {
      const frothBalance = BigInt('15000') * 10n ** 18n; // 15,000 FROTH
      const params = { frothAmount: '5000' }; // Below 10,000 threshold

      const result = mintFVIXWithFroth(params, frothBalance);

      expect(result.canMint).toBe(false); // Below threshold even though balance is sufficient
      expect(result.missingFroth).toBe(0n); // Balance is sufficient
      expect(result.frothAmountWei).toBe(BigInt('5000') * 10n ** 18n);
    });

    it('should handle exact threshold amount', () => {
      const frothBalance = BigInt('10000') * 10n ** 18n; // Exactly 10,000 FROTH
      const params = { frothAmount: '10000' }; // Exactly threshold

      const result = mintFVIXWithFroth(params, frothBalance);

      expect(result.canMint).toBe(true);
      expect(result.missingFroth).toBe(0n);
      expect(result.frothAmountWei).toBe(FROTH_THRESHOLD);
    });
  });

  describe('checkFVIXMintEligibility', () => {
    it('should return all positive when fully eligible', () => {
      const frothBalance = BigInt('15000') * 10n ** 18n;
      
      mockFormatUnits.mockReturnValue('0');

      const result = checkFVIXMintEligibility(frothBalance, '12000');

      expect(result.canMint).toBe(true);
      expect(result.hasMinimumThreshold).toBe(true);
      expect(result.hasSufficientBalance).toBe(true);
      expect(result.thresholdMet).toBe(true);
      expect(result.missingFroth).toBe('0');
    });

    it('should indicate missing FROTH when balance insufficient', () => {
      const frothBalance = BigInt('8000') * 10n ** 18n;
      
      mockFormatUnits.mockReturnValue('4000'); // Missing 4000 FROTH

      const result = checkFVIXMintEligibility(frothBalance, '12000');

      expect(result.canMint).toBe(false);
      expect(result.hasMinimumThreshold).toBe(true);
      expect(result.hasSufficientBalance).toBe(false);
      expect(result.thresholdMet).toBe(false); // Below threshold balance
      expect(result.missingFroth).toBe('4000');
    });

    it('should indicate threshold not met when amount too low', () => {
      const frothBalance = BigInt('15000') * 10n ** 18n;
      
      mockFormatUnits.mockReturnValue('0');

      const result = checkFVIXMintEligibility(frothBalance, '5000');

      expect(result.canMint).toBe(false);
      expect(result.hasMinimumThreshold).toBe(false); // Amount below threshold
      expect(result.hasSufficientBalance).toBe(true);
      expect(result.thresholdMet).toBe(true); // Total balance above threshold
      expect(result.missingFroth).toBe('0');
    });
  });

  describe('getMaxMintableFVIX', () => {
    it('should return formatted balance when above threshold', () => {
      const frothBalance = BigInt('15000') * 10n ** 18n;
      
      mockFormatUnits.mockReturnValue('15000');

      const result = getMaxMintableFVIX(frothBalance);

      expect(result).toBe('15000');
      expect(mockFormatUnits).toHaveBeenCalledWith(frothBalance, 18);
    });

    it('should return "0" when balance below threshold', () => {
      const frothBalance = BigInt('5000') * 10n ** 18n; // Below 10,000 threshold

      const result = getMaxMintableFVIX(frothBalance);

      expect(result).toBe('0');
      expect(mockFormatUnits).not.toHaveBeenCalled();
    });

    it('should return formatted amount for exact threshold', () => {
      const frothBalance = FROTH_THRESHOLD; // Exactly 10,000
      
      mockFormatUnits.mockReturnValue('10000');

      const result = getMaxMintableFVIX(frothBalance);

      expect(result).toBe('10000');
      expect(mockFormatUnits).toHaveBeenCalledWith(FROTH_THRESHOLD, 18);
    });
  });

  describe('getFrothThresholdFormatted', () => {
    it('should return formatted threshold with locale formatting', () => {
      mockFormatUnits.mockReturnValue('10000');
      
      const result = getFrothThresholdFormatted();

      expect(result).toBe('10,000'); // Locale formatted
      expect(mockFormatUnits).toHaveBeenCalledWith(FROTH_THRESHOLD, 18);
    });
  });

  describe('meetsMinimumThreshold', () => {
    it('should return true when amount meets threshold', () => {
      const result = meetsMinimumThreshold('12000');

      expect(result).toBe(true);
      expect(mockParseUnits).toHaveBeenCalledWith('12000', 18);
    });

    it('should return false when amount below threshold', () => {
      const result = meetsMinimumThreshold('5000');

      expect(result).toBe(false);
      expect(mockParseUnits).toHaveBeenCalledWith('5000', 18);
    });

    it('should return true for exact threshold', () => {
      const result = meetsMinimumThreshold('10000');

      expect(result).toBe(true);
      expect(mockParseUnits).toHaveBeenCalledWith('10000', 18);
    });
  });
});