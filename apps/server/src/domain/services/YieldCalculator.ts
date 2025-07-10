import { SEED_CONFIGS, SeedType } from '../../types/game.types';

export class YieldCalculator {
  /**
   * Calculate yield for a crop based on time elapsed
   * @param investmentAmount The amount invested in the crop
   * @param plantedAt The date when the crop was planted
   * @param seedType The type of seed planted
   * @returns The calculated yield amount
   */
  calculateYield(
    investmentAmount: number,
    plantedAt: Date,
    seedType: SeedType
  ): number {
    const plantedTime = plantedAt.getTime();
    const currentTime = Date.now();
    const timeElapsedMs = currentTime - plantedTime;
    const timeElapsedYears = timeElapsedMs / (365 * 24 * 60 * 60 * 1000);
    
    const seedConfig = SEED_CONFIGS[seedType];
    const baseYieldRate = seedConfig.baseYieldRate;
    
    // Simple interest calculation for demo
    const yieldAmount = investmentAmount * baseYieldRate * timeElapsedYears;
    return Math.round(yieldAmount * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate XP gain from investment
   * @param investmentAmount The amount invested
   * @returns The XP to be awarded
   */
  calculateXPGain(investmentAmount: number): number {
    // 1 XP per 10 USDC invested
    return Math.floor(investmentAmount / 10);
  }

  /**
   * Validate investment amount for a seed type
   * @param seedType The type of seed
   * @param investmentAmount The proposed investment amount
   * @returns True if the investment is valid
   */
  validateInvestment(seedType: SeedType, investmentAmount: number): boolean {
    const seedConfig = SEED_CONFIGS[seedType];
    return investmentAmount >= seedConfig.minInvestment;
  }

  /**
   * Get minimum investment for a seed type
   * @param seedType The type of seed
   * @returns The minimum investment amount
   */
  getMinimumInvestment(seedType: SeedType): number {
    return SEED_CONFIGS[seedType].minInvestment;
  }
}