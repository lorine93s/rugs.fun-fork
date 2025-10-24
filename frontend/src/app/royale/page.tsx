'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Users, 
  Clock, 
  DollarSign,
  Zap,
  Crown,
  Medal,
  Award,
  TrendingUp,
  Calendar,
  Target
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Tournament {
  id: string;
  creator: string;
  prizePool: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  participants: string[];
  winners: Winner[];
  totalParticipants: number;
  entryFee: string;
}

interface Winner {
  user: string;
  rank: number;
  prizeAmount: string;
}

interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    avatar: string;
    level: number;
  };
  totalBets: number;
  winRate: number;
  netProfit: number;
}

export default function RoyalePage() {
  const { connected, publicKey } = useWallet();
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [tournamentsResponse, leaderboardResponse] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/leaderboard?type=top_traders&period=weekly`)
      ]);

      setActiveTournaments(tournamentsResponse.data.tournaments || []);
      setLeaderboard(leaderboardResponse.data.rankings || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch tournament data');
    } finally {
      setLoading(false);
    }
  };

  const joinTournament = async (tournamentId: string) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/${tournamentId}/join`);
      toast.success('Successfully joined tournament!');
      fetchData();
    } catch (error: any) {
      console.error('Error joining tournament:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to join tournament');
    }
  };

  const createTournament = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments`, {
        prizePool: 10, // 10 SOL
        duration: 7 * 24 * 60 * 60 // 7 days in seconds
      });
      toast.success('Tournament created successfully!');
      fetchData();
    } catch (error: any) {
      console.error('Error creating tournament:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to create tournament');
    }
  };

  const formatSOL = (lamports: string) => {
    return (Number(lamports) / 1e9).toFixed(2);
  };

  const formatTimeRemaining = (endTime: string) => {
    const now = Date.now();
    const end = new Date(endTime).getTime();
    const remaining = end - now;

    if (remaining <= 0) return 'Ended';

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-terminal-fg font-mono font-bold">#{rank}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-terminal-fg font-mono text-xl animate-pulse">
          Loading Rug Royale...
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
            <Trophy className="w-10 h-10 inline mr-3 text-terminal-accent" />
            Rug Royale
          </h1>
          <p className="text-terminal-fg/70 font-mono">
            Compete in tournaments and win SOL prizes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Tournaments */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-mono font-bold text-terminal-fg">
                Active Tournaments
              </h2>
              {connected && (
                <button
                  onClick={createTournament}
                  className="bg-terminal-accent text-terminal-bg px-4 py-2 rounded-md font-mono font-semibold hover:bg-terminal-accent/80 transition-colors flex items-center space-x-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Create Tournament</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {activeTournaments.length === 0 ? (
                <div className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-8 text-center">
                  <Trophy className="w-12 h-12 text-terminal-fg/30 mx-auto mb-4" />
                  <p className="text-terminal-fg/70 font-mono">
                    No active tournaments. Create one to get started!
                  </p>
                </div>
              ) : (
                activeTournaments.map((tournament, index) => (
                  <motion.div
                    key={tournament.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-6 hover:border-terminal-fg/40 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-mono font-bold text-terminal-fg">
                          Tournament #{tournament.id.slice(0, 8)}
                        </h3>
                        <p className="text-terminal-fg/70 font-mono text-sm">
                          Prize Pool: {formatSOL(tournament.prizePool)} SOL
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-terminal-accent font-mono font-bold">
                          {formatSOL(tournament.entryFee)} SOL
                        </div>
                        <div className="text-terminal-fg/70 font-mono text-sm">
                          Entry Fee
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm font-mono">
                      <div>
                        <span className="text-terminal-fg/70">Participants:</span>
                        <div className="text-terminal-fg">{tournament.totalParticipants}</div>
                      </div>
                      <div>
                        <span className="text-terminal-fg/70">Time Left:</span>
                        <div className="text-terminal-fg">{formatTimeRemaining(tournament.endTime)}</div>
                      </div>
                      <div>
                        <span className="text-terminal-fg/70">Status:</span>
                        <div className={`${tournament.isActive ? 'text-terminal-fg' : 'text-terminal-error'}`}>
                          {tournament.isActive ? 'Active' : 'Ended'}
                        </div>
                      </div>
                    </div>

                    {tournament.isActive && connected && (
                      <button
                        onClick={() => joinTournament(tournament.id)}
                        className="w-full bg-terminal-fg text-terminal-bg py-2 rounded-md font-mono font-semibold hover:bg-terminal-secondary transition-colors"
                      >
                        Join Tournament
                      </button>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div>
            <h2 className="text-2xl font-mono font-bold text-terminal-fg mb-6">
              Weekly Leaderboard
            </h2>

            <div className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-6">
              <div className="space-y-4">
                {leaderboard.slice(0, 10).map((entry, index) => (
                  <motion.div
                    key={entry.user.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-md ${
                      index < 3 ? 'bg-terminal-fg/10 border border-terminal-fg/20' : 'hover:bg-terminal-fg/5'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {getRankIcon(entry.rank)}
                      <div>
                        <div className="text-terminal-fg font-mono font-semibold">
                          {entry.user.username || 'Anonymous'}
                        </div>
                        <div className="text-terminal-fg/70 font-mono text-sm">
                          Level {entry.user.level}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-terminal-fg font-mono font-bold">
                        {entry.totalBets} bets
                      </div>
                      <div className="text-terminal-fg/70 font-mono text-sm">
                        {entry.winRate}% win rate
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-terminal-fg/20">
                <div className="text-center">
                  <p className="text-terminal-fg/70 font-mono text-sm mb-2">
                    Compete for SOL prizes
                  </p>
                  <div className="flex justify-center space-x-4 text-terminal-fg font-mono text-sm">
                    <div className="flex items-center space-x-1">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      <span>1st: 50%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Medal className="w-4 h-4 text-gray-400" />
                      <span>2nd: 30%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>3rd: 20%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tournament Rules */}
        <div className="mt-12 bg-terminal-bg/30 border border-terminal-fg/20 rounded-lg p-6">
          <h3 className="text-xl font-mono font-bold text-terminal-fg mb-4">
            Tournament Rules
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-terminal-fg/70 font-mono text-sm">
            <div>
              <h4 className="text-terminal-fg font-semibold mb-2">How to Win:</h4>
              <ul className="space-y-1">
                <li>• Place successful sidebets</li>
                <li>• Achieve highest net profit</li>
                <li>• Maintain consistent performance</li>
              </ul>
            </div>
            <div>
              <h4 className="text-terminal-fg font-semibold mb-2">Prize Distribution:</h4>
              <ul className="space-y-1">
                <li>• 1st place: 50% of prize pool</li>
                <li>• 2nd place: 30% of prize pool</li>
                <li>• 3rd place: 20% of prize pool</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
