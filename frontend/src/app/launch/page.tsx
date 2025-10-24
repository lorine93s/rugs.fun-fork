'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Zap, 
  AlertTriangle, 
  DollarSign, 
  Hash,
  Upload,
  CheckCircle,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LaunchFormData {
  tokenName: string;
  tokenSymbol: string;
  tokenSupply: string;
  initialLiquidity: string;
  tokenUri?: string;
}

export default function LaunchPage() {
  const { connected, publicKey } = useWallet();
  const [formData, setFormData] = useState<LaunchFormData>({
    tokenName: '',
    tokenSymbol: '',
    tokenSupply: '1000000',
    initialLiquidity: '1',
    tokenUri: '',
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [connection] = useState(new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.tokenName.trim()) {
      toast.error('Token name is required');
      return false;
    }
    if (!formData.tokenSymbol.trim()) {
      toast.error('Token symbol is required');
      return false;
    }
    if (Number(formData.tokenSupply) <= 0) {
      toast.error('Token supply must be greater than 0');
      return false;
    }
    if (Number(formData.initialLiquidity) <= 0) {
      toast.error('Initial liquidity must be greater than 0');
      return false;
    }
    return true;
  };

  const handleLaunch = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Generate a random token mint address for demo purposes
      const tokenMint = new PublicKey().toString();

      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/tokens`, {
        tokenMint,
        tokenName: formData.tokenName,
        tokenSymbol: formData.tokenSymbol,
        initialLiquidity: Number(formData.initialLiquidity) * 1e9, // Convert to lamports
      });

      toast.success('Token launched successfully!');
      setStep(3);
    } catch (error: any) {
      console.error('Error launching token:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to launch token');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Token Details', description: 'Configure your token parameters' },
    { number: 2, title: 'Review & Launch', description: 'Review and confirm your token launch' },
    { number: 3, title: 'Success', description: 'Your token has been launched!' },
  ];

  if (!connected) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-terminal-error mx-auto mb-4" />
          <h2 className="text-2xl font-mono font-bold text-terminal-fg mb-4">
            Wallet Not Connected
          </h2>
          <p className="text-terminal-fg/70 font-mono mb-6">
            Please connect your wallet to launch a token
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-terminal-bg py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-mono font-bold text-terminal-fg mb-4">
            Launch Your Token
          </h1>
          <p className="text-terminal-fg/70 font-mono">
            Create and launch your own memecoin on Solana
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {steps.map((stepItem, index) => (
              <div key={stepItem.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-mono font-bold ${
                  step >= stepItem.number
                    ? 'border-terminal-fg bg-terminal-fg text-terminal-bg'
                    : 'border-terminal-fg/30 text-terminal-fg/30'
                }`}>
                  {step > stepItem.number ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    stepItem.number
                  )}
                </div>
                <div className="ml-4">
                  <div className={`font-mono font-semibold ${
                    step >= stepItem.number ? 'text-terminal-fg' : 'text-terminal-fg/30'
                  }`}>
                    {stepItem.title}
                  </div>
                  <div className={`text-sm font-mono ${
                    step >= stepItem.number ? 'text-terminal-fg/70' : 'text-terminal-fg/30'
                  }`}>
                    {stepItem.description}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-8 ${
                    step > stepItem.number ? 'bg-terminal-fg' : 'bg-terminal-fg/30'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-terminal-bg/50 border border-terminal-fg/20 rounded-lg p-8"
        >
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-mono font-bold text-terminal-fg mb-6">
                Token Configuration
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-terminal-fg font-mono font-semibold mb-2">
                    Token Name *
                  </label>
                  <input
                    type="text"
                    name="tokenName"
                    value={formData.tokenName}
                    onChange={handleInputChange}
                    placeholder="e.g., RugCoin"
                    className="w-full px-4 py-3 bg-terminal-bg border border-terminal-fg/30 rounded-md text-terminal-fg font-mono focus:border-terminal-fg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-terminal-fg font-mono font-semibold mb-2">
                    Token Symbol *
                  </label>
                  <input
                    type="text"
                    name="tokenSymbol"
                    value={formData.tokenSymbol}
                    onChange={handleInputChange}
                    placeholder="e.g., RUG"
                    className="w-full px-4 py-3 bg-terminal-bg border border-terminal-fg/30 rounded-md text-terminal-fg font-mono focus:border-terminal-fg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-terminal-fg font-mono font-semibold mb-2">
                    Token Supply *
                  </label>
                  <input
                    type="number"
                    name="tokenSupply"
                    value={formData.tokenSupply}
                    onChange={handleInputChange}
                    placeholder="1000000"
                    className="w-full px-4 py-3 bg-terminal-bg border border-terminal-fg/30 rounded-md text-terminal-fg font-mono focus:border-terminal-fg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-terminal-fg font-mono font-semibold mb-2">
                    Initial Liquidity (SOL) *
                  </label>
                  <input
                    type="number"
                    name="initialLiquidity"
                    value={formData.initialLiquidity}
                    onChange={handleInputChange}
                    placeholder="1"
                    step="0.1"
                    className="w-full px-4 py-3 bg-terminal-bg border border-terminal-fg/30 rounded-md text-terminal-fg font-mono focus:border-terminal-fg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-terminal-fg font-mono font-semibold mb-2">
                  Token URI (Optional)
                </label>
                <input
                  type="url"
                  name="tokenUri"
                  value={formData.tokenUri}
                  onChange={handleInputChange}
                  placeholder="https://example.com/metadata.json"
                  className="w-full px-4 py-3 bg-terminal-bg border border-terminal-fg/30 rounded-md text-terminal-fg font-mono focus:border-terminal-fg focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="bg-terminal-fg text-terminal-bg px-8 py-3 rounded-md font-mono font-semibold hover:bg-terminal-secondary transition-colors"
                >
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-mono font-bold text-terminal-fg mb-6">
                Review Your Token
              </h2>

              <div className="bg-terminal-bg/30 border border-terminal-fg/20 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-terminal-fg/70 font-mono">Token Name:</span>
                  <span className="text-terminal-fg font-mono font-semibold">{formData.tokenName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-terminal-fg/70 font-mono">Token Symbol:</span>
                  <span className="text-terminal-fg font-mono font-semibold">{formData.tokenSymbol}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-terminal-fg/70 font-mono">Token Supply:</span>
                  <span className="text-terminal-fg font-mono font-semibold">{Number(formData.tokenSupply).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-terminal-fg/70 font-mono">Initial Liquidity:</span>
                  <span className="text-terminal-fg font-mono font-semibold">{formData.initialLiquidity} SOL</span>
                </div>
                {formData.tokenUri && (
                  <div className="flex justify-between items-center">
                    <span className="text-terminal-fg/70 font-mono">Token URI:</span>
                    <span className="text-terminal-fg font-mono font-semibold text-sm truncate max-w-xs">{formData.tokenUri}</span>
                  </div>
                )}
              </div>

              <div className="bg-terminal-warning/10 border border-terminal-warning/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-terminal-warning mt-0.5" />
                  <div>
                    <h3 className="text-terminal-warning font-mono font-semibold mb-2">
                      Important Notice
                    </h3>
                    <p className="text-terminal-fg/70 font-mono text-sm">
                      Launching a token requires SOL for transaction fees and initial liquidity. 
                      Make sure you have sufficient SOL in your wallet.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="border border-terminal-fg/30 text-terminal-fg px-8 py-3 rounded-md font-mono font-semibold hover:bg-terminal-fg/10 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleLaunch}
                  disabled={loading}
                  className="bg-terminal-accent text-terminal-bg px-8 py-3 rounded-md font-mono font-semibold hover:bg-terminal-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-terminal-bg"></div>
                      <span>Launching...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Launch Token</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6">
              <CheckCircle className="w-16 h-16 text-terminal-fg mx-auto" />
              <h2 className="text-2xl font-mono font-bold text-terminal-fg">
                Token Launched Successfully!
              </h2>
              <p className="text-terminal-fg/70 font-mono">
                Your token has been created and is now available for trading.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setStep(1);
                    setFormData({
                      tokenName: '',
                      tokenSymbol: '',
                      tokenSupply: '1000000',
                      initialLiquidity: '1',
                      tokenUri: '',
                    });
                  }}
                  className="bg-terminal-fg text-terminal-bg px-8 py-3 rounded-md font-mono font-semibold hover:bg-terminal-secondary transition-colors"
                >
                  Launch Another Token
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
