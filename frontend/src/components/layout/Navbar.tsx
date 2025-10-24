'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Zap, 
  Trophy, 
  BarChart3, 
  User, 
  Menu, 
  X,
  Activity,
  TrendingUp,
  Coins
} from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Launch', href: '/launch', icon: Zap },
  { name: 'Sidebet', href: '/sidebet', icon: Activity },
  { name: 'Royale', href: '/royale', icon: Trophy },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export default function Navbar() {
  const { connected, publicKey } = useWallet();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-terminal-bg border-b border-terminal-fg/20 sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-terminal-fg to-terminal-accent rounded-lg flex items-center justify-center">
                <Coins className="w-5 h-5 text-terminal-bg" />
              </div>
              <span className="text-terminal-fg font-mono font-bold text-xl">
                RugFork
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-terminal-fg bg-terminal-fg/10 border border-terminal-fg/20'
                      : 'text-terminal-fg/70 hover:text-terminal-fg hover:bg-terminal-fg/5'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {connected && publicKey && (
              <div className="hidden sm:flex items-center space-x-2 text-terminal-fg/70 text-sm font-mono">
                <TrendingUp className="w-4 h-4" />
                <span className="truncate max-w-32">
                  {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                </span>
              </div>
            )}
            
            <div className="wallet-adapter-button-trigger">
              <WalletMultiButton className="!bg-terminal-fg !text-terminal-bg hover:!bg-terminal-secondary !font-mono !text-sm !px-4 !py-2 !rounded-md !border-none !transition-all !duration-200 hover:!shadow-lg hover:!shadow-terminal-fg/20" />
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 rounded-md text-terminal-fg hover:bg-terminal-fg/10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-terminal-fg/20 py-4">
            <div className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive
                        ? 'text-terminal-fg bg-terminal-fg/10 border border-terminal-fg/20'
                        : 'text-terminal-fg/70 hover:text-terminal-fg hover:bg-terminal-fg/5'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
            
            {connected && publicKey && (
              <div className="mt-4 pt-4 border-t border-terminal-fg/20">
                <div className="flex items-center space-x-2 text-terminal-fg/70 text-sm font-mono px-3">
                  <TrendingUp className="w-4 h-4" />
                  <span className="truncate">
                    {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
