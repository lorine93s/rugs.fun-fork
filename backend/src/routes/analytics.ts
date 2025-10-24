import { Router, Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { CustomError } from '../middleware/errorHandler';
import { prisma } from '../index';
import { SolanaService } from '../services/solana';
import { RugScoreService } from '../services/rugscore';

const router = Router();

// Initialize services
const solanaService = new SolanaService(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  process.env.HELIUS_API_KEY,
  process.env.QUICKNODE_API_KEY
);
const rugScoreService = new RugScoreService(solanaService);

// Get platform statistics
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const [
    totalPools,
    totalBets,
    totalVolume,
    totalUsers,
    activePools,
    averageRugScore
  ] = await Promise.all([
    prisma.pool.count(),
    prisma.bet.count(),
    prisma.bet.aggregate({
      _sum: {
        amount: true
      }
    }),
    prisma.user.count(),
    prisma.pool.count({
      where: { isActive: true }
    }),
    prisma.pool.aggregate({
      _avg: {
        rugScore: true
      }
    })
  ]);

  res.json({
    totalPools,
    totalBets,
    totalVolume: Number(totalVolume._sum.amount || 0),
    totalUsers,
    activePools,
    averageRugScore: Math.round(averageRugScore._avg.rugScore || 0)
  });
}));

// Get pool analytics
router.get('/pool/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { period = '24h' } = req.query;

  const pool = await prisma.pool.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          avatar: true,
          level: true
        }
      },
      bets: {
        where: getTimeFilter(period as string),
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!pool) {
    throw new CustomError('Pool not found', 404);
  }

  // Calculate analytics
  const analytics = await calculatePoolAnalytics(pool, period as string);

  res.json({
    pool: {
      id: pool.id,
      tokenMint: pool.tokenMint,
      tokenName: pool.tokenName,
      tokenSymbol: pool.tokenSymbol,
      liquidity: pool.liquidity,
      totalVolume: pool.totalVolume,
      totalBets: pool.totalBets,
      rugScore: pool.rugScore,
      isActive: pool.isActive,
      createdAt: pool.createdAt,
      creator: pool.creator
    },
    analytics,
    recentBets: pool.bets.slice(0, 20)
  });
}));

// Get user analytics
router.get('/user/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { period = 'all_time' } = req.query;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      bets: {
        where: getTimeFilter(period as string),
        include: {
          pool: {
            select: {
              id: true,
              tokenName: true,
              tokenSymbol: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      pools: {
        where: getTimeFilter(period as string),
        select: {
          id: true,
          tokenName: true,
          tokenSymbol: true,
          liquidity: true,
          totalVolume: true,
          rugScore: true,
          createdAt: true
        }
      }
    }
  });

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  const analytics = calculateUserAnalytics(user, period as string);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      level: user.level,
      totalXp: user.totalXp,
      totalBets: user.totalBets,
      totalWinnings: user.totalWinnings,
      totalLosses: user.totalLosses,
      lastActiveAt: user.lastActiveAt
    },
    analytics,
    recentBets: user.bets.slice(0, 20),
    createdPools: user.pools.slice(0, 10)
  });
}));

// Get market analytics
router.get('/market', asyncHandler(async (req: Request, res: Response) => {
  const { period = '24h' } = req.query;
  const timeFilter = getTimeFilter(period as string);

  const [
    poolsCreated,
    totalVolume,
    averageRugScore,
    topPerformingPools,
    riskDistribution
  ] = await Promise.all([
    prisma.pool.count({
      where: {
        createdAt: timeFilter
      }
    }),
    prisma.bet.aggregate({
      where: {
        createdAt: timeFilter
      },
      _sum: {
        amount: true
      }
    }),
    prisma.pool.aggregate({
      where: {
        createdAt: timeFilter
      },
      _avg: {
        rugScore: true
      }
    }),
    prisma.pool.findMany({
      where: {
        createdAt: timeFilter,
        isActive: true
      },
      orderBy: {
        totalVolume: 'desc'
      },
      take: 10,
      select: {
        id: true,
        tokenName: true,
        tokenSymbol: true,
        totalVolume: true,
        rugScore: true,
        totalBets: true
      }
    }),
    prisma.pool.groupBy({
      by: ['rugScore'],
      where: {
        createdAt: timeFilter
      },
      _count: {
        id: true
      }
    })
  ]);

  res.json({
    period,
    poolsCreated,
    totalVolume: Number(totalVolume._sum.amount || 0),
    averageRugScore: Math.round(averageRugScore._avg.rugScore || 0),
    topPerformingPools,
    riskDistribution: riskDistribution.map(item => ({
      rugScore: item.rugScore,
      count: item._count.id
    }))
  });
}));

// Get rug score analysis
router.get('/rugscore/:tokenMint', asyncHandler(async (req: Request, res: Response) => {
  const { tokenMint } = req.params;

  const pool = await prisma.pool.findUnique({
    where: { tokenMint }
  });

  if (!pool) {
    throw new CustomError('Pool not found', 404);
  }

  const rugScoreAnalysis = await rugScoreService.calculateRugScore(tokenMint, pool);

  res.json(rugScoreAnalysis);
}));

// Get trading patterns
router.get('/patterns', asyncHandler(async (req: Request, res: Response) => {
  const { period = '7d' } = req.query;
  const timeFilter = getTimeFilter(period as string);

  const patterns = await analyzeTradingPatterns(timeFilter);

  res.json(patterns);
}));

