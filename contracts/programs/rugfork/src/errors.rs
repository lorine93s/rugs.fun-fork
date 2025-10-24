use anchor_lang::prelude::*;

#[error_code]
pub enum RugForkError {
    #[msg("Pool is not active")]
    PoolInactive,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid multiplier")]
    InvalidMultiplier,
    #[msg("Bet already settled")]
    BetAlreadySettled,
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
    #[msg("Invalid fee percentage")]
    InvalidFeePercentage,
    #[msg("Pool already crashed")]
    PoolAlreadyCrashed,
    #[msg("Tournament not active")]
    TournamentNotActive,
    #[msg("Tournament already ended")]
    TournamentEnded,
    #[msg("User already in tournament")]
    UserAlreadyInTournament,
    #[msg("Invalid crash point")]
    InvalidCrashPoint,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("System paused")]
    SystemPaused,
    #[msg("Invalid XP amount")]
    InvalidXpAmount,
    #[msg("RugPass not found")]
    RugPassNotFound,
    #[msg("Invalid RugPass level")]
    InvalidRugPassLevel,
    #[msg("Achievement already unlocked")]
    AchievementAlreadyUnlocked,
    #[msg("Invalid analytics data")]
    InvalidAnalyticsData,
}
