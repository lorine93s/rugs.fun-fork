'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  Hash,
  Clock,
  Zap
} from 'lucide-react';
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
}

interface BetFormData {
  poolId: string;
  amount: string;
  multiplier: number;
}

export default function SidebetPage() {
  const { connected, publicKey } = useWallet();
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [betForm, setBetForm] = useState<BetFormData>({
    poolId: '',
    amount: '0.1',
    multiplier: 2,
  });
  const [loading, setLoading] = useState(false);
  const [connection] = useState(new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'));

  useEffect(() => {
    fetchPools();
  }, []);

  const fetchPools = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/tokens?limit=20`);
      setPools(response.data.pools);
    } catch (error) {
      console.error('Error fetching pools:', error);
      toast.error('Failed to fetch pools');
    }
  };

  const handlePoolSelect = (pool: Pool) => {
    setSelectedPool(pool);
    setBetForm(prev => ({ ...prev, poolId: pool.id }));
  };

  const handleBetSubmit = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!selectedPool) {
      toast.error('Please select a pool');
      return;
    }

    if (Number(betForm.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/bets`, {
        poolId: betForm.poolId,
        amount: Number(betForm.amount) * 1e9, // Convert to lamports
        multiplier: betForm.multiplier,
      });

      toast.success('Bet placed successfully!');
      setBetForm({ poolId: '', amount: '0.1', multiplier: 2 });
      setSelectedPool(null);
    } catch (error: any) {
      console.error('Error placing bet:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to place bet');
    } finally {
      setLoading(false);
    }
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

  const multipliers = [2, 3, 5, 10, 20, 50, 100];

  if (!connected) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-terminal-error mx-auto mb-4" />
          <h2 className="text-2xl font-mono font-bold text-terminal-fg mb-4">
            Wallet Not Connected
          </h2>
          <p className="text-terminal-fg/70 font-mono mb-6">
            Please connect your wallet to place sidebets
          </p>
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
            Place Sidebets
          </h1>
          <p className="text-terminal-fg/70 font-mono">
            Bet on token price movements and win big multipliers
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pool Selection */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-mono font-bold text-terminal-fg mb-6">
              Select a Pool
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {pools.map((pool) => (
                <motion.div
                  key={pool.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedPool?.id === pool.id
                      ? 'border-terminal-fg bg-terminal-fg/10'
                      : 'border-terminal-fg/20 hover:border-terminal-fg/40'
                  }`}
                  onClick={() => handlePoolSelect(pool)}
                >
                  <div className="flex justify-between items-start mb-2">
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

                  <div className="grid grid-cols-3 gap-4 text-sm font-mono">
                    <div>
                      <span className="text-terminal-fg/70">Liquidity:</span>
                      <div className="text-terminal-fg">{formatSOL(pool.liquidity)} SOL</div>
                    </div>
                    <div>
                      <span className="text-terminal-fg/70">Volume:</span>
                      <div className="text-terminal-fg">{formatSOL(pool.totalVolume)} SOL</div>
                    </div>
                    <div>
                      <span className="text-terminal-fg/70">Bets:</span>
                      <div className="text-terminal-fg">{pool.totalBets}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-terminal-fg/50 font-mono">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(pool.createdAt).toLocaleDateString()}
                    </div>
                    <div className={`text-xs font-mono px-2 py-1 rounded ${
                      pool.isActive ? 'bg-terminal-fg/10 text-terminal-fg' : 'bg-terminal-error/10 text-terminal-error'
                    }`}>
                      {pool.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bet Form */}
          <div>
            <h2 className="text-2xl font-mono font-bold text-terminal-fg mb-6">
              Place Your Bet
            </h2>

            {selectedPool ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-6 space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-lg font-mono font-bold text-terminal-fg">
                    {selectedPool.tokenName || 'Unknown Token'}
                  </h3>
                  <p className="text-terminal-fg/70 font-mono text-sm">
                    {selectedPool.tokenSymbol || 'UNK'}
                  </p>
                </div>

                <div>
                  <label className="block text-terminal-fg font-mono font-semibold mb-2">
                    Bet Amount (SOL)
                  </label>
                  <input
                    type="number"
                    value={betForm.amount}
                    onChange={(e) => setBetForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.1"
                    step="0.1"
                    min="0.01"
                    className="w-full px-4 py-3 bg-terminal-bg border border-terminal-fg/30 rounded-md text-terminal-fg font-mono focus:border-terminal-fg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-terminal-fg font-mono font-semibold mb-2">
                    Multiplier
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {multipliers.map((mult) => (
                      <button
                        key={mult}
                        onClick={() => setBetForm(prev => ({ ...prev, multiplier: mult }))}
                        className={`px-3 py-2 rounded-md font-mono text-sm transition-colors ${
                          betForm.multiplier === mult
                            ? 'bg-terminal-fg text-terminal-bg'
                            : 'bg-terminal-bg border border-terminal-fg/30 text-terminal-fg hover:bg-terminal-fg/10'
                        }`}
                      >
                        {mult}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-terminal-bg/30 border border-terminal-fg/20 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm font-mono">
                    <span className="text-terminal-fg/70">Bet Amount:</span>
                    <span className="text-terminal-fg">{betForm.amount} SOL</span>
                  </div>
                  <div className="flex justify-between text-sm font-mono">
                    <span className="text-terminal-fg/70">Multiplier:</span>
                    <span className="text-terminal-fg">{betForm.multiplier}x</span>
                  </div>
                  <div className="flex justify-between text-sm font-mono font-bold">
                    <span className="text-terminal-fg/70">Potential Win:</span>
                    <span className="text-terminal-accent">
                      {(Number(betForm.amount) * betForm.multiplier).toFixed(2)} SOL
                    </span>
                  </div>
                </div>

                <div className="bg-terminal-warning/10 border border-terminal-warning/30 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-terminal-warning mt-0.5" />
                    <div>
                      <h3 className="text-terminal-warning font-mono font-semibold mb-1">
                        Risk Warning
                      </h3>
                      <p className="text-terminal-fg/70 font-mono text-sm">
                        Sidebets are high-risk. You could lose your entire bet amount.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleBetSubmit}
                  disabled={loading}
                  className="w-full bg-terminal-accent text-terminal-bg py-3 rounded-md font-mono font-semibold hover:bg-terminal-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-terminal-bg"></div>
                      <span>Placing Bet...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Place Bet</span>
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <div className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-6 text-center">
                <Activity className="w-12 h-12 text-terminal-fg/30 mx-auto mb-4" />
                <p className="text-terminal-fg/70 font-mono">
                  Select a pool to place your bet
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
