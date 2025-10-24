import { Router, Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { CustomError } from '../middleware/errorHandler';
import { prisma } from '../index';

const router = Router();

// Get leaderboard by type and period
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { type = 'top_traders', period = 'weekly' } = req.query;

  let leaderboard;

  switch (type) {
    case 'top_traders':
      leaderboard = await getTopTradersLeaderboard(period as string);
      break;
    case 'top_winners':
      leaderboard = await getTopWinnersLeaderboard(period as string);
      break;
    case 'top_volume':
      leaderboard = await getTopVolumeLeaderboard(period as string);
      break;
    case 'top_xp':
      leaderboard = await getTopXpLeaderboard(period as string);
      break;
    default:
      throw new CustomError('Invalid leaderboard type', 400);
  }

  res.json({
    type,
    period,
    rankings: leaderboard,
    updatedAt: new Date().toISOString()
  });
}));

// Get user's rank in leaderboard
router.get('/user/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { type = 'top_traders', period = 'weekly' } = req.query;

  let userRank;

  switch (type) {
    case 'top_traders':
      userRank = await getUserTraderRank(userId, period as string);
      break;
    case 'top_winners':
      userRank = await getUserWinnerRank(userId, period as string);
      break;
    case 'top_volume':
      userRank = await getUserVolumeRank(userId, period as string);
      break;
    case 'top_xp':
      userRank = await getUserXpRank(userId, period as string);
      break;
    default:
      throw new CustomError('Invalid leaderboard type', 400);
  }

  res.json(userRank);
}));

// Get leaderboard statistics
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = await getLeaderboardStats();
  res.json(stats);
}));

// Helper functions
async function getTopTradersLeaderboard(period: string) {
  const timeFilter = getTimeFilter(period);

  const traders = await prisma.user.findMany({
    where: {
      lastActiveAt: timeFilter
    },
    select: {
      id: true,
      username: true,
      avatar: true,
      level: true,
      totalBets: true,
      totalWinnings: true,
      totalLosses: true,
    },
    orderBy: {
      totalBets: 'desc'
    },
    take: 100
  });

  return traders.map((trader, index) => ({
    rank: index + 1,
    user: {
      id: trader.id,
      username: trader.username,
      avatar: trader.avatar,
      level: trader.level
    },
    totalBets: trader.totalBets,
    winRate: trader.totalBets > 0 
      ? Math.round((Number(trader.totalWinnings) / (Number(trader.totalWinnings) + Number(trader.totalLosses))) * 100)
      : 0,
    netProfit: Number(trader.totalWinnings) - Number(trader.totalLosses)
  }));
}

async function getTopWinnersLeaderboard(period: string) {
  const timeFilter = getTimeFilter(period);

  const winners = await prisma.user.findMany({
    where: {
      lastActiveAt: timeFilter
    },
    select: {
      id: true,
      username: true,
      avatar: true,
      level: true,
      totalWinnings: true,
      totalLosses: true,
    },
    orderBy: {
      totalWinnings: 'desc'
    },
    take: 100
  });

  return winners.map((winner, index) => ({
    rank: index + 1,
    user: {
      id: winner.id,
      username: winner.username,
      avatar: winner.avatar,
      level: winner.level
    },
    totalWinnings: Number(winner.totalWinnings),
    netProfit: Number(winner.totalWinnings) - Number(winner.totalLosses),
    winRate: Number(winner.totalWinnings) + Number(winner.totalLosses) > 0
      ? Math.round((Number(winner.totalWinnings) / (Number(winner.totalWinnings) + Number(winner.totalLosses))) * 100)
      : 0
  }));
}

async function getTopVolumeLeaderboard(period: string) {
  const timeFilter = getTimeFilter(period);

  const volumeData = await prisma.bet.groupBy({
    by: ['userId'],
    where: {
      createdAt: timeFilter
    },
    _sum: {
      amount: true
    },
    orderBy: {
      _sum: {
        amount: 'desc'
      }
    },
    take: 100
  });

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: volumeData.map(item => item.userId)
      }
    },
    select: {
      id: true,
      username: true,
      avatar: true,
      level: true
    }
  });

  const userMap = new Map(users.map(user => [user.id, user]));

  return volumeData.map((item, index) => ({
    rank: index + 1,
    user: userMap.get(item.userId) || {
      id: item.userId,
      username: 'Unknown',
      avatar: null,
      level: 1
    },
    totalVolume: Number(item._sum.amount || 0)
  }));
}

