use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::*;

pub fn handler(
    ctx: Context<InitializePool>,
    token_supply: u64,
    initial_liquidity: u64,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let clock = Clock::get()?;

    // Initialize pool data
    pool.token_mint = ctx.accounts.token_mint.key();
    pool.liquidity = initial_liquidity;
    pool.creator = ctx.accounts.creator.key();
    pool.created_at = clock.unix_timestamp;
    pool.is_active = true;
    pool.total_bets = 0;
    pool.total_volume = 0;
    pool.fee_percentage = 1; // Default 1% fee
    pool.crash_point = None;
    pool.crashed_at = None;
    pool.rug_score = 0; // Will be calculated later

    // Mint initial token supply to pool
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

    token::mint_to(cpi_ctx, token_supply)?;

    // Transfer initial liquidity to pool
    if initial_liquidity > 0 {
        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.creator.to_account_info(),
            to: ctx.accounts.pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.system_program.to_account_info();
        anchor_lang::system_program::transfer(CpiContext::new(cpi_program, cpi_accounts), initial_liquidity)?;
    }

    emit!(PoolInitialized {
        pool: pool.key(),
        token_mint: pool.token_mint,
        creator: pool.creator,
        liquidity: pool.liquidity,
        token_supply,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
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
pub struct PoolInitialized {
    pub pool: Pubkey,
    pub token_mint: Pubkey,
    pub creator: Pubkey,
    pub liquidity: u64,
    pub token_supply: u64,
}
