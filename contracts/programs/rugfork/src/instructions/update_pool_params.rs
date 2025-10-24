use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

pub fn handler(
    ctx: Context<UpdatePoolParams>,
    new_fee_percentage: Option<u8>,
    new_is_active: Option<bool>,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    // Only pool creator or admin can update parameters
    require!(
        pool.creator == ctx.accounts.updater.key() || ctx.accounts.updater.key() == ctx.accounts.admin.key(),
        RugForkError::Unauthorized
    );

    if let Some(fee) = new_fee_percentage {
        require!(fee >= 1 && fee <= 10, RugForkError::InvalidFeePercentage);
        pool.fee_percentage = fee;
    }

    if let Some(is_active) = new_is_active {
        pool.is_active = is_active;
    }

    emit!(PoolParamsUpdated {
        pool: pool.key(),
        new_fee_percentage,
        new_is_active,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UpdatePoolParams<'info> {
    #[account(
        mut,
        seeds = [b"pool", pool.token_mint.as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(mut)]
    pub updater: Signer<'info>,
    
    /// CHECK: Admin account
    pub admin: UncheckedAccount<'info>,
}

#[event]
pub struct PoolParamsUpdated {
    pub pool: Pubkey,
    pub new_fee_percentage: Option<u8>,
    pub new_is_active: Option<bool>,
}
