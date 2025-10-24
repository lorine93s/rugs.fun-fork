use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::state::*;
use crate::errors::*;

pub fn handler(
    ctx: Context<LaunchToken>,
    supply: u64,
    liquidity: u64,
    fee_percentage: u8,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let clock = Clock::get()?;

    require!(supply > 0, RugForkError::InvalidAmount);
    require!(liquidity >= 0, RugForkError::InvalidAmount);
    require!(fee_percentage >= 1 && fee_percentage <= 10, RugForkError::InvalidFeePercentage);

    // Initialize pool data
    pool.token_mint = ctx.accounts.token_mint.key();
    pool.liquidity = liquidity;
    pool.creator = ctx.accounts.creator.key();
    pool.created_at = clock.unix_timestamp;
    pool.is_active = true;
    pool.total_bets = 0;
    pool.total_volume = 0;
    pool.fee_percentage = fee_percentage;
    pool.crash_point = None;
    pool.crashed_at = None;
    pool.rug_score = 0;

    // Mint tokens to pool
    let seeds = &[
        b"pool",
        pool.token_mint.as_ref(),
        &[ctx.bumps.pool],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = token::MintTo {
        mint: ctx.accounts.token_mint.to_account_info(),
        to: ctx.accounts.pool_token_account.to_account_info(),
        authority: ctx.accounts.pool.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

    token::mint_to(cpi_ctx, supply)?;

    // Transfer initial liquidity if provided
    if liquidity > 0 {
        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.creator.to_account_info(),
            to: ctx.accounts.pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.system_program.to_account_info();
        anchor_lang::system_program::transfer(CpiContext::new(cpi_program, cpi_accounts), liquidity)?;
    }

    emit!(TokenLaunched {
        pool: pool.key(),
        token_mint: pool.token_mint,
        creator: pool.creator,
        supply,
        liquidity,
        fee_percentage,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct LaunchToken<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Pool::INIT_SPACE,
        seeds = [b"pool", token_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = creator,
        token::mint = token_mint,
        token::authority = pool,
        seeds = [b"pool_token_account", token_mint.key().as_ref()],
        bump
    )]
    pub pool_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct TokenLaunched {
    pub pool: Pubkey,
    pub token_mint: Pubkey,
    pub creator: Pubkey,
    pub supply: u64,
    pub liquidity: u64,
    pub fee_percentage: u8,
}
