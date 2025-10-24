use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

pub fn create_tournament(
    ctx: Context<CreateRugRoyale>,
    prize_pool: u64,
    duration: i64,
) -> Result<()> {
    let tournament = &mut ctx.accounts.tournament;
    let clock = Clock::get()?;

    require!(prize_pool > 0, RugForkError::InvalidAmount);
    require!(duration > 0, RugForkError::InvalidAmount);

    tournament.id = clock.unix_timestamp as u64; // Use timestamp as ID
    tournament.creator = ctx.accounts.creator.key();
    tournament.prize_pool = prize_pool;
    tournament.start_time = clock.unix_timestamp;
    tournament.end_time = clock.unix_timestamp + duration;
    tournament.is_active = true;
    tournament.participants = Vec::new();
    tournament.winners = Vec::new();
    tournament.total_participants = 0;
    tournament.entry_fee = prize_pool / 100; // 1% of prize pool as entry fee

    // Transfer prize pool to tournament account
    let cpi_accounts = anchor_lang::system_program::Transfer {
        from: ctx.accounts.creator.to_account_info(),
        to: ctx.accounts.tournament.to_account_info(),
    };
    let cpi_program = ctx.accounts.system_program.to_account_info();
    anchor_lang::system_program::transfer(CpiContext::new(cpi_program, cpi_accounts), prize_pool)?;

    emit!(RugRoyaleCreated {
        tournament: tournament.key(),
        creator: tournament.creator,
        prize_pool: tournament.prize_pool,
        duration,
    });

    Ok(())
}

pub fn join_tournament(ctx: Context<JoinRugRoyale>) -> Result<()> {
    let tournament = &mut ctx.accounts.tournament;
    let clock = Clock::get()?;

    require!(tournament.is_active, RugForkError::TournamentNotActive);
    require!(clock.unix_timestamp < tournament.end_time, RugForkError::TournamentEnded);
    require!(!tournament.participants.contains(&ctx.accounts.user.key()), RugForkError::UserAlreadyInTournament);

    // Transfer entry fee
    let cpi_accounts = anchor_lang::system_program::Transfer {
        from: ctx.accounts.user.to_account_info(),
        to: ctx.accounts.tournament.to_account_info(),
    };
    let cpi_program = ctx.accounts.system_program.to_account_info();
    anchor_lang::system_program::transfer(CpiContext::new(cpi_program, cpi_accounts), tournament.entry_fee)?;

    // Add user to participants
    tournament.participants.push(ctx.accounts.user.key());
    tournament.total_participants += 1;

    emit!(RugRoyaleJoined {
        tournament: tournament.key(),
        user: ctx.accounts.user.key(),
        total_participants: tournament.total_participants,
    });

    Ok(())
}

pub fn distribute_prizes(ctx: Context<DistributeRugRoyalePrizes>) -> Result<()> {
    let tournament = &mut ctx.accounts.tournament;
    let clock = Clock::get()?;

    require!(tournament.is_active, RugForkError::TournamentNotActive);
    require!(clock.unix_timestamp >= tournament.end_time, RugForkError::TournamentNotActive);
    require!(tournament.winners.is_empty(), RugForkError::TournamentEnded);

    // Calculate winners based on some criteria (simplified)
    // In a real implementation, this would be based on trading performance
    let mut winners = Vec::new();
    let total_prize = tournament.prize_pool + (tournament.entry_fee * tournament.total_participants as u64);
    
    // Distribute prizes to top 3 participants
    let prize_distribution = [50, 30, 20]; // 50%, 30%, 20%
    
    for (i, participant) in tournament.participants.iter().enumerate() {
        if i < 3 {
            let prize_amount = (total_prize * prize_distribution[i] as u64) / 100;
            winners.push(Winner {
                user: *participant,
                rank: (i + 1) as u8,
                prize_amount,
            });

            // Transfer prize to winner
            let seeds = &[
                b"rug_royale",
                &tournament.id.to_le_bytes(),
                &[ctx.bumps.tournament],
            ];
            let signer = &[&seeds[..]];

            let cpi_accounts = anchor_lang::system_program::Transfer {
                from: ctx.accounts.tournament.to_account_info(),
                to: ctx.accounts.winners.to_account_info(),
            };
            let cpi_program = ctx.accounts.system_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

            anchor_lang::system_program::transfer(cpi_ctx, prize_amount)?;
        }
    }

    tournament.winners = winners;
    tournament.is_active = false;

    emit!(RugRoyaleCompleted {
        tournament: tournament.key(),
        winners: tournament.winners.clone(),
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CreateRugRoyale<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + RugRoyale::INIT_SPACE,
        seeds = [b"rug_royale", &clock.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub tournament: Account<'info, RugRoyale>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinRugRoyale<'info> {
    #[account(
        mut,
        seeds = [b"rug_royale", &tournament.id.to_le_bytes()],
        bump
    )]
    pub tournament: Account<'info, RugRoyale>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DistributeRugRoyalePrizes<'info> {
    #[account(
        mut,
        seeds = [b"rug_royale", &tournament.id.to_le_bytes()],
        bump
    )]
    pub tournament: Account<'info, RugRoyale>,
    
    /// CHECK: This is the winners account
    pub winners: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[event]
pub struct RugRoyaleCreated {
    pub tournament: Pubkey,
    pub creator: Pubkey,
    pub prize_pool: u64,
    pub duration: i64,
}

#[event]
pub struct RugRoyaleJoined {
    pub tournament: Pubkey,
    pub user: Pubkey,
    pub total_participants: u32,
}

#[event]
pub struct RugRoyaleCompleted {
    pub tournament: Pubkey,
    pub winners: Vec<Winner>,
}
