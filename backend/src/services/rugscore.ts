import { SolanaService } from './solana';

export interface RugScoreFactors {
  liquidity: number;
  holderDistribution: number;
  volume: number;
  age: number;
  transactionCount: number;
  devWalletActivity: number;
  socialSignals: number;
}

export interface RugScoreResult {
  score: number;
  factors: RugScoreFactors;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  recommendations: string[];
}

export class RugScoreService {
  private solanaService: SolanaService;

  constructor(solanaService: SolanaService) {
    this.solanaService = solanaService;
  }

  /**
   * Calculate comprehensive rug score for a token
   */
  async calculateRugScore(
    tokenMint: string,
    poolData: any
  ): Promise<RugScoreResult> {
    try {
      const factors = await this.analyzeTokenFactors(tokenMint, poolData);
      const score = this.calculateScore(factors);
      const riskLevel = this.determineRiskLevel(score);
      const recommendations = this.generateRecommendations(factors, score);

      return {
        score,
        factors,
        riskLevel,
        recommendations
      };
    } catch (error) {
      console.error('Error calculating rug score:', error);
      return {
        score: 100,
        factors: {
          liquidity: 0,
          holderDistribution: 0,
          volume: 0,
          age: 0,
          transactionCount: 0,
          devWalletActivity: 0,
          socialSignals: 0
        },
        riskLevel: 'EXTREME',
        recommendations: ['Unable to analyze token - proceed with extreme caution']
      };
    }
  }

  /**
   * Analyze various factors that contribute to rug score
   */
  private async analyzeTokenFactors(tokenMint: string, poolData: any): Promise<RugScoreFactors> {
    const [
      tokenInfo,
      transactionHistory,
      priceData
    ] = await Promise.all([
      this.solanaService.getTokenAccountInfo(tokenMint),
      this.solanaService.getTokenTransactionHistory(tokenMint, 50),
      this.solanaService.getTokenPrice(tokenMint)
    ]);

    // Liquidity factor (0-100, lower is riskier)
    const liquidity = this.calculateLiquidityFactor(poolData.liquidity, tokenInfo.totalSupply);

    // Holder distribution factor (0-100, lower is riskier)
    const holderDistribution = this.calculateHolderDistributionFactor(tokenInfo.topHolders);

    // Volume factor (0-100, higher volume = lower risk)
    const volume = this.calculateVolumeFactor(poolData.totalVolume, poolData.liquidity);

    // Age factor (0-100, newer tokens are riskier)
    const age = this.calculateAgeFactor(poolData.createdAt);

    // Transaction count factor (0-100, more transactions = lower risk)
    const transactionCount = this.calculateTransactionCountFactor(transactionHistory.length);

    // Dev wallet activity factor (0-100, suspicious activity = higher risk)
    const devWalletActivity = await this.calculateDevWalletActivityFactor(tokenMint);

    // Social signals factor (0-100, based on community activity)
    const socialSignals = await this.calculateSocialSignalsFactor(tokenMint);

    return {
      liquidity,
      holderDistribution,
      volume,
      age,
      transactionCount,
      devWalletActivity,
      socialSignals
    };
  }

  /**
   * Calculate liquidity factor
   */
  private calculateLiquidityFactor(liquidity: bigint, totalSupply: number): number {
    const liquiditySOL = Number(liquidity) / 1e9;
    
    if (liquiditySOL >= 100) return 10;  // Very high liquidity
    if (liquiditySOL >= 50) return 20;   // High liquidity
    if (liquiditySOL >= 20) return 40;   // Medium liquidity
    if (liquiditySOL >= 10) return 60;   // Low liquidity
    if (liquiditySOL >= 5) return 80;    // Very low liquidity
    return 100; // Extremely low liquidity
  }

  /**
   * Calculate holder distribution factor
   */
  private calculateHolderDistributionFactor(topHolders: any[]): number {
    if (topHolders.length === 0) return 100;

    const topHolderPercentage = topHolders[0]?.percentage || 0;
    
    if (topHolderPercentage <= 0.1) return 10;  // Well distributed
    if (topHolderPercentage <= 0.2) return 20;  // Good distribution
    if (topHolderPercentage <= 0.3) return 40;  // Moderate concentration
    if (topHolderPercentage <= 0.5) return 60;  // High concentration
    if (topHolderPercentage <= 0.7) return 80;  // Very high concentration
    return 100; // Extremely concentrated
  }

  /**
   * Calculate volume factor
   */
  private calculateVolumeFactor(totalVolume: bigint, liquidity: bigint): number {
    const volumeSOL = Number(totalVolume) / 1e9;
    const liquiditySOL = Number(liquidity) / 1e9;
    
    if (liquiditySOL === 0) return 100;
    
    const volumeRatio = volumeSOL / liquiditySOL;
    
    if (volumeRatio >= 10) return 10;  // Very high volume
    if (volumeRatio >= 5) return 20;   // High volume
    if (volumeRatio >= 2) return 40;   // Moderate volume
    if (volumeRatio >= 1) return 60;   // Low volume
    return 80; // Very low volume
  }

