use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};

use crate::{
    error::MembershipError,
    events::MembershipPurchased,
    state::{Campaign, CampaignStatus, Membership, PaymentMint, PlatformConfig},
    utils::calculate_platform_and_owner_split,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PurchaseMembershipParams {
    pub nft_mint: Pubkey,
}

#[derive(Accounts)]
#[instruction(params: PurchaseMembershipParams)]
pub struct PurchaseMembership<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(seeds = [b"platform"], bump = platform_config.bump)]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub platform_treasury: SystemAccount<'info>,
    #[account(mut)]
    pub owner_treasury: SystemAccount<'info>,
    #[account(
        init,
        payer = buyer,
        space = 8 + Membership::INIT_SPACE,
        seeds = [b"membership", campaign.key().as_ref(), buyer.key().as_ref(), params.nft_mint.as_ref()],
        bump
    )]
    pub membership: Account<'info, Membership>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PurchaseMembership>, params: PurchaseMembershipParams) -> Result<()> {
    let clock = Clock::get()?;
    let campaign = &mut ctx.accounts.campaign;
    let platform_config = &ctx.accounts.platform_config;

    require!(campaign.payment_mint == PaymentMint::Sol, MembershipError::InvalidPaymentMint);
    require_keys_eq!(
        ctx.accounts.owner_treasury.key(),
        campaign.owner,
        MembershipError::InvalidOwnerTreasury
    );
    require_keys_eq!(
        ctx.accounts.platform_treasury.key(),
        platform_config.treasury,
        MembershipError::InvalidTreasury
    );

    if campaign.status != CampaignStatus::Active {
        return err!(MembershipError::CampaignNotActive);
    }

    if let Some(max_supply) = campaign.max_supply {
        if campaign.minted_supply >= max_supply {
            return err!(MembershipError::CampaignSoldOut);
        }
    }

    if let Some(expiry) = campaign.expires_at_unix {
        if clock.unix_timestamp > expiry {
            return err!(MembershipError::CampaignExpired);
        }
    }

    let (platform_fee, owner_amount) =
        calculate_platform_and_owner_split(campaign.price, platform_config.campaign_fee_bps)?;

    if platform_fee > 0 {
        invoke(
            &system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.platform_treasury.key(),
                platform_fee,
            ),
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.platform_treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
    }

    if owner_amount > 0 {
        invoke(
            &system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.owner_treasury.key(),
                owner_amount,
            ),
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.owner_treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
    }

    campaign.minted_supply = campaign.minted_supply.saturating_add(1);

    let membership = &mut ctx.accounts.membership;
    membership.owner = ctx.accounts.buyer.key();
    membership.campaign = campaign.key();
    membership.nft_mint = params.nft_mint;
    membership.purchased_at_unix = clock.unix_timestamp;
    membership.expires_at_unix = campaign.expires_at_unix;
    membership.revoked = false;
    membership.bump = ctx.bumps.membership;

    emit!(MembershipPurchased {
        membership: membership.key(),
        campaign: campaign.key(),
        buyer: membership.owner,
        paid_amount: campaign.price,
    });

    Ok(())
}
