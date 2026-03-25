use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

use crate::{
    error::MembershipError,
    events::MembershipPurchased,
    state::{Campaign, Club, Membership, PlatformConfig},
    utils::{calculate_platform_and_owner_split, validate_campaign_purchase_state},
};

#[derive(Accounts)]
pub struct PurchaseMembership<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(seeds = [b"platform"], bump = platform_config.bump)]
    pub platform_config: Box<Account<'info, PlatformConfig>>,
    #[account(mut)]
    pub campaign: Box<Account<'info, Campaign>>,
    #[account(mut)]
    pub club: Box<Account<'info, Club>>,
    #[account(mut)]
    pub platform_treasury: SystemAccount<'info>,
    #[account(mut)]
    pub owner_treasury: SystemAccount<'info>,
    #[account(
        init,
        payer = buyer,
        mint::decimals = 0,
        mint::authority = platform_config,
        mint::freeze_authority = platform_config
    )]
    pub nft_mint: Box<Account<'info, Mint>>,
    #[account(
        init,
        payer = buyer,
        associated_token::mint = nft_mint,
        associated_token::authority = buyer
    )]
    pub buyer_nft_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init,
        payer = buyer,
        space = 8 + Membership::INIT_SPACE,
        seeds = [b"membership", campaign.key().as_ref(), buyer.key().as_ref(), nft_mint.key().as_ref()],
        bump
    )]
    pub membership: Box<Account<'info, Membership>>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PurchaseMembership>) -> Result<()> {
    let clock = Clock::get()?;
    let campaign = &mut ctx.accounts.campaign;
    let club = &ctx.accounts.club;
    let platform_config = &ctx.accounts.platform_config;

    require_keys_eq!(campaign.club, club.key(), MembershipError::ClubMismatch);
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

    // Reject non-purchasable lifecycle states before moving funds.
    validate_campaign_purchase_state(campaign, clock.unix_timestamp)?;

    let (platform_fee, owner_amount) =
        calculate_platform_and_owner_split(campaign.price, club.campaign_fee_bps, club.min_campaign_fee_lamports)?;

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

    // Mint one NFT receipt to buyer ATA using platform PDA as mint authority.
    let signer_seeds: &[&[&[u8]]] = &[&[b"platform", &[platform_config.bump]]];
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.nft_mint.to_account_info(),
                to: ctx.accounts.buyer_nft_token_account.to_account_info(),
                authority: ctx.accounts.platform_config.to_account_info(),
            },
            signer_seeds,
        ),
        1,
    )?;

    // Use saturating add as a last-resort overflow guard in addition to
    // max-supply checks performed in purchase-state validation.
    campaign.minted_supply = campaign.minted_supply.saturating_add(1);

    let membership = &mut ctx.accounts.membership;
    membership.owner = ctx.accounts.buyer.key();
    membership.campaign = campaign.key();
    membership.nft_mint = ctx.accounts.nft_mint.key();
    membership.purchased_at_unix = clock.unix_timestamp;
    membership.expires_at_unix = campaign.expires_at_unix;
    membership.revoked = false;
    membership.bump = ctx.bumps.membership;

    emit!(MembershipPurchased {
        membership: membership.key(),
        campaign: campaign.key(),
        buyer: membership.owner,
        nft_mint: membership.nft_mint,
        paid_amount: campaign.price,
    });

    Ok(())
}
