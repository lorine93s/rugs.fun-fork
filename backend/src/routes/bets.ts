import { Router, Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { CustomError } from '../middleware/errorHandler';
import { prisma } from '../index';

const router = Router();

// Get user bets
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, poolId, status } = req.query;

  if (!req.user) {
    throw new CustomError('Authentication required', 401);
  }

  const skip = (Number(page) - 1) * Number(limit);
  
  const where: any = {
    userId: req.user.id,
  };

  if (poolId) {
    where.poolId = poolId;
  }

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
          tokenMint: true,
          tokenName: true,
          tokenSymbol: true,
          isActive: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: Number(limit),
  });

  const total = await prisma.bet.count({ where });

  res.json({
    bets,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
}));

// Place a new bet
router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { poolId, amount, multiplier } = req.body;

  if (!req.user) {
    throw new CustomError('Authentication required', 401);
  }

  // Validate input
  if (!poolId || !amount || !multiplier) {
    throw new CustomError('Missing required fields: poolId, amount, multiplier', 400);
  }

  if (amount <= 0) {
    throw new CustomError('Amount must be greater than 0', 400);
  }

  if (multiplier < 2 || multiplier > 100) {
    throw new CustomError('Multiplier must be between 2 and 100', 400);
  }

  // Check if pool exists and is active
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
  });

  if (!pool) {
    throw new CustomError('Pool not found', 404);
  }

  if (!pool.isActive) {
    throw new CustomError('Pool is not active', 400);
  }

  // Check if user already has an active bet on this pool
  const existingBet = await prisma.bet.findFirst({
    where: {
      userId: req.user.id,
      poolId,
      isSettled: false,
    },
  });

  if (existingBet) {
    throw new CustomError('You already have an active bet on this pool', 400);
  }

  // Create bet
  const bet = await prisma.bet.create({
    data: {
      userId: req.user.id,
      poolId,
      amount: BigInt(amount),
      multiplier,
    },
    include: {
      pool: {
        select: {
          id: true,
          tokenMint: true,
          tokenName: true,
          tokenSymbol: true,
        },
      },
    },
  });

  // Update pool statistics
  await prisma.pool.update({
    where: { id: poolId },
    data: {
      totalBets: { increment: 1 },
      totalVolume: { increment: BigInt(amount) },
    },
  });

  // Update user statistics
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      totalBets: { increment: 1 },
    },
  });

  res.status(201).json(bet);
}));

// Get bet by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const bet = await prisma.bet.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
      pool: {
        select: {
          id: true,
          tokenMint: true,
          tokenName: true,
          tokenSymbol: true,
          isActive: true,
        },
      },
    },
  });

  if (!bet) {
    throw new CustomError('Bet not found', 404);
  }

  res.json(bet);
}));

// Settle a bet (admin only for now)
router.patch('/:id/settle', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { crashPoint } = req.body;

  if (!req.user) {
    throw new CustomError('Authentication required', 401);
  }

  if (!crashPoint || crashPoint <= 0) {
    throw new CustomError('Invalid crash point', 400);
  }

  const bet = await prisma.bet.findUnique({
    where: { id },
    include: {
      pool: true,
    },
  });

  if (!bet) {
    throw new CustomError('Bet not found', 404);
  }

  if (bet.isSettled) {
    throw new CustomError('Bet already settled', 400);
  }

  // Calculate winnings
  let winnings = BigInt(0);
  if (crashPoint >= bet.multiplier) {
    winnings = (bet.amount * BigInt(bet.multiplier)) / BigInt(100);
  }

  // Update bet
  const updatedBet = await prisma.bet.update({
    where: { id },
    data: {
      isSettled: true,
      winnings,
      crashPoint,
      settledAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
      pool: {
        select: {
          id: true,
          tokenMint: true,
          tokenName: true,
          tokenSymbol: true,
        },
      },
    },
  });

  // Update user statistics
  const updateData: any = {};
  if (winnings > 0) {
    updateData.totalWinnings = { increment: winnings };
  } else {
    updateData.totalLosses = { increment: bet.amount };
  }

  await prisma.user.update({
    where: { id: bet.userId },
    data: updateData,
  });

  res.json(updatedBet);
}));

// Get bet statistics for a user
router.get('/stats/user', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new CustomError('Authentication required', 401);
  }

  const stats = await prisma.bet.aggregate({
    where: { userId: req.user.id },
    _count: {
      id: true,
    },
    _sum: {
      amount: true,
      winnings: true,
    },
    _avg: {
      multiplier: true,
    },
  });

  const settledBets = await prisma.bet.count({
    where: {
      userId: req.user.id,
      isSettled: true,
    },
  });

  const winRate = settledBets > 0 
    ? (await prisma.bet.count({
        where: {
          userId: req.user.id,
          isSettled: true,
          winnings: { gt: 0 },
        },
      })) / settledBets * 100
    : 0;

  res.json({
    totalBets: stats._count.id,
    totalVolume: stats._sum.amount || BigInt(0),
    totalWinnings: stats._sum.winnings || BigInt(0),
    averageMultiplier: stats._avg.multiplier || 0,
    winRate: Math.round(winRate * 100) / 100,
    settledBets,
  });
}));

export default router;
