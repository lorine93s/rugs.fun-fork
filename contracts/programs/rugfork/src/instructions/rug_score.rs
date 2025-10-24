use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

pub fn handler(ctx: Context<CalculateRugScore>) -> Result<u8> {
    let pool = &ctx.accounts.pool;
    let mut score: u8 = 0;

    // Low liquidity = higher risk
    if pool.liquidity < 1_000_000_000 { // 1 SOL in lamports
        score += 40;
    }

    // High volume relative to liquidity = risky
    if pool.total_volume > pool.liquidity * 10 {
        score += 30;
    }

    // Many small bets = more stable
    if pool.total_bets > 100 {
        score = score.saturating_sub(20);
    }

    // Recent creation = higher risk
    let clock = Clock::get()?;
    let age_hours = (clock.unix_timestamp - pool.created_at) / 3600;
    if age_hours < 24 {
        score += 20;
    }

    // High fee percentage = higher risk
    if pool.fee_percentage > 5 {
        score += 15;
    }

    // Pool already crashed = maximum risk
    if pool.crash_point.is_some() {
        score = 100;
    }

    Ok(score.min(100))
}

#[derive(Accounts)]
pub struct CalculateRugScore<'info> {
    #[account(
        seeds = [b"pool", pool.token_mint.as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
}
