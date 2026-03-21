use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};

use crate::{
    error::MembershipError,
    events::ClubCreated,
    state::{Club, PlatformConfig},
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateClubParams {
    pub slug: String,
    pub metadata_uri: String,
}

#[derive(Accounts)]
#[instruction(params: CreateClubParams)]
pub struct CreateClub<'info> {
    #[account(mut)]
    pub club_owner: Signer<'info>,
    #[account(seeds = [b"platform"], bump = platform_config.bump)]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(mut)]
    pub platform_treasury: SystemAccount<'info>,
    #[account(
        init,
        payer = club_owner,
        space = 8 + Club::INIT_SPACE,
        seeds = [b"club", club_owner.key().as_ref(), params.slug.as_bytes()],
        bump
    )]
    pub club: Account<'info, Club>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateClub>, params: CreateClubParams) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.platform_treasury.key(),
        ctx.accounts.platform_config.treasury,
        MembershipError::InvalidTreasury
    );

    let fee = ctx.accounts.platform_config.club_creation_fee_lamports;
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

    let club = &mut ctx.accounts.club;
    club.owner = ctx.accounts.club_owner.key();
    club.slug = params.slug.clone();
    club.metadata_uri = params.metadata_uri;
    club.campaign_fee_bps = ctx.accounts.platform_config.default_campaign_fee_bps;
    club.min_campaign_fee_lamports = ctx.accounts.platform_config.default_min_campaign_fee_lamports;
    club.campaign_count = 0;
    club.bump = ctx.bumps.club;

    emit!(ClubCreated {
        club: club.key(),
        owner: club.owner,
        slug: params.slug,
    });

    Ok(())
}
