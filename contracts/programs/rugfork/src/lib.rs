use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::*;
use state::*;
use errors::*;

declare_id!("RugForkProgram111111111111111111111111111111");

#[program]
pub mod rugfork {
    use super::*;

    /// Initialize a new token pool for trading
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        token_supply: u64,
        initial_liquidity: u64,
    ) -> Result<()> {
        instructions::initialize_pool::handler(ctx, token_supply, initial_liquidity)
    }

    /// Place a sidebet on token price movement
    pub fn place_sidebet(
        ctx: Context<PlaceSidebet>,
        amount: u64,
        multiplier: u64,
    ) -> Result<()> {
        instructions::place_sidebet::handler(ctx, amount, multiplier)
    }

    /// Settle a sidebet and distribute winnings
    pub fn settle_sidebet(
        ctx: Context<SettleSidebet>,
        crash_point: u64,
    ) -> Result<()> {
        instructions::settle_sidebet::handler(ctx, crash_point)
    }

    /// Calculate rug score for a token
    pub fn calculate_rug_score(ctx: Context<CalculateRugScore>) -> Result<u8> {
        instructions::rug_score::handler(ctx)
    }

    /// Update user XP and level
    pub fn update_user_xp(
        ctx: Context<UpdateUserXp>,
        xp_gained: u64,
    ) -> Result<()> {
        instructions::user_profile::handler(ctx, xp_gained)
    }

    /// Create Rug Royale tournament
    pub fn create_rug_royale(
        ctx: Context<CreateRugRoyale>,
        prize_pool: u64,
        duration: i64,
    ) -> Result<()> {
        instructions::rug_royale::create_tournament(ctx, prize_pool, duration)
    }

    /// Join Rug Royale tournament
    pub fn join_rug_royale(ctx: Context<JoinRugRoyale>) -> Result<()> {
        instructions::rug_royale::join_tournament(ctx)
    }

    /// Distribute Rug Royale prizes
    pub fn distribute_rug_royale_prizes(ctx: Context<DistributeRugRoyalePrizes>) -> Result<()> {
        instructions::rug_royale::distribute_prizes(ctx)
    }

    /// Launch token with enhanced parameters
    pub fn launch_token(
        ctx: Context<LaunchToken>,
        supply: u64,
        liquidity: u64,
        fee_percentage: u8,
    ) -> Result<()> {
        instructions::launch_token::handler(ctx, supply, liquidity, fee_percentage)
    }

    /// Crash a pool (admin function)
    pub fn crash_pool(ctx: Context<CrashPool>, crash_point: u64) -> Result<()> {
        instructions::crash_pool::handler(ctx, crash_point)
    }

    /// Update pool parameters
    pub fn update_pool_params(
        ctx: Context<UpdatePoolParams>,
        new_fee_percentage: Option<u8>,
        new_is_active: Option<bool>,
    ) -> Result<()> {
        instructions::update_pool_params::handler(ctx, new_fee_percentage, new_is_active)
    }
}