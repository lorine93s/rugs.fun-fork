use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

pub fn handler(ctx: Context<CrashPool>, crash_point: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let clock = Clock::get()?;

    require!(pool.is_active, RugForkError::PoolInactive);
    require!(pool.crash_point.is_none(), RugForkError::PoolAlreadyCrashed);
    require!(crash_point > 0, RugForkError::InvalidCrashPoint);

    // Set crash point and mark pool as crashed
    pool.crash_point = Some(crash_point);
    pool.crashed_at = Some(clock.unix_timestamp);
    pool.is_active = false;

    emit!(PoolCrashed {
        pool: pool.key(),
        crash_point,
        crashed_at: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CrashPool<'info> {
    #[account(
        mut,
        seeds = [b"pool", pool.token_mint.as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    
    /// CHECK: Admin or pool creator
    pub admin: Signer<'info>,
}

#[event]
pub struct PoolCrashed {
    pub pool: Pubkey,
    pub crash_point: u64,
    pub crashed_at: i64,
}
