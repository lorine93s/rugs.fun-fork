'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Activity,
  DollarSign,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  PieChart
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell } from 'recharts';

interface PlatformStats {
  totalPools: number;
  totalBets: number;
  totalVolume: string;
  totalUsers: number;
  activePools: number;
  averageRugScore: number;
}

interface PoolAnalytics {
  pool: {
    id: string;
    tokenMint: string;
    tokenName: string;
    tokenSymbol: string;
    liquidity: string;
    totalVolume: string;
    totalBets: number;
    rugScore: number;
    isActive: boolean;
    createdAt: string;
  };
  analytics: {
    betStats: {
      totalBets: number;
      totalVolume: number;
      totalWinnings: number;
      averageMultiplier: number;
      winRate: number;
    };
    volumeOverTime: Array<{
      date: string;
      volume: number;
    }>;
    uniqueUsers: number;
    topUsers: Array<{
      userId: string;
      betCount: number;
    }>;
  };
}

interface MarketAnalytics {
  period: string;
  poolsCreated: number;
  totalVolume: number;
  averageRugScore: number;
  topPerformingPools: Array<{
    id: string;
    tokenName: string;
    tokenSymbol: string;
    totalVolume: string;
    rugScore: number;
    totalBets: number;
  }>;
  riskDistribution: Array<{
    rugScore: number;
    count: number;
  }>;
}

