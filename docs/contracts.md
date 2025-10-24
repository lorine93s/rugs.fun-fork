# RugFork Smart Contracts Documentation

## Overview

RugFork smart contracts are built using the Anchor framework and deployed on Solana. The contracts handle token launches, sidebets, rug scoring, and user profiles.

## Program ID

- Devnet: `RugForkProgram111111111111111111111111111111`
- Mainnet: `[To be deployed]`

## Account Structures

### Pool Account

Stores information about a token pool.

```rust
pub struct Pool {
    pub token_mint: Pubkey,        // Token mint address
    pub liquidity: u64,           // SOL liquidity in lamports
    pub creator: Pubkey,          // Pool creator
    pub created_at: i64,          // Creation timestamp
    pub is_active: bool,          // Pool status
    pub total_bets: u64,          // Total number of bets
    pub total_volume: u64,        // Total volume in lamports
}
```

**Account Size:** 8 + 32 + 8 + 32 + 8 + 1 + 8 + 8 = 105 bytes

### Bet Account

Stores information about a sidebet.

```rust
pub struct Bet {
    pub user: Pubkey,             // User who placed the bet
    pub pool: Pubkey,             // Pool the bet is on
    pub amount: u64,              // Bet amount in lamports
    pub multiplier: u64,          // Multiplier (2-100)
    pub timestamp: i64,           // Bet timestamp
    pub is_settled: bool,         // Settlement status
    pub winnings: u64,           // Winnings in lamports
}
```

**Account Size:** 8 + 32 + 32 + 8 + 8 + 8 + 1 + 8 = 105 bytes

### User Profile Account

Stores user profile and statistics.

```rust
pub struct UserProfile {
    pub user: Pubkey,             // User wallet address
    pub total_xp: u64,           // Total XP earned
    pub level: u8,               // User level
    pub last_activity: i64,      // Last activity timestamp
}
```

**Account Size:** 8 + 32 + 8 + 1 + 8 = 57 bytes

## Instructions

### Initialize Pool

Creates a new token pool for trading.

**Instruction:** `initialize_pool`

**Parameters:**
- `token_supply: u64` - Initial token supply
- `initial_liquidity: u64` - Initial SOL liquidity in lamports

**Accounts:**
- `pool` - Pool account (init)
- `token_mint` - Token mint account
- `pool_token_account` - Pool's token account (init)
- `creator` - Pool creator (signer)
- `token_program` - Token program
- `system_program` - System program

**PDA Seeds:** `["pool", token_mint.key()]`

**Events Emitted:**
- `PoolInitialized` - Pool created event

### Place Sidebet

Places a sidebet on token price movement.

**Instruction:** `place_sidebet`

**Parameters:**
- `amount: u64` - Bet amount in lamports
- `multiplier: u64` - Multiplier (2-100)

**Accounts:**
- `pool` - Pool account (mut)
- `bet` - Bet account (init)
- `user` - User placing bet (signer)
- `system_program` - System program

**PDA Seeds:** `["bet", pool.key(), user.key()]`

**Events Emitted:**
- `SidebetPlaced` - Bet placed event

**Validation:**
- Pool must be active
- Amount must be greater than 0
- Multiplier must be between 2 and 100
- User cannot have multiple active bets on same pool

### Settle Sidebet

Settles a sidebet and distributes winnings.

**Instruction:** `settle_sidebet`

**Parameters:**
- `crash_point: u64` - Crash point (multiplier * 100)

**Accounts:**
- `pool` - Pool account (mut)
- `bet` - Bet account (mut)
- `user` - User who placed bet
- `system_program` - System program

**Events Emitted:**
- `SidebetSettled` - Bet settled event

**Logic:**
- If crash_point >= multiplier: User wins
- Winnings = amount * multiplier / 100
- Transfer winnings from pool to user

### Calculate Rug Score

Calculates risk score for a token pool.

**Instruction:** `calculate_rug_score`

**Parameters:** None