// Helper functions
async function calculatePoolAnalytics(pool: any, period: string) {
  const timeFilter = getTimeFilter(period);

  const [
    betStats,
    volumeStats,
    userStats
  ] = await Promise.all([
    prisma.bet.aggregate({
      where: {
        poolId: pool.id,
        createdAt: timeFilter
      },
      _count: {
        id: true
      },
      _sum: {
        amount: true,
        winnings: true
      },
      _avg: {
        multiplier: true
      }
    }),
    prisma.bet.groupBy({
      by: ['createdAt'],
      where: {
        poolId: pool.id,
        createdAt: timeFilter
      },
      _sum: {
        amount: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    }),
    prisma.bet.groupBy({
      by: ['userId'],
      where: {
        poolId: pool.id,
        createdAt: timeFilter
      },
      _count: {
        id: true
      }
    })
  ]);

  const winRate = betStats._count.id > 0 
    ? Math.round((betStats._sum.winnings || 0) / (betStats._sum.amount || 1) * 100)
    : 0;

  return {
    betStats: {
      totalBets: betStats._count.id,
      totalVolume: Number(betStats._sum.amount || 0),
      totalWinnings: Number(betStats._sum.winnings || 0),
      averageMultiplier: betStats._avg.multiplier || 0,
      winRate
    },
    volumeOverTime: volumeStats.map(item => ({
      date: item.createdAt,
      volume: Number(item._sum.amount || 0)
    })),
    uniqueUsers: userStats.length,
    topUsers: userStats
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 10)
      .map(item => ({
        userId: item.userId,
        betCount: item._count.id
      }))
  };
}

function calculateUserAnalytics(user: any, period: string) {
  const totalBets = user.bets.length;
  const totalWinnings = user.bets.reduce((sum: number, bet: any) => sum + Number(bet.winnings), 0);
  const totalLosses = user.bets.reduce((sum: number, bet: any) => sum + Number(bet.amount), 0) - totalWinnings;
  const winRate = totalBets > 0 ? Math.round((totalWinnings / (totalWinnings + totalLosses)) * 100) : 0;
  const averageMultiplier = totalBets > 0 
    ? user.bets.reduce((sum: number, bet: any) => sum + bet.multiplier, 0) / totalBets
    : 0;

  return {
    totalBets,
    totalWinnings,
    totalLosses,
    netProfit: totalWinnings - totalLosses,
    winRate,
    averageMultiplier,
    poolsCreated: user.pools.length,
    favoriteMultiplier: getMostUsedMultiplier(user.bets),
    riskTolerance: calculateRiskTolerance(user.bets)
  };
}

function getMostUsedMultiplier(bets: any[]): number {
  const multiplierCounts = bets.reduce((acc: any, bet: any) => {
    acc[bet.multiplier] = (acc[bet.multiplier] || 0) + 1;
    return acc;
  }, {});

  return Object.keys(multiplierCounts).reduce((a, b) => 
    multiplierCounts[a] > multiplierCounts[b] ? a : b
  );
}

function calculateRiskTolerance(bets: any[]): 'LOW' | 'MEDIUM' | 'HIGH' {
  const averageMultiplier = bets.reduce((sum, bet) => sum + bet.multiplier, 0) / bets.length;
  
  if (averageMultiplier <= 3) return 'LOW';
  if (averageMultiplier <= 10) return 'MEDIUM';
  return 'HIGH';
}

async function analyzeTradingPatterns(timeFilter: any) {
  const [
    hourlyPatterns,
    dailyPatterns,
    multiplierDistribution,
    poolPopularity
  ] = await Promise.all([
    prisma.bet.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: timeFilter
      },
      _count: {
        id: true
      },
      _sum: {
        amount: true
      }
    }),
    prisma.bet.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: timeFilter
      },
      _count: {
        id: true
      },
      _sum: {
        amount: true
      }
    }),
    prisma.bet.groupBy({
      by: ['multiplier'],
      where: {
        createdAt: timeFilter
      },
      _count: {
        id: true
      }
    }),
    prisma.bet.groupBy({
      by: ['poolId'],
      where: {
        createdAt: timeFilter
      },
      _count: {
        id: true
      },
      _sum: {
        amount: true
      }
    })
  ]);

  return {
    hourlyPatterns: hourlyPatterns.map(item => ({
      hour: new Date(item.createdAt).getHours(),
      betCount: item._count.id,
      volume: Number(item._sum.amount || 0)
    })),
    dailyPatterns: dailyPatterns.map(item => ({
      day: new Date(item.createdAt).getDay(),
      betCount: item._count.id,
      volume: Number(item._sum.amount || 0)
    })),
    multiplierDistribution: multiplierDistribution.map(item => ({
      multiplier: item.multiplier,
      count: item._count.id
    })),
    poolPopularity: poolPopularity.map(item => ({
      poolId: item.poolId,
      betCount: item._count.id,
      volume: Number(item._sum.amount || 0)
    }))
  };
}

function getTimeFilter(period: string) {
  const now = new Date();
  
  switch (period) {
    case '1h':
      return {
        gte: new Date(now.getTime() - 60 * 60 * 1000)
      };
    case '24h':
      return {
        gte: new Date(now.getTime() - 24 * 60 * 60 * 1000)
      };
    case '7d':
      return {
        gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      };
    case '30d':
      return {
        gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      };
    case 'all_time':
    default:
      return {};
  }
}

export default router;
