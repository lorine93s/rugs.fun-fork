'use client';

import { ReactNode } from 'react';
import AppProviders from '../components/providers/AppProviders';
import Navbar from '../components/layout/Navbar';

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <title>RugFork - Gamified Crypto Trading Platform</title>
        <meta name="description" content="A gamified crypto trading platform on Solana with token launches, sidebets, and tournaments." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-terminal-bg text-terminal-fg font-mono antialiased">
        <AppProviders>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <footer className="bg-terminal-bg/50 border-t border-terminal-fg/20 py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                  <p className="text-terminal-fg/70 font-mono text-sm">
                    © 2024 RugFork. Built with ❤️ for the Solana ecosystem.
                  </p>
                  <p className="text-terminal-fg/50 font-mono text-xs mt-2">
                    ⚠️ High-risk trading platform. Only trade what you can afford to lose.
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