**Accounts:**
- `pool` - Pool account

**Returns:** `u8` - Rug score (0-100)

**Scoring Factors:**
- Low liquidity (< 1 SOL): +40 points
- High volume relative to liquidity: +30 points
- Many bets (>100): -20 points
- Recent creation (<24h): +20 points

### Update User XP

Updates user XP and level.

**Instruction:** `update_user_xp`

**Parameters:**
- `xp_gained: u64` - XP to add

**Accounts:**
- `user_profile` - User profile account (init if needed)
- `user` - User (signer)
- `system_program` - System program

**PDA Seeds:** `["user_profile", user.key()]`

**Events Emitted:**
- `UserXpUpdated` - XP updated event

**Logic:**
- Add XP to total
- Calculate level: level = (total_xp / 1000) + 1
- Update last activity timestamp

## Events

### PoolInitialized

```rust
pub struct PoolInitialized {
    pub pool: Pubkey,
    pub token_mint: Pubkey,
    pub creator: Pubkey,
    pub liquidity: u64,
}
```

### SidebetPlaced

```rust
pub struct SidebetPlaced {
    pub bet: Pubkey,
    pub user: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
    pub multiplier: u64,
}
```

### SidebetSettled

```rust
pub struct SidebetSettled {
    pub bet: Pubkey,
    pub user: Pubkey,
    pub winnings: u64,
    pub crash_point: u64,
}
```

### UserXpUpdated

```rust
pub struct UserXpUpdated {
    pub user: Pubkey,
    pub total_xp: u64,
    pub level: u8,
}
```

## Error Codes

### PoolInactive
Pool is not active and cannot accept bets.

### InvalidAmount
Bet amount must be greater than 0.

### InvalidMultiplier
Multiplier must be between 2 and 100.

### BetAlreadySettled
Bet has already been settled.

## Security Considerations

### Access Control
- Only pool creators can update pool status
- Only bet owners can settle their bets
- User profiles are owned by the user

### Validation
- All input parameters are validated
- PDA seeds prevent account collisions
- Amounts are checked for overflow

### Economic Security
- Pool liquidity is locked until bets are settled
- Winnings are calculated on-chain
- No central authority can manipulate results

## Deployment

### Prerequisites
- Solana CLI installed
- Anchor CLI installed
- Wallet with SOL for deployment

### Build
```bash
cd contracts
anchor build
```

### Deploy
```bash
anchor deploy --provider.cluster devnet
```

### Test
```bash
anchor test
```

## Integration

### Frontend Integration
Use `@solana/web3.js` and `@solana/spl-token` to interact with contracts:

```typescript
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

const program = new Program(idl, programId, provider);
```

### Backend Integration
Use Anchor's TypeScript client to interact with contracts:

```typescript
import { Program } from '@coral-xyz/anchor';

const program = new Program(idl, programId, provider);
```

## Monitoring

### Program Logs
Monitor program logs for events and errors:

```bash
solana logs <program_id>
```

### Account Monitoring
Track account changes using Solana RPC:

```typescript
connection.onAccountChange(accountPubkey, (accountInfo) => {
  // Handle account change
});
```

## Upgrades

### Program Upgrades
Anchor programs are upgradeable by default. To upgrade:

1. Build new program
2. Deploy to same program ID
3. Update client code

### Data Migration
For breaking changes, consider:
- Versioning account structures
- Migration instructions
- Backward compatibility

## Best Practices

### Gas Optimization
- Use minimal account space
- Batch operations when possible
- Avoid unnecessary account reads

### Error Handling
- Use descriptive error messages
- Validate all inputs
- Handle edge cases

### Testing
- Unit tests for all instructions
- Integration tests with real accounts
- Fuzz testing for edge cases

## Future Enhancements

### Planned Features
- Multi-token pools
- Advanced betting mechanics
- Cross-chain support
- NFT integration

### Scalability
- Account compression
- Parallel processing
- State optimization
