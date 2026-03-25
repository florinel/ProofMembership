use anchor_lang::prelude::*;

use crate::{
    error::MembershipError,
    state::{Club, PlatformConfig},
    utils::validate_campaign_fee_bps,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SetClubFeePolicyParams {
    pub campaign_fee_bps: u16,
    pub min_campaign_fee_lamports: u64,
}

#[derive(Accounts)]
pub struct SetClubFeePolicy<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [b"platform"], bump = platform_config.bump)]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(mut)]
    pub club: Account<'info, Club>,
}

pub fn handler(ctx: Context<SetClubFeePolicy>, params: SetClubFeePolicyParams) -> Result<()> {
    // Only platform authority can rewrite club-level fee economics.
    require_keys_eq!(
        ctx.accounts.platform_config.authority,
        ctx.accounts.authority.key(),
        MembershipError::Unauthorized
    );
    validate_campaign_fee_bps(params.campaign_fee_bps)?;

    let club = &mut ctx.accounts.club;
    club.campaign_fee_bps = params.campaign_fee_bps;
    club.min_campaign_fee_lamports = params.min_campaign_fee_lamports;

    Ok(())
}