export default function AnalyticsPage() {
  const { connected } = useWallet();
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [marketAnalytics, setMarketAnalytics] = useState<MarketAnalytics | null>(null);
  const [selectedPool, setSelectedPool] = useState<string>('');
  const [poolAnalytics, setPoolAnalytics] = useState<PoolAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [timeRange]);

  useEffect(() => {
    if (selectedPool) {
      fetchPoolAnalytics(selectedPool);
    }
  }, [selectedPool, timeRange]);

  const fetchData = async () => {
    try {
      const [statsResponse, marketResponse] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/stats`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/market?period=${timeRange}`)
      ]);

      setPlatformStats(statsResponse.data);
      setMarketAnalytics(marketResponse.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPoolAnalytics = async (poolId: string) => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/pool/${poolId}?period=${timeRange}`);
      setPoolAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching pool analytics:', error);
    }
  };

  const formatSOL = (lamports: string) => {
    return (Number(lamports) / 1e9).toFixed(2);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getRugScoreColor = (score: number) => {
    if (score >= 80) return '#ff0000'; // Red
    if (score >= 60) return '#ffff00'; // Yellow
    if (score >= 40) return '#00ffff'; // Cyan
    return '#00ff00'; // Green
  };

  const COLORS = ['#00ff00', '#00ffff', '#ffff00', '#ff0000'];

  if (loading) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-terminal-fg font-mono text-xl animate-pulse">
          Loading Analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-terminal-bg py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-mono font-bold text-terminal-fg mb-4">
            <BarChart3 className="w-10 h-10 inline mr-3 text-terminal-accent" />
            Analytics Dashboard
          </h1>
          <p className="text-terminal-fg/70 font-mono">
            Real-time insights into platform performance and trading patterns
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex justify-center mb-8">
          <div className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-1">
            {['1h', '24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-md font-mono text-sm transition-colors ${
                  timeRange === range
                    ? 'bg-terminal-fg text-terminal-bg'
                    : 'text-terminal-fg/70 hover:text-terminal-fg hover:bg-terminal-fg/10'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Stats */}
        {platformStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-6 text-center"
            >
              <Zap className="w-8 h-8 text-terminal-accent mx-auto mb-2" />
              <div className="text-2xl font-mono font-bold text-terminal-fg">
                {formatNumber(platformStats.totalPools)}
              </div>
              <div className="text-terminal-fg/70 font-mono text-sm">Total Pools</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-6 text-center"
            >
              <Activity className="w-8 h-8 text-terminal-fg mx-auto mb-2" />
              <div className="text-2xl font-mono font-bold text-terminal-fg">
                {formatNumber(platformStats.totalBets)}
              </div>
              <div className="text-terminal-fg/70 font-mono text-sm">Total Bets</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-6 text-center"
            >
              <DollarSign className="w-8 h-8 text-terminal-secondary mx-auto mb-2" />
              <div className="text-2xl font-mono font-bold text-terminal-fg">
                {formatSOL(platformStats.totalVolume)} SOL
              </div>
              <div className="text-terminal-fg/70 font-mono text-sm">Total Volume</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-6 text-center"
            >
              <Users className="w-8 h-8 text-terminal-info mx-auto mb-2" />
              <div className="text-2xl font-mono font-bold text-terminal-fg">
                {formatNumber(platformStats.totalUsers)}
              </div>
              <div className="text-terminal-fg/70 font-mono text-sm">Active Users</div>
            </motion.div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Market Overview */}
          {marketAnalytics && (
            <div className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-6">
              <h3 className="text-xl font-mono font-bold text-terminal-fg mb-6">
                Market Overview ({timeRange})
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-terminal-fg/70 font-mono text-sm">Pools Created</div>
                    <div className="text-terminal-fg font-mono font-bold text-lg">
                      {marketAnalytics.poolsCreated}
                    </div>
                  </div>
                  <div>
                    <div className="text-terminal-fg/70 font-mono text-sm">Total Volume</div>
                    <div className="text-terminal-fg font-mono font-bold text-lg">
                      {formatSOL(marketAnalytics.totalVolume.toString())} SOL
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-terminal-fg/70 font-mono text-sm mb-2">Risk Distribution</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPieChart>
                      <RechartsPieChart
                        data={marketAnalytics.riskDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ rugScore, count }) => `${rugScore}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {marketAnalytics.riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </RechartsPieChart>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Top Performing Pools */}
          {marketAnalytics && (
            <div className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-6">
              <h3 className="text-xl font-mono font-bold text-terminal-fg mb-6">
                Top Performing Pools
              </h3>
              
              <div className="space-y-3">
                {marketAnalytics.topPerformingPools.slice(0, 5).map((pool, index) => (
                  <div
                    key={pool.id}
                    className="flex items-center justify-between p-3 bg-terminal-bg/30 rounded-md hover:bg-terminal-fg/10 transition-colors cursor-pointer"
                    onClick={() => setSelectedPool(pool.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-terminal-fg font-mono font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="text-terminal-fg font-mono font-semibold">
                          {pool.tokenName || 'Unknown'}
                        </div>
                        <div className="text-terminal-fg/70 font-mono text-sm">
                          {pool.tokenSymbol || 'UNK'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-terminal-fg font-mono font-bold">
                        {formatSOL(pool.totalVolume)} SOL
                      </div>
                      <div className="text-terminal-fg/70 font-mono text-sm">
                        Rug: {pool.rugScore}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pool Analytics */}
        {poolAnalytics && (
          <div className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-6 mb-12">
            <h3 className="text-xl font-mono font-bold text-terminal-fg mb-6">
              Pool Analytics: {poolAnalytics.pool.tokenName || 'Unknown Token'}
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-mono font-semibold text-terminal-fg mb-4">
                  Bet Statistics
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-terminal-fg/70 font-mono">Total Bets:</span>
                    <span className="text-terminal-fg font-mono font-bold">
                      {poolAnalytics.analytics.betStats.totalBets}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-fg/70 font-mono">Total Volume:</span>
                    <span className="text-terminal-fg font-mono font-bold">
                      {formatSOL(poolAnalytics.analytics.betStats.totalVolume.toString())} SOL
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-fg/70 font-mono">Win Rate:</span>
                    <span className="text-terminal-fg font-mono font-bold">
                      {poolAnalytics.analytics.betStats.winRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-fg/70 font-mono">Avg Multiplier:</span>
                    <span className="text-terminal-fg font-mono font-bold">
                      {poolAnalytics.analytics.betStats.averageMultiplier}x
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-mono font-semibold text-terminal-fg mb-4">
                  Volume Over Time
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={poolAnalytics.analytics.volumeOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#00ff00" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#00ff00"
                      fontSize={12}
                      fontFamily="JetBrains Mono"
                    />
                    <YAxis 
                      stroke="#00ff00"
                      fontSize={12}
                      fontFamily="JetBrains Mono"
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #00ff00',
                        color: '#00ff00',
                        fontFamily: 'JetBrains Mono'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="volume" 
                      stroke="#00ff00" 
                      strokeWidth={2}
                      dot={{ fill: '#00ff00', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Risk Assessment */}
        <div className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-6">
          <h3 className="text-xl font-mono font-bold text-terminal-fg mb-6">
            Risk Assessment Guide
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-4 h-4 bg-terminal-fg rounded-full mx-auto mb-2"></div>
              <div className="text-terminal-fg font-mono font-semibold">0-25</div>
              <div className="text-terminal-fg/70 font-mono text-sm">Low Risk</div>
            </div>
            <div className="text-center">
              <div className="w-4 h-4 bg-terminal-info rounded-full mx-auto mb-2"></div>
              <div className="text-terminal-fg font-mono font-semibold">26-50</div>
              <div className="text-terminal-fg/70 font-mono text-sm">Medium Risk</div>
            </div>
            <div className="text-center">
              <div className="w-4 h-4 bg-terminal-warning rounded-full mx-auto mb-2"></div>
              <div className="text-terminal-fg font-mono font-semibold">51-75</div>
              <div className="text-terminal-fg/70 font-mono text-sm">High Risk</div>
            </div>
            <div className="text-center">
              <div className="w-4 h-4 bg-terminal-error rounded-full mx-auto mb-2"></div>
              <div className="text-terminal-fg font-mono font-semibold">76-100</div>
              <div className="text-terminal-fg/70 font-mono text-sm">Extreme Risk</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
