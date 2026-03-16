use anchor_lang::prelude::*;

#[error_code]
pub enum MembershipError {
    #[msg("Provided platform treasury does not match configuration")]
    InvalidTreasury,
    #[msg("Club owner does not match authority")]
    OwnerMismatch,
    #[msg("Provided owner treasury does not match campaign owner")]
    InvalidOwnerTreasury,
    #[msg("Campaign fee bps must be between 0 and 10000")]
    InvalidCampaignFeeBps,
    #[msg("Campaign is not active")]
    CampaignNotActive,
    #[msg("Campaign is sold out")]
    CampaignSoldOut,
    #[msg("Campaign is expired")]
    CampaignExpired,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Invalid payment mint for this instruction")]
    InvalidPaymentMint,
    #[msg("Invalid token account configuration")]
    InvalidTokenAccount,
    #[msg("Payment path is not implemented for this instruction")]
    UnsupportedPaymentPath,
}
