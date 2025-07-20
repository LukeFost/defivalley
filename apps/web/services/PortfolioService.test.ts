import { describe, it, expect, vi, beforeEach } from 'vitest';
import { keccak256, encodeAbiParameters } from 'viem';
import { getMorphoPosition } from './PortfolioService';
import { MORPHO_VAULTS } from '@/constants/katana-tokens';

// Mock the @wagmi/core module
vi.mock('@wagmi/core', () => ({
  readContract: vi.fn(),
}));

// Import the mocked function
import { readContract } from '@wagmi/core';

describe('PortfolioService', () => {
  const mockConfig = {} as any;
  const mockUserAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
  const mockPositionData = {
    supplyShares: BigInt(1000000),
    borrowShares: BigInt(0),
    collateral: BigInt(0),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMorphoPosition', () => {
    it('should calculate the correct marketId for vbETH vault', async () => {
      // Mock the readContract response
      (readContract as any).mockResolvedValue(mockPositionData);

      // Call the function
      await getMorphoPosition(mockConfig, mockUserAddress);

      // Calculate expected market ID
      const marketParams = MORPHO_VAULTS.vbETH;
      const expectedMarketId = keccak256(
        encodeAbiParameters(
          [
            { type: 'address' },
            { type: 'address' },
            { type: 'address' },
            { type: 'address' },
            { type: 'uint256' },
          ],
          [
            marketParams.loanToken,
            marketParams.collateralToken,
            marketParams.oracle,
            marketParams.irm,
            marketParams.lltv,
          ]
        )
      );

      // Verify readContract was called with correct market ID
      const callArgs = (readContract as any).mock.calls[0][1];
      expect(callArgs.args[0]).toBe(expectedMarketId);
    });

    it('should call readContract with correct parameters', async () => {
      // Mock the readContract response
      (readContract as any).mockResolvedValue(mockPositionData);

      // Call the function
      await getMorphoPosition(mockConfig, mockUserAddress);

      // Verify readContract was called with correct parameters
      expect(readContract).toHaveBeenCalledTimes(1);
      expect(readContract).toHaveBeenCalledWith(
        mockConfig,
        {
          address: '0xD50F2DffFd62f94Ee4AEd9ca05C61d0753268aBc',
          abi: expect.any(Array),
          functionName: 'position',
          args: [expect.any(String), mockUserAddress],
        }
      );
    });

    it('should return the marketId and position data', async () => {
      // Mock the readContract response
      (readContract as any).mockResolvedValue(mockPositionData);

      // Call the function
      const result = await getMorphoPosition(mockConfig, mockUserAddress);

      // Verify the returned data
      expect(result).toHaveProperty('marketId');
      expect(result).toHaveProperty('positionData');
      expect(result.positionData).toEqual(mockPositionData);
    });

    it('should handle errors from readContract', async () => {
      // Mock readContract to throw an error
      const mockError = new Error('Contract read failed');
      (readContract as any).mockRejectedValue(mockError);

      // Expect the function to throw
      await expect(getMorphoPosition(mockConfig, mockUserAddress)).rejects.toThrow('Contract read failed');
    });
  });
});