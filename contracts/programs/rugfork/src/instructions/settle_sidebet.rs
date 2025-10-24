use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

pub fn handler(
    ctx: Context<SettleSidebet>,
    crash_point: u64,
) -> Result<()> {
    let bet = &mut ctx.accounts.bet;
    let pool = &mut ctx.accounts.pool;
    let clock = Clock::get()?;

    require!(!bet.is_settled, RugForkError::BetAlreadySettled);
    require!(crash_point > 0, RugForkError::InvalidCrashPoint);

    // Calculate if bet won (crash point > multiplier)
    let won = crash_point >= bet.multiplier;
    
    if won {
        // Bet won - calculate winnings
        bet.winnings = (bet.amount * bet.multiplier) / 100;
        bet.is_settled = true;
        bet.crash_point = Some(crash_point);
        bet.settled_at = Some(clock.unix_timestamp);

        // Transfer winnings to user
        let seeds = &[
            b"pool",
            pool.token_mint.as_ref(),
            &[ctx.bumps.pool],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.pool.to_account_info(),
            to: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        anchor_lang::system_program::transfer(cpi_ctx, bet.winnings)?;
    } else {
        // Bet lost
        bet.is_settled = true;
        bet.winnings = 0;
        bet.crash_point = Some(crash_point);
        bet.settled_at = Some(clock.unix_timestamp);
    }

    emit!(SidebetSettled {
        bet: bet.key(),
        user: bet.user,
        winnings: bet.winnings,
        crash_point,
        won,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct SettleSidebet<'info> {
    #[account(
        mut,
        seeds = [b"pool", pool.token_mint.as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(
        mut,
        seeds = [b"bet", pool.key().as_ref(), user.key().as_ref()],
        bump,
        constraint = bet.user == user.key()
    )]
    pub bet: Account<'info, Bet>,
    
    /// CHECK: This is the user who placed the bet
    pub user: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[event]
pub struct SidebetSettled {
    pub bet: Pubkey,
    pub user: Pubkey,
    pub winnings: u64,
    pub crash_point: u64,
    pub won: bool,
}
