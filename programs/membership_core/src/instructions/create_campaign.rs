use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};

use crate::{
    error::MembershipError,
    events::CampaignCreated,
    state::{Campaign, CampaignStatus, Club, PlatformConfig},
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateCampaignParams {
    pub name: String,
    pub price: u64,
    pub max_supply: Option<u32>,
    pub expires_at_unix: Option<i64>,
}

#[derive(Accounts)]
#[instruction(params: CreateCampaignParams)]
pub struct CreateCampaign<'info> {
    #[account(mut)]
    pub club_owner: Signer<'info>,
    #[account(seeds = [b"platform"], bump = platform_config.bump)]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(mut)]
    pub platform_treasury: SystemAccount<'info>,
    #[account(mut)]
    pub club: Account<'info, Club>,
    #[account(
        init,
        payer = club_owner,
        space = 8 + Campaign::INIT_SPACE,
        seeds = [b"campaign", club.key().as_ref(), params.name.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateCampaign>, params: CreateCampaignParams) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    let club = &mut ctx.accounts.club;

    require_keys_eq!(
        ctx.accounts.platform_treasury.key(),
        ctx.accounts.platform_config.treasury,
        MembershipError::InvalidTreasury
    );
    require_keys_eq!(club.owner, ctx.accounts.club_owner.key(), MembershipError::OwnerMismatch);

    let fee = ctx.accounts.platform_config.campaign_creation_fee_lamports;
    if fee > 0 {
        invoke(
            &system_instruction::transfer(
                &ctx.accounts.club_owner.key(),
                &ctx.accounts.platform_treasury.key(),
                fee,
            ),
            &[
                ctx.accounts.club_owner.to_account_info(),
                ctx.accounts.platform_treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
    }

    campaign.club = club.key();
    campaign.owner = ctx.accounts.club_owner.key();
    campaign.name = params.name.clone();
    campaign.price = params.price;
    campaign.max_supply = params.max_supply;
    campaign.minted_supply = 0;
    campaign.expires_at_unix = params.expires_at_unix;
    campaign.status = CampaignStatus::Active;
    campaign.bump = ctx.bumps.campaign;

    club.campaign_count = club.campaign_count.saturating_add(1);

    emit!(CampaignCreated {
        campaign: campaign.key(),
        club: club.key(),
        owner: campaign.owner,
        price: campaign.price,
    });

    Ok(())
}
