'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Zap, 
  TrendingUp, 
  Users, 
  Activity, 
  AlertTriangle,
  Clock,
  DollarSign,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Pool {
  id: string;
  tokenMint: string;
  tokenName?: string;
  tokenSymbol?: string;
  liquidity: string;
  totalVolume: string;
  totalBets: number;
  rugScore: number;
  isActive: boolean;
  createdAt: string;
  creator: {
    username?: string;
    avatar?: string;
  };
  _count: {
    bets: number;
  };
}

interface SystemStats {
  totalPools: number;
  totalBets: number;
  totalVolume: string;
  totalUsers: number;
  activePools: number;
  averageRugScore: number;
}

export default function HomePage() {
  const { connected, publicKey } = useWallet();
  const [pools, setPools] = useState<Pool[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [connection] = useState(new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'));

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [poolsResponse, statsResponse] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/tokens?limit=6`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/stats`)
      ]);

      setPools(poolsResponse.data.pools);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatSOL = (lamports: string) => {
    return (Number(lamports) / 1e9).toFixed(2);
  };

  const getRugScoreColor = (score: number) => {
    if (score >= 80) return 'text-terminal-error';
    if (score >= 60) return 'text-terminal-warning';
    if (score >= 40) return 'text-terminal-info';
    return 'text-terminal-fg';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-terminal-fg font-mono text-xl animate-pulse">
          Loading RugFork...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-terminal-bg">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-terminal-bg via-terminal-bg/50 to-terminal-bg"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-mono font-bold text-terminal-fg mb-6">
              Welcome to{' '}
              <span className="text-terminal-accent animate-glow">RugFork</span>
            </h1>
            <p className="text-xl text-terminal-fg/70 font-mono mb-8 max-w-3xl mx-auto">
              The ultimate gamified crypto trading platform on Solana. 
              Launch tokens, place sidebets, and compete in Rug Royale.
            </p>
            
            {!connected ? (
              <div className="space-y-4">
                <p className="text-terminal-warning font-mono">
                  Connect your wallet to start trading
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/launch"
                  className="bg-terminal-fg text-terminal-bg px-8 py-3 rounded-md font-mono font-semibold hover:bg-terminal-secondary transition-colors"
                >
                  Launch Token
                </Link>
                <Link
                  href="/sidebet"
                  className="border border-terminal-fg text-terminal-fg px-8 py-3 rounded-md font-mono font-semibold hover:bg-terminal-fg/10 transition-colors"
                >
                  Place Sidebet
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      {stats && (
        <section className="py-16 bg-terminal-bg/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-mono font-bold text-terminal-fg text-center mb-12">
              Platform Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-6 text-center"
              >
                <Zap className="w-8 h-8 text-terminal-accent mx-auto mb-2" />
                <div className="text-2xl font-mono font-bold text-terminal-fg">
                  {formatNumber(stats.totalPools)}
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
                  {formatNumber(stats.totalBets)}
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
                  {formatSOL(stats.totalVolume)} SOL
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
                  {formatNumber(stats.totalUsers)}
                </div>
                <div className="text-terminal-fg/70 font-mono text-sm">Active Users</div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* Recent Pools Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-mono font-bold text-terminal-fg">
              Recent Token Launches
            </h2>
            <Link
              href="/tokens"
              className="text-terminal-accent hover:text-terminal-fg font-mono transition-colors"
            >
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pools.map((pool, index) => (
              <motion.div
                key={pool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-6 hover:border-terminal-fg/40 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-mono font-bold text-terminal-fg">
                      {pool.tokenName || 'Unknown Token'}
                    </h3>
                    <p className="text-terminal-fg/70 font-mono text-sm">
                      {pool.tokenSymbol || 'UNK'}
                    </p>
                  </div>
                  <div className={`text-sm font-mono font-bold ${getRugScoreColor(pool.rugScore)}`}>
                    Rug: {pool.rugScore}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm font-mono">
                    <span className="text-terminal-fg/70">Liquidity:</span>
                    <span className="text-terminal-fg">{formatSOL(pool.liquidity)} SOL</span>
                  </div>
                  <div className="flex justify-between text-sm font-mono">
                    <span className="text-terminal-fg/70">Volume:</span>
                    <span className="text-terminal-fg">{formatSOL(pool.totalVolume)} SOL</span>
                  </div>
                  <div className="flex justify-between text-sm font-mono">
                    <span className="text-terminal-fg/70">Bets:</span>
                    <span className="text-terminal-fg">{pool._count.bets}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-xs text-terminal-fg/50 font-mono">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(pool.createdAt).toLocaleDateString()}
                  </div>
                  <Link
                    href={`/pool/${pool.id}`}
                    className="text-terminal-accent hover:text-terminal-fg font-mono text-sm transition-colors"
                  >
                    View Pool →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-terminal-bg/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-mono font-bold text-terminal-fg mb-6">
            Ready to Start Trading?
          </h2>
          <p className="text-terminal-fg/70 font-mono mb-8">
            Join thousands of traders in the ultimate crypto casino experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/launch"
              className="bg-terminal-accent text-terminal-bg px-8 py-3 rounded-md font-mono font-semibold hover:bg-terminal-accent/80 transition-colors"
            >
              Launch Your Token
            </Link>
            <Link
              href="/royale"
              className="border border-terminal-fg text-terminal-fg px-8 py-3 rounded-md font-mono font-semibold hover:bg-terminal-fg/10 transition-colors"
            >
              Join Rug Royale
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
