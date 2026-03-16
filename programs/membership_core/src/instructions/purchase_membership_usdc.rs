use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    error::MembershipError,
    events::MembershipPurchased,
    state::{Campaign, CampaignStatus, Membership, PaymentMint, PlatformConfig},
    utils::calculate_platform_and_owner_split,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PurchaseMembershipUsdcParams {
    pub nft_mint: Pubkey,
}

#[derive(Accounts)]
#[instruction(params: PurchaseMembershipUsdcParams)]
pub struct PurchaseMembershipUsdc<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(seeds = [b"platform"], bump = platform_config.bump)]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub buyer_payment_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner_payment_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub platform_payment_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = buyer,
        space = 8 + Membership::INIT_SPACE,
        seeds = [b"membership", campaign.key().as_ref(), buyer.key().as_ref(), params.nft_mint.as_ref()],
        bump
    )]
    pub membership: Account<'info, Membership>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PurchaseMembershipUsdc>, params: PurchaseMembershipUsdcParams) -> Result<()> {
    let clock = Clock::get()?;
    let campaign = &mut ctx.accounts.campaign;
    let platform_config = &ctx.accounts.platform_config;

    require!(campaign.payment_mint == PaymentMint::Usdc, MembershipError::InvalidPaymentMint);

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

    // All payment accounts must be owned by the expected wallet/treasury so funds cannot be
    // redirected through arbitrary token accounts.
    require_keys_eq!(
        ctx.accounts.buyer_payment_account.owner,
        ctx.accounts.buyer.key(),
        MembershipError::InvalidTokenAccount
    );
    require_keys_eq!(
        ctx.accounts.owner_payment_account.owner,
        campaign.owner,
        MembershipError::InvalidTokenAccount
    );
    require_keys_eq!(
        ctx.accounts.platform_payment_account.owner,
        platform_config.treasury,
        MembershipError::InvalidTokenAccount
    );

    require_keys_eq!(
        ctx.accounts.buyer_payment_account.mint,
        platform_config.usdc_mint,
        MembershipError::InvalidTokenAccount
    );
    require_keys_eq!(
        ctx.accounts.owner_payment_account.mint,
        platform_config.usdc_mint,
        MembershipError::InvalidTokenAccount
    );
    require_keys_eq!(
        ctx.accounts.platform_payment_account.mint,
        platform_config.usdc_mint,
        MembershipError::InvalidTokenAccount
    );

    let (platform_fee, owner_amount) =
        calculate_platform_and_owner_split(campaign.price, platform_config.campaign_fee_bps)?;

    // Split the transfer into platform and owner legs so the USDC path mirrors the same fee model
    // as the SOL instruction.
    if platform_fee > 0 {
        let transfer_to_platform = Transfer {
            from: ctx.accounts.buyer_payment_account.to_account_info(),
            to: ctx.accounts.platform_payment_account.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_to_platform),
            platform_fee,
        )?;
    }

    if owner_amount > 0 {
        let transfer_to_owner = Transfer {
            from: ctx.accounts.buyer_payment_account.to_account_info(),
            to: ctx.accounts.owner_payment_account.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_to_owner),
            owner_amount,
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
