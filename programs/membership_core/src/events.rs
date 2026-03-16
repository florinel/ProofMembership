use anchor_lang::prelude::*;

#[event]
pub struct ClubCreated {
    pub club: Pubkey,
    pub owner: Pubkey,
    pub slug: String,
}

#[event]
pub struct CampaignCreated {
    pub campaign: Pubkey,
    pub club: Pubkey,
    pub owner: Pubkey,
    pub price: u64,
}

#[event]
pub struct MembershipPurchased {
    pub membership: Pubkey,
    pub campaign: Pubkey,
    pub buyer: Pubkey,
    pub paid_amount: u64,
}
