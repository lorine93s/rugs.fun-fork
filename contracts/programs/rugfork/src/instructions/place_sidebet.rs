use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

pub fn handler(
    ctx: Context<PlaceSidebet>,
    amount: u64,
    multiplier: u64,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let bet = &mut ctx.accounts.bet;
    let clock = Clock::get()?;

    // Validate inputs
    require!(pool.is_active, RugForkError::PoolInactive);
    require!(amount > 0, RugForkError::InvalidAmount);
    require!(multiplier >= 2 && multiplier <= 100, RugForkError::InvalidMultiplier);
    require!(pool.crash_point.is_none(), RugForkError::PoolAlreadyCrashed);

    // Check if user already has an active bet on this pool
    // This would require additional logic to check existing bets
    // For now, we'll allow multiple bets per user

    // Initialize bet account
    bet.user = ctx.accounts.user.key();
    bet.pool = pool.key();
    bet.amount = amount;
    bet.multiplier = multiplier;
    bet.timestamp = clock.unix_timestamp;
    bet.is_settled = false;
    bet.winnings = 0;
    bet.crash_point = None;
    bet.settled_at = None;

    // Transfer SOL to pool
    let cpi_accounts = anchor_lang::system_program::Transfer {
        from: ctx.accounts.user.to_account_info(),
        to: ctx.accounts.pool.to_account_info(),
    };
    let cpi_program = ctx.accounts.system_program.to_account_info();
    anchor_lang::system_program::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

    // Update pool stats
    pool.total_bets += 1;
    pool.total_volume += amount;

    emit!(SidebetPlaced {
        bet: bet.key(),
        user: bet.user,
        pool: bet.pool,
        amount: bet.amount,
        multiplier: bet.multiplier,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct PlaceSidebet<'info> {
    #[account(
        mut,
        seeds = [b"pool", pool.token_mint.as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(
        init,
        payer = user,
        space = 8 + Bet::INIT_SPACE,
        seeds = [b"bet", pool.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub bet: Account<'info, Bet>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[event]
pub struct SidebetPlaced {
    pub bet: Pubkey,
    pub user: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
    pub multiplier: u64,
}
