use anchor_lang::prelude::*;

#[error_code]
pub enum MembershipError {
    #[msg("Caller is not authorized to perform this action")]
    Unauthorized,
    #[msg("Provided platform treasury does not match configuration")]
    InvalidTreasury,
    #[msg("Club owner does not match authority")]
    OwnerMismatch,
    #[msg("Provided owner treasury does not match campaign owner")]
    InvalidOwnerTreasury,
    #[msg("Provided club does not match campaign")]
    ClubMismatch,
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
    #[msg("Payment path is not implemented for this instruction")]
    UnsupportedPaymentPath,
}
