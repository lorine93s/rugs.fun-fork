import { Router, Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { CustomError } from '../middleware/errorHandler';
import { prisma } from '../index';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();

// Get user profile
router.get('/profile', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new CustomError('Authentication required', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      _count: {
        select: {
          bets: true,
          pools: true,
          achievements: true
        }
      }
    }
  });

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  res.json({
    id: user.id,
    walletAddress: user.walletAddress,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    totalXp: user.totalXp,
    level: user.level,
    totalBets: user.totalBets,
    totalWinnings: user.totalWinnings,
    totalLosses: user.totalLosses,
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt,
    stats: {
      totalBets: user._count.bets,
      poolsCreated: user._count.pools,
      achievementsUnlocked: user._count.achievements
    }
  });
}));

// Update user profile
router.put('/profile', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new CustomError('Authentication required', 401);
  }

  const { username, email, avatar } = req.body;

  // Validate username uniqueness if provided
  if (username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        id: { not: req.user.id }
      }
    });

    if (existingUser) {
      throw new CustomError('Username already taken', 409);
    }
  }

  // Validate email uniqueness if provided
  if (email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: req.user.id }
      }
    });

    if (existingUser) {
      throw new CustomError('Email already taken', 409);
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      username,
      email,
      avatar,
      updatedAt: new Date()
    }
  });

  res.json({
    id: updatedUser.id,
    walletAddress: updatedUser.walletAddress,
    username: updatedUser.username,
    email: updatedUser.email,
    avatar: updatedUser.avatar,
    totalXp: updatedUser.totalXp,
    level: updatedUser.level,
    totalBets: updatedUser.totalBets,
    totalWinnings: updatedUser.totalWinnings,
    totalLosses: updatedUser.totalLosses,
    createdAt: updatedUser.createdAt,
    lastActiveAt: updatedUser.lastActiveAt
  });
}));

// Get user statistics
router.get('/stats', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new CustomError('Authentication required', 401);
  }

  const [
    betStats,
    poolStats,
    achievementStats,
    recentActivity
  ] = await Promise.all([
    prisma.bet.aggregate({
      where: { userId: req.user.id },
      _count: { id: true },
      _sum: { amount: true, winnings: true },
      _avg: { multiplier: true }
    }),
    prisma.pool.findMany({
      where: { creatorId: req.user.id },
      select: {
        id: true,
        tokenName: true,
        tokenSymbol: true,
        totalVolume: true,
        rugScore: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.userAchievement.findMany({
      where: { userId: req.user.id },
      include: {
        achievement: {
          select: {
            name: true,
            description: true,
            icon: true,
            xpReward: true
          }
        }
      },
      orderBy: { unlockedAt: 'desc' }
    }),
    prisma.bet.findMany({
      where: { userId: req.user.id },
      include: {
        pool: {
          select: {
            tokenName: true,
            tokenSymbol: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
  ]);

  const winRate = betStats._count.id > 0 
    ? Math.round((Number(betStats._sum.winnings || 0) / Number(betStats._sum.amount || 1)) * 100)
    : 0;

  res.json({
    betStats: {
      totalBets: betStats._count.id,
      totalVolume: Number(betStats._sum.amount || 0),
      totalWinnings: Number(betStats._sum.winnings || 0),
      averageMultiplier: betStats._avg.multiplier || 0,
      winRate
    },
    poolStats: {
      totalPools: poolStats.length,
      totalVolume: poolStats.reduce((sum, pool) => sum + Number(pool.totalVolume), 0),
      averageRugScore: poolStats.length > 0 
        ? Math.round(poolStats.reduce((sum, pool) => sum + pool.rugScore, 0) / poolStats.length)
        : 0,
      recentPools: poolStats
    },
    achievementStats: {
      totalAchievements: achievementStats.length,
      totalXpFromAchievements: achievementStats.reduce((sum, ach) => sum + ach.achievement.xpReward, 0),
      recentAchievements: achievementStats.slice(0, 5)
    },
    recentActivity: recentActivity.map(activity => ({
      type: 'bet',
      pool: activity.pool,
      amount: activity.amount,
      multiplier: activity.multiplier,
      winnings: activity.winnings,
      createdAt: activity.createdAt
    }))
  });
}));

// Get user achievements
router.get('/achievements', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new CustomError('Authentication required', 401);
  }

  const achievements = await prisma.userAchievement.findMany({
    where: { userId: req.user.id },
    include: {
      achievement: true
    },
    orderBy: { unlockedAt: 'desc' }
  });

  res.json(achievements);
}));

// Get user leaderboard position
router.get('/leaderboard', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new CustomError('Authentication required', 401);
  }

  const { type = 'top_traders', period = 'weekly' } = req.query;

  // This would integrate with the leaderboard service
  // For now, return basic position info
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      totalBets: true,
      totalWinnings: true,
      totalXp: true
    }
  });

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  // Calculate approximate rank (simplified)
  let betterUsers = 0;
  switch (type) {
    case 'top_traders':
      betterUsers = await prisma.user.count({
        where: { totalBets: { gt: user.totalBets } }
      });
      break;
    case 'top_winners':
      betterUsers = await prisma.user.count({
        where: { totalWinnings: { gt: user.totalWinnings } }
      });
      break;
    case 'top_xp':
      betterUsers = await prisma.user.count({
        where: { totalXp: { gt: user.totalXp } }
      });
      break;
  }

  res.json({
    type,
    period,
    rank: betterUsers + 1,
    user: {
      totalBets: user.totalBets,
      totalWinnings: user.totalWinnings,
      totalXp: user.totalXp
    }
  });
}));

// Update last activity
router.post('/activity', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new CustomError('Authentication required', 401);
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { lastActiveAt: new Date() }
  });

  res.json({ success: true });
}));

// Get user's pools
router.get('/pools', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new CustomError('Authentication required', 401);
  }

  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const pools = await prisma.pool.findMany({
    where: { creatorId: req.user.id },
    include: {
      _count: {
        select: {
          bets: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: Number(limit)
  });

  const total = await prisma.pool.count({
    where: { creatorId: req.user.id }
  });

  res.json({
    pools,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
}));

// Get user's bets
router.get('/bets', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new CustomError('Authentication required', 401);
  }

  const { page = 1, limit = 20, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = { userId: req.user.id };
  if (status === 'settled') {
    where.isSettled = true;
  } else if (status === 'active') {
    where.isSettled = false;
  }

  const bets = await prisma.bet.findMany({
    where,
    include: {
      pool: {
        select: {
          id: true,
          tokenName: true,
          tokenSymbol: true,
          isActive: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: Number(limit)
  });

  const total = await prisma.bet.count({ where });

  res.json({
    bets,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
}));

export default router;
