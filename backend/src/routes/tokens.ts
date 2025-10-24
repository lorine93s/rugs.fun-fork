import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { CustomError } from '../middleware/errorHandler';
import { prisma, solanaConnection } from '../index';
import { PublicKey } from '@solana/web3.js';

const router = Router();

// Get all active pools
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const orderBy = { [sortBy as string]: sortOrder };

  const pools = await prisma.pool.findMany({
    where: { isActive: true },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
      _count: {
        select: {
          bets: true,
        },
      },
    },
    orderBy,
    skip,
    take: Number(limit),
  });

  // Calculate additional metrics
  const poolsWithMetrics = await Promise.all(
    pools.map(async (pool) => {
      try {
        // Get token account info from Solana
        const mintPubkey = new PublicKey(pool.tokenMint);
        const tokenAccounts = await solanaConnection.getTokenLargestAccounts(mintPubkey);
        
        const totalSupply = tokenAccounts.value.reduce((sum, account) => sum + account.uiAmount, 0);
        const topHolderPercentage = tokenAccounts.value[0]?.uiAmount / totalSupply || 0;

        return {
          ...pool,
          totalSupply,
          topHolderPercentage,
          holderCount: tokenAccounts.value.length,
        };
      } catch (error) {
        console.error(`Error fetching token data for ${pool.tokenMint}:`, error);
        return {
          ...pool,
          totalSupply: 0,
          topHolderPercentage: 0,
          holderCount: 0,
        };
      }
    })
  );

  const total = await prisma.pool.count({
    where: { isActive: true },
  });

  res.json({
    pools: poolsWithMetrics,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
}));

// Get pool by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const pool = await prisma.pool.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          avatar: true,
          level: true,
        },
      },
      bets: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50, // Limit recent bets
      },
      _count: {
        select: {
          bets: true,
        },
      },
    },
  });

  if (!pool) {
    throw new CustomError('Pool not found', 404);
  }

  res.json(pool);
}));

// Create new pool
router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tokenMint, tokenName, tokenSymbol, tokenUri, initialLiquidity } = req.body;

  if (!req.user) {
    throw new CustomError('Authentication required', 401);
  }

  // Validate token mint address
  try {
    new PublicKey(tokenMint);
  } catch (error) {
    throw new CustomError('Invalid token mint address', 400);
  }

  // Check if pool already exists
  const existingPool = await prisma.pool.findUnique({
    where: { tokenMint },
  });

  if (existingPool) {
    throw new CustomError('Pool already exists for this token', 409);
  }

  // Create pool
  const pool = await prisma.pool.create({
    data: {
      tokenMint,
      tokenName,
      tokenSymbol,
      tokenUri,
      liquidity: BigInt(initialLiquidity || 0),
      creatorId: req.user.id,
    },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  res.status(201).json(pool);
}));

// Update pool status
router.patch('/:id/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (!req.user) {
    throw new CustomError('Authentication required', 401);
  }

  const pool = await prisma.pool.findUnique({
    where: { id },
  });

  if (!pool) {
    throw new CustomError('Pool not found', 404);
  }

  if (pool.creatorId !== req.user.id) {
    throw new CustomError('Unauthorized to update this pool', 403);
  }

  const updatedPool = await prisma.pool.update({
    where: { id },
    data: { isActive },
  });

  res.json(updatedPool);
}));

// Get pool analytics
router.get('/:id/analytics', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { period = '24h' } = req.query;

  const pool = await prisma.pool.findUnique({
    where: { id },
  });

  if (!pool) {
    throw new CustomError('Pool not found', 404);
  }

  // Calculate time range based on period
  const now = new Date();
  let startTime: Date;

  switch (period) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  // Get bet statistics for the period
  const betStats = await prisma.bet.aggregate({
    where: {
      poolId: id,
      createdAt: {
        gte: startTime,
      },
    },
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

  // Get recent bets
  const recentBets = await prisma.bet.findMany({
    where: {
      poolId: id,
      createdAt: {
        gte: startTime,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  res.json({
    period,
    betStats: {
      totalBets: betStats._count.id,
      totalVolume: betStats._sum.amount || BigInt(0),
      totalWinnings: betStats._sum.winnings || BigInt(0),
      averageMultiplier: betStats._avg.multiplier || 0,
    },
    recentBets,
  });
}));

export default router;
