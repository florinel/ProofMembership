#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

pub mod error;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;

use crate::instructions::{
    CreateCampaign, CreateCampaignParams, CreateClub, CreateClubParams, InitializePlatform,
    InitializePlatformParams, PurchaseMembership, SetClubFeePolicy,
    SetClubFeePolicyParams,
};
#[allow(unused_imports)]
use crate::instructions::create_campaign::__client_accounts_create_campaign;
#[allow(unused_imports)]
use crate::instructions::create_club::__client_accounts_create_club;
#[allow(unused_imports)]
use crate::instructions::initialize_platform::__client_accounts_initialize_platform;
#[allow(unused_imports)]
use crate::instructions::purchase_membership::__client_accounts_purchase_membership;
#[allow(unused_imports)]
use crate::instructions::set_club_fee_policy::__client_accounts_set_club_fee_policy;

declare_id!("3Ne2f2pLbgpsWL3v9xCDy6VjKmoqHjbBtEJL3a6tMuCs");

#[program]
pub mod membership_core {
    use super::*;

    /// Initializes platform-level fee config and treasury authority.
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        params: InitializePlatformParams,
    ) -> Result<()> {
        instructions::initialize_platform::handler(ctx, params)
    }

    /// Creates a club account and charges the configured club creation fee.
    pub fn create_club(
        ctx: Context<CreateClub>,
        params: CreateClubParams,
    ) -> Result<()> {
        instructions::create_club::handler(ctx, params)
    }

    /// Creates a campaign under an existing club and charges campaign creation fee.
    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        params: CreateCampaignParams,
    ) -> Result<()> {
        instructions::create_campaign::handler(ctx, params)
    }

    /// Purchases membership, routes SOL fees, and mints one NFT receipt.
    pub fn purchase_membership(ctx: Context<PurchaseMembership>) -> Result<()> {
        instructions::purchase_membership::handler(ctx)
    }

    /// Updates per-club fee policy using platform authority permissions.
    pub fn set_club_fee_policy(
        ctx: Context<SetClubFeePolicy>,
        params: SetClubFeePolicyParams,
    ) -> Result<()> {
        instructions::set_club_fee_policy::handler(ctx, params)
    }
}
