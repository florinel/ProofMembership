use anchor_lang::prelude::*;

use crate::{error::MembershipError, state::PlatformConfig};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializePlatformParams {
    pub club_creation_fee_lamports: u64,
    pub campaign_creation_fee_lamports: u64,
    pub default_campaign_fee_bps: u16,
    pub default_min_campaign_fee_lamports: u64,
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: treasury can be any treasury wallet controlled by platform authority.
    pub treasury: UncheckedAccount<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + PlatformConfig::INIT_SPACE,
        seeds = [b"platform"],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializePlatform>, params: InitializePlatformParams) -> Result<()> {
    require!(params.default_campaign_fee_bps <= 10_000, MembershipError::InvalidCampaignFeeBps);

    let account = &mut ctx.accounts.platform_config;
    account.authority = ctx.accounts.authority.key();
    account.treasury = ctx.accounts.treasury.key();
    account.club_creation_fee_lamports = params.club_creation_fee_lamports;
    account.campaign_creation_fee_lamports = params.campaign_creation_fee_lamports;
    account.default_campaign_fee_bps = params.default_campaign_fee_bps;
    account.default_min_campaign_fee_lamports = params.default_min_campaign_fee_lamports;
    account.bump = ctx.bumps.platform_config;
    Ok(())
}