async function getTopXpLeaderboard(period: string) {
  const timeFilter = getTimeFilter(period);

  const xpLeaders = await prisma.user.findMany({
    where: {
      lastActiveAt: timeFilter
    },
    select: {
      id: true,
      username: true,
      avatar: true,
      level: true,
      totalXp: true,
    },
    orderBy: {
      totalXp: 'desc'
    },
    take: 100
  });

  return xpLeaders.map((leader, index) => ({
    rank: index + 1,
    user: {
      id: leader.id,
      username: leader.username,
      avatar: leader.avatar,
      level: leader.level
    },
    totalXp: leader.totalXp,
    level: leader.level
  }));
}

async function getUserTraderRank(userId: string, period: string) {
  const timeFilter = getTimeFilter(period);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      avatar: true,
      level: true,
      totalBets: true,
      totalWinnings: true,
      totalLosses: true,
    }
  });

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  const betterTraders = await prisma.user.count({
    where: {
      totalBets: {
        gt: user.totalBets
      },
      lastActiveAt: timeFilter
    }
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      level: user.level
    },
    rank: betterTraders + 1,
    totalBets: user.totalBets,
    winRate: user.totalBets > 0 
      ? Math.round((Number(user.totalWinnings) / (Number(user.totalWinnings) + Number(user.totalLosses))) * 100)
      : 0,
    netProfit: Number(user.totalWinnings) - Number(user.totalLosses)
  };
}

async function getUserWinnerRank(userId: string, period: string) {
  const timeFilter = getTimeFilter(period);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      avatar: true,
      level: true,
      totalWinnings: true,
      totalLosses: true,
    }
  });

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  const betterWinners = await prisma.user.count({
    where: {
      totalWinnings: {
        gt: user.totalWinnings
      },
      lastActiveAt: timeFilter
    }
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      level: user.level
    },
    rank: betterWinners + 1,
    totalWinnings: Number(user.totalWinnings),
    netProfit: Number(user.totalWinnings) - Number(user.totalLosses),
    winRate: Number(user.totalWinnings) + Number(user.totalLosses) > 0
      ? Math.round((Number(user.totalWinnings) / (Number(user.totalWinnings) + Number(user.totalLosses))) * 100)
      : 0
  };
}

async function getUserVolumeRank(userId: string, period: string) {
  const timeFilter = getTimeFilter(period);

  const userVolume = await prisma.bet.groupBy({
    by: ['userId'],
    where: {
      userId,
      createdAt: timeFilter
    },
    _sum: {
      amount: true
    }
  });

  const userVolumeAmount = userVolume[0]?._sum.amount || BigInt(0);

  const betterVolumes = await prisma.bet.groupBy({
    by: ['userId'],
    where: {
      createdAt: timeFilter,
      amount: {
        gt: userVolumeAmount
      }
    },
    _sum: {
      amount: true
    }
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      avatar: true,
      level: true
    }
  });

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      level: user.level
    },
    rank: betterVolumes.length + 1,
    totalVolume: Number(userVolumeAmount)
  };
}

async function getUserXpRank(userId: string, period: string) {
  const timeFilter = getTimeFilter(period);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      avatar: true,
      level: true,
      totalXp: true,
    }
  });

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  const betterXp = await prisma.user.count({
    where: {
      totalXp: {
        gt: user.totalXp
      },
      lastActiveAt: timeFilter
    }
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      level: user.level
    },
    rank: betterXp + 1,
    totalXp: user.totalXp,
    level: user.level
  };
}

async function getLeaderboardStats() {
  const [
    totalUsers,
    totalBets,
    totalVolume,
    topTrader,
    topWinner
  ] = await Promise.all([
    prisma.user.count(),
    prisma.bet.count(),
    prisma.bet.aggregate({
      _sum: {
        amount: true
      }
    }),
    prisma.user.findFirst({
      orderBy: {
        totalBets: 'desc'
      },
      select: {
        username: true,
        totalBets: true
      }
    }),
    prisma.user.findFirst({
      orderBy: {
        totalWinnings: 'desc'
      },
      select: {
        username: true,
        totalWinnings: true
      }
    })
  ]);

  return {
    totalUsers,
    totalBets,
    totalVolume: Number(totalVolume._sum.amount || 0),
    topTrader: {
      username: topTrader?.username || 'Unknown',
      totalBets: topTrader?.totalBets || 0
    },
    topWinner: {
      username: topWinner?.username || 'Unknown',
      totalWinnings: Number(topWinner?.totalWinnings || 0)
    }
  };
}

function getTimeFilter(period: string) {
  const now = new Date();
  
  switch (period) {
    case 'daily':
      return {
        gte: new Date(now.getTime() - 24 * 60 * 60 * 1000)
      };
    case 'weekly':
      return {
        gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      };
    case 'monthly':
      return {
        gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      };
    case 'all_time':
    default:
      return {};
  }
}

export default router;
