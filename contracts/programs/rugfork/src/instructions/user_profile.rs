use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

pub fn handler(
    ctx: Context<UpdateUserXp>,
    xp_gained: u64,
) -> Result<()> {
    let user_profile = &mut ctx.accounts.user_profile;
    
    require!(xp_gained > 0, RugForkError::InvalidXpAmount);
    
    user_profile.total_xp += xp_gained;
    user_profile.level = (user_profile.total_xp / 1000) as u8 + 1;
    user_profile.last_activity = Clock::get()?.unix_timestamp;

    emit!(UserXpUpdated {
        user: user_profile.user,
        total_xp: user_profile.total_xp,
        level: user_profile.level,
        xp_gained,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateUserXp<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"user_profile", user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[event]
pub struct UserXpUpdated {
    pub user: Pubkey,
    pub total_xp: u64,
    pub level: u8,
    pub xp_gained: u64,
}
