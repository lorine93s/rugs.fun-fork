use anchor_lang::prelude::*;

#[account]
pub struct Pool {
    pub token_mint: Pubkey,
    pub liquidity: u64,
    pub creator: Pubkey,
    pub created_at: i64,
    pub is_active: bool,
    pub total_bets: u64,
    pub total_volume: u64,
    pub fee_percentage: u8,        // Fee percentage (1-10)
    pub crash_point: Option<u64>,  // Crash point if crashed
    pub crashed_at: Option<i64>,   // When it crashed
    pub rug_score: u8,             // Current rug score
}

impl Pool {
    pub const INIT_SPACE: usize = 8 + 32 + 8 + 32 + 8 + 1 + 8 + 8 + 1 + 1 + 8 + 1 + 8 + 1;
}

#[account]
pub struct Bet {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
    pub multiplier: u64,
    pub timestamp: i64,
    pub is_settled: bool,
    pub winnings: u64,
    pub crash_point: Option<u64>,
    pub settled_at: Option<i64>,
}

impl Bet {
    pub const INIT_SPACE: usize = 8 + 32 + 32 + 8 + 8 + 8 + 1 + 8 + 1 + 8 + 1 + 8;
}

#[account]
pub struct UserProfile {
    pub user: Pubkey,
    pub total_xp: u64,
    pub level: u8,
    pub last_activity: i64,
    pub total_bets: u64,
    pub total_winnings: u64,
    pub total_losses: u64,
    pub rug_pass_level: u8,        // RugPass NFT level
    pub achievements: Vec<u8>,     // Achievement IDs
}

impl UserProfile {
    pub const INIT_SPACE: usize = 8 + 32 + 8 + 1 + 8 + 8 + 8 + 8 + 1 + 4 + 32; // Vec<u8> takes 4 bytes for length
}

#[account]
pub struct RugRoyale {
    pub id: u64,
    pub creator: Pubkey,
    pub prize_pool: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub is_active: bool,
    pub participants: Vec<Pubkey>,
    pub winners: Vec<Winner>,
    pub total_participants: u32,
    pub entry_fee: u64,
}

impl RugRoyale {
    pub const INIT_SPACE: usize = 8 + 8 + 32 + 8 + 8 + 8 + 1 + 4 + 32 + 4 + 32 + 4 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Winner {
    pub user: Pubkey,
    pub rank: u8,
    pub prize_amount: u64,
}

#[account]
pub struct RugPass {
    pub owner: Pubkey,
    pub level: u8,
    pub minted_at: i64,
    pub benefits: RugPassBenefits,
}

impl RugPass {
    pub const INIT_SPACE: usize = 8 + 32 + 1 + 8 + 32;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RugPassBenefits {
    pub fee_discount: u8,          // Fee discount percentage
    pub xp_multiplier: u8,         // XP multiplier (100 = 1x, 150 = 1.5x)
    pub priority_support: bool,    // Priority customer support
    pub exclusive_tournaments: bool, // Access to exclusive tournaments
}

#[account]
pub struct SystemConfig {
    pub admin: Pubkey,
    pub default_fee_percentage: u8,
    pub min_liquidity: u64,
    pub max_multiplier: u64,
    pub rug_score_threshold: u8,
    pub is_paused: bool,
}

impl SystemConfig {
    pub const INIT_SPACE: usize = 8 + 32 + 1 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Analytics {
    pub pool_id: Pubkey,
    pub total_volume_24h: u64,
    pub total_bets_24h: u64,
    pub unique_users_24h: u32,
    pub average_multiplier: u64,
    pub win_rate: u64,            // Percentage (0-100)
    pub last_updated: i64,
}

impl Analytics {
    pub const INIT_SPACE: usize = 8 + 32 + 8 + 8 + 4 + 8 + 8 + 8;
}
