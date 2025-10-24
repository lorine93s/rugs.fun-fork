import { Connection, PublicKey, ParsedAccountData, AccountInfo } from '@solana/web3.js';
import { getTokenLargestAccounts, getAccountInfo } from '@solana/web3.js';
import axios from 'axios';

export class SolanaService {
  private connection: Connection;
  private heliusApiKey?: string;
  private quicknodeApiKey?: string;

  constructor(rpcUrl: string, heliusApiKey?: string, quicknodeApiKey?: string) {
    this.connection = new Connection(rpcUrl);
    this.heliusApiKey = heliusApiKey;
    this.quicknodeApiKey = quicknodeApiKey;
  }

  /**
   * Get token account information
   */
  async getTokenAccountInfo(mintAddress: string) {
    try {
      const mint = new PublicKey(mintAddress);
      const accounts = await this.connection.getTokenLargestAccounts(mint);
      
      return {
        totalSupply: accounts.value.reduce((sum, acc) => sum + acc.uiAmount, 0),
        topHolders: accounts.value.slice(0, 10).map(acc => ({
          address: acc.address.toString(),
          amount: acc.uiAmount,
          percentage: acc.uiAmount / accounts.value.reduce((sum, a) => sum + a.uiAmount, 0)
        })),
        holderCount: accounts.value.length
      };
    } catch (error) {
      console.error('Error fetching token account info:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a token
   */
  async getTokenTransactionHistory(mintAddress: string, limit: number = 100) {
    try {
      const mint = new PublicKey(mintAddress);
      
      // Get signatures for the token mint
      const signatures = await this.connection.getSignaturesForAddress(mint, { limit });
      
      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          try {
            const tx = await this.connection.getTransaction(sig.signature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0
            });
            return {
              signature: sig.signature,
              blockTime: sig.blockTime,
              slot: sig.slot,
              transaction: tx
            };
          } catch (error) {
            console.error(`Error fetching transaction ${sig.signature}:`, error);
            return null;
          }
        })
      );

      return transactions.filter(tx => tx !== null);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  /**
   * Get real-time token price using Jupiter API
   */
  async getTokenPrice(mintAddress: string): Promise<number> {
    try {
      const response = await axios.get(`https://price.jup.ag/v4/price?ids=${mintAddress}`);
      return response.data.data[mintAddress]?.price || 0;
    } catch (error) {
      console.error('Error fetching token price:', error);
      return 0;
    }
  }

  /**
   * Get token metadata
   */
  async getTokenMetadata(mintAddress: string) {
    try {
      const mint = new PublicKey(mintAddress);
      
      // Get token metadata using Metaplex
      const metadataPDA = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
          mint.toBuffer(),
        ],
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
      )[0];

      const accountInfo = await this.connection.getAccountInfo(metadataPDA);
      
      if (!accountInfo) {
        return null;
      }

      // Parse metadata (simplified - in production you'd use @metaplex-foundation/mpl-token-metadata)
      return {
        name: 'Unknown Token',
        symbol: 'UNK',
        uri: '',
        image: ''
      };
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      return null;
    }
  }

  /**
   * Monitor account changes
   */
  async monitorAccountChanges(accountAddress: string, callback: (accountInfo: AccountInfo<Buffer>) => void) {
    const account = new PublicKey(accountAddress);
    
    const subscriptionId = this.connection.onAccountChange(
      account,
      callback,
      'confirmed'
    );

    return subscriptionId;
  }

  /**
   * Get program account data
   */
  async getProgramAccounts(programId: string, filters?: any[]) {
    try {
      const program = new PublicKey(programId);
      const accounts = await this.connection.getProgramAccounts(program, {
        filters: filters || []
      });

      return accounts.map(account => ({
        pubkey: account.pubkey.toString(),
        account: account.account
      }));
    } catch (error) {
      console.error('Error fetching program accounts:', error);
      throw error;
    }
  }

  /**
   * Get recent block production
   */
  async getRecentBlockProduction() {
    try {
      const production = await this.connection.getRecentBlockProduction();
      return production;
    } catch (error) {
      console.error('Error fetching block production:', error);
      throw error;
    }
  }

  /**
   * Get cluster info
   */
  async getClusterInfo() {
    try {
      const info = await this.connection.getClusterInfo();
      return info;
    } catch (error) {
      console.error('Error fetching cluster info:', error);
      throw error;
    }
  }

  /**
   * Calculate transaction fees
   */
  async calculateTransactionFee(transaction: any): Promise<number> {
    try {
      const feeCalculator = await this.connection.getRecentBlockhash();
      return feeCalculator.feeCalculator.lamportsPerSignature;
    } catch (error) {
      console.error('Error calculating transaction fee:', error);
      return 5000; // Default fee
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountAddress: string): Promise<number> {
    try {
      const account = new PublicKey(accountAddress);
      const balance = await this.connection.getBalance(account);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error fetching account balance:', error);
      return 0;
    }
  }

  /**
   * Get multiple account balances
   */
  async getMultipleAccountBalances(accountAddresses: string[]): Promise<{ address: string; balance: number }[]> {
    try {
      const accounts = accountAddresses.map(addr => new PublicKey(addr));
      const balances = await this.connection.getMultipleAccountsInfo(accounts);
      
      return accountAddresses.map((address, index) => ({
        address,
        balance: balances[index] ? balances[index]!.lamports / 1e9 : 0
      }));
    } catch (error) {
      console.error('Error fetching multiple account balances:', error);
      return accountAddresses.map(address => ({ address, balance: 0 }));
    }
  }

  /**
   * Get slot info
   */
  async getSlotInfo() {
    try {
      const slot = await this.connection.getSlot();
      const blockHeight = await this.connection.getBlockHeight();
      
      return {
        slot,
        blockHeight,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching slot info:', error);
      throw error;
    }
  }

  /**
   * Close connection
   */
  async close() {
    // Connection doesn't have a close method, but we can clean up subscriptions
    // In a real implementation, you'd track subscription IDs and remove them
  }
}
