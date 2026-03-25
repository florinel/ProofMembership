use anchor_lang::prelude::*;

/// Global platform config PDA that stores authority, treasury, and default fees.
#[account]
pub struct PlatformConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub club_creation_fee_lamports: u64,
    pub campaign_creation_fee_lamports: u64,
    pub default_campaign_fee_bps: u16,
    pub default_min_campaign_fee_lamports: u64,
    pub bump: u8,
}

impl PlatformConfig {
    // Sum of all serialized fields, excluding Anchor discriminator.
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 8 + 2 + 8 + 1;
}

/// Club account controlled by an approved owner wallet.
#[account]
pub struct Club {
    pub owner: Pubkey,
    pub slug: String,
    pub metadata_uri: String,
    pub campaign_fee_bps: u16,
    pub min_campaign_fee_lamports: u64,
    pub campaign_count: u32,
    pub bump: u8,
}

impl Club {
    pub const MAX_SLUG_LEN: usize = 48;
    pub const MAX_URI_LEN: usize = 200;
    // Sum of all serialized fields, excluding Anchor discriminator.
    pub const INIT_SPACE: usize = 32 + 4 + Self::MAX_SLUG_LEN + 4 + Self::MAX_URI_LEN + 2 + 8 + 4 + 1;
}

/// Campaign lifecycle status used by purchase validation.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CampaignStatus {
    Active,
    Paused,
    Closed,
}

/// Campaign account storing price and supply lifecycle data.
#[account]
pub struct Campaign {
    pub club: Pubkey,
    pub owner: Pubkey,
    pub name: String,
    pub price: u64,
    pub max_supply: Option<u32>,
    pub minted_supply: u32,
    pub expires_at_unix: Option<i64>,
    pub status: CampaignStatus,
    pub bump: u8,
}

impl Campaign {
    pub const MAX_NAME_LEN: usize = 64;
    // Sum of all serialized fields, excluding Anchor discriminator.
    pub const INIT_SPACE: usize = 32 + 32 + 4 + Self::MAX_NAME_LEN + 8 + 5 + 4 + 9 + 1 + 1;
}

/// Membership receipt account keyed by campaign, buyer, and minted NFT.
#[account]
pub struct Membership {
    pub owner: Pubkey,
    pub campaign: Pubkey,
    pub nft_mint: Pubkey,
    pub purchased_at_unix: i64,
    pub expires_at_unix: Option<i64>,
    pub revoked: bool,
    pub bump: u8,
}

impl Membership {
    // Sum of all serialized fields, excluding Anchor discriminator.
    pub const INIT_SPACE: usize = 32 + 32 + 32 + 8 + 9 + 1 + 1;
}
