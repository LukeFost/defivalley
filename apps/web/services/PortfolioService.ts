import { type Address, keccak256, encodeAbiParameters } from 'viem';
import { readContract } from '@wagmi/core';
import { config } from '../app/wagmi';
import { morpho_abi, morpho_katana_address } from '../../../packages/contracts/abi/morpho_abi';
import { MORPHO_VAULTS } from '@/constants/katana-tokens';

/**
 * Get a user's Morpho position for the vbETH vault
 * @param userAddress The user's wallet address
 * @returns The raw position data from the Morpho contract
 */
export async function getMorphoPosition(userAddress: Address) {
  // Calculate market ID for vbETH vault
  const marketParams = MORPHO_VAULTS.vbETH;
  
  const marketId = keccak256(
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

  // Call the position function on the Morpho contract
  const positionData = await readContract(config, {
    address: morpho_katana_address as Address,
    abi: morpho_abi,
    functionName: 'position',
    args: [marketId, userAddress],
  });

  return {
    marketId,
    positionData,
  };
}