  /**
   * Calculate age factor
   */
  private calculateAgeFactor(createdAt: string): number {
    const now = Date.now();
    const created = new Date(createdAt).getTime();
    const ageHours = (now - created) / (1000 * 60 * 60);
    
    if (ageHours >= 168) return 10;  // 1 week+
    if (ageHours >= 72) return 20;   // 3 days+
    if (ageHours >= 24) return 40;   // 1 day+
    if (ageHours >= 6) return 60;    // 6 hours+
    if (ageHours >= 1) return 80;   // 1 hour+
    return 100; // Less than 1 hour
  }

  /**
   * Calculate transaction count factor
   */
  private calculateTransactionCountFactor(transactionCount: number): number {
    if (transactionCount >= 1000) return 10;  // Very active
    if (transactionCount >= 500) return 20;   // Active
    if (transactionCount >= 100) return 40;  // Moderate
    if (transactionCount >= 50) return 60;   // Low
    if (transactionCount >= 10) return 80;   // Very low
    return 100; // Minimal activity
  }

  /**
   * Calculate dev wallet activity factor
   */
  private async calculateDevWalletActivityFactor(tokenMint: string): Promise<number> {
    try {
      // This would analyze dev wallet behavior patterns
      // For now, return a moderate risk score
      return 50;
    } catch (error) {
      return 100; // High risk if we can't analyze
    }
  }

  /**
   * Calculate social signals factor
   */
  private async calculateSocialSignalsFactor(tokenMint: string): Promise<number> {
    try {
      // This would analyze social media mentions, community activity, etc.
      // For now, return a moderate score
      return 50;
    } catch (error) {
      return 100; // High risk if we can't analyze
    }
  }

  /**
   * Calculate final score from factors
   */
  private calculateScore(factors: RugScoreFactors): number {
    const weights = {
      liquidity: 0.25,
      holderDistribution: 0.20,
      volume: 0.15,
      age: 0.15,
      transactionCount: 0.10,
      devWalletActivity: 0.10,
      socialSignals: 0.05
    };

    const weightedScore = 
      factors.liquidity * weights.liquidity +
      factors.holderDistribution * weights.holderDistribution +
      factors.volume * weights.volume +
      factors.age * weights.age +
      factors.transactionCount * weights.transactionCount +
      factors.devWalletActivity * weights.devWalletActivity +
      factors.socialSignals * weights.socialSignals;

    return Math.round(weightedScore);
  }

  /**
   * Determine risk level based on score
   */
  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
    if (score <= 25) return 'LOW';
    if (score <= 50) return 'MEDIUM';
    if (score <= 75) return 'HIGH';
    return 'EXTREME';
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(factors: RugScoreFactors, score: number): string[] {
    const recommendations: string[] = [];

    if (factors.liquidity > 60) {
      recommendations.push('⚠️ Low liquidity detected - high slippage risk');
    }

    if (factors.holderDistribution > 60) {
      recommendations.push('⚠️ Concentrated token ownership - potential rug pull risk');
    }

    if (factors.age > 60) {
      recommendations.push('⚠️ Very new token - higher risk of abandonment');
    }

    if (factors.volume > 60) {
      recommendations.push('⚠️ Low trading volume - potential liquidity issues');
    }

    if (score > 75) {
      recommendations.push('🚨 EXTREME RISK - Consider avoiding this token');
    } else if (score > 50) {
      recommendations.push('⚠️ HIGH RISK - Only invest what you can afford to lose');
    } else if (score > 25) {
      recommendations.push('⚡ MEDIUM RISK - Monitor closely');
    } else {
      recommendations.push('✅ LOW RISK - Relatively safe for trading');
    }

    return recommendations;
  }

  /**
   * Get historical rug scores for a token
   */
  async getHistoricalRugScores(tokenMint: string, days: number = 7): Promise<any[]> {
    // This would fetch historical rug score data
    // For now, return mock data
    return [];
  }

  /**
   * Compare rug scores across multiple tokens
   */
  async compareRugScores(tokenMints: string[]): Promise<{ mint: string; score: number; riskLevel: string }[]> {
    const results = await Promise.all(
      tokenMints.map(async (mint) => {
        const result = await this.calculateRugScore(mint, { liquidity: BigInt(0), totalVolume: BigInt(0), createdAt: new Date().toISOString() });
        return {
          mint,
          score: result.score,
          riskLevel: result.riskLevel
        };
      })
    );

    return results.sort((a, b) => a.score - b.score);
  }
}
