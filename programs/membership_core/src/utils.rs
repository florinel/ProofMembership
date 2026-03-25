use anchor_lang::prelude::*;

use crate::error::MembershipError;
use crate::state::{Campaign, CampaignStatus};

pub fn validate_campaign_fee_bps(fee_bps: u16) -> Result<()> {
    if fee_bps > 10_000 {
        return err!(MembershipError::InvalidCampaignFeeBps);
    }

    Ok(())
}

pub fn validate_campaign_purchase_state(campaign: &Campaign, now_unix: i64) -> Result<()> {
    if campaign.status != CampaignStatus::Active {
        return err!(MembershipError::CampaignNotActive);
    }

    if let Some(max_supply) = campaign.max_supply {
        if campaign.minted_supply >= max_supply {
            return err!(MembershipError::CampaignSoldOut);
        }
    }

    if let Some(expiry) = campaign.expires_at_unix {
        if now_unix > expiry {
            return err!(MembershipError::CampaignExpired);
        }
    }

    Ok(())
}

/// Derive the platform and owner fee split from a price and basis-point fee setting,
/// applying a minimum fee floor in lamports.
pub fn calculate_platform_and_owner_split(price: u64, fee_bps: u16, min_fee_lamports: u64) -> Result<(u64, u64)> {
    validate_campaign_fee_bps(fee_bps)?;

    let bps_fee = price
        .checked_mul(fee_bps as u64)
        .ok_or(MembershipError::MathOverflow)?
        .checked_div(10_000)
        .ok_or(MembershipError::MathOverflow)?;
    let platform_fee = bps_fee.max(min_fee_lamports).min(price);
    let owner_amount = price.checked_sub(platform_fee).ok_or(MembershipError::MathOverflow)?;

    Ok((platform_fee, owner_amount))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_campaign(status: CampaignStatus, max_supply: Option<u32>, minted_supply: u32, expires_at_unix: Option<i64>) -> Campaign {
        Campaign {
            club: Pubkey::new_unique(),
            owner: Pubkey::new_unique(),
            name: "Test campaign".to_string(),
            price: 1_000_000,
            max_supply,
            minted_supply,
            expires_at_unix,
            status,
            bump: 255,
        }
    }

    #[test]
    fn validate_campaign_fee_bps_accepts_max_value() {
        let result = validate_campaign_fee_bps(10_000);
        assert!(result.is_ok());
    }

    #[test]
    fn validate_campaign_fee_bps_rejects_invalid_bps() {
        let result = validate_campaign_fee_bps(10_001);
        assert!(result.is_err());
    }

    #[test]
    fn validate_campaign_purchase_state_accepts_active_campaign() {
        let campaign = test_campaign(CampaignStatus::Active, Some(10), 4, Some(1_000));
        let result = validate_campaign_purchase_state(&campaign, 1_000);
        assert!(result.is_ok());
    }

    #[test]
    fn validate_campaign_purchase_state_rejects_paused_campaign() {
        let campaign = test_campaign(CampaignStatus::Paused, Some(10), 4, Some(1_000));
        let result = validate_campaign_purchase_state(&campaign, 999);
        assert!(result.is_err());
    }

    #[test]
    fn validate_campaign_purchase_state_rejects_closed_campaign() {
        let campaign = test_campaign(CampaignStatus::Closed, Some(10), 4, Some(1_000));
        let result = validate_campaign_purchase_state(&campaign, 999);
        assert!(result.is_err());
    }

    #[test]
    fn validate_campaign_purchase_state_rejects_sold_out_campaign() {
        let campaign = test_campaign(CampaignStatus::Active, Some(5), 5, None);
        let result = validate_campaign_purchase_state(&campaign, 0);
        assert!(result.is_err());
    }

    #[test]
    fn validate_campaign_purchase_state_rejects_expired_campaign() {
        let campaign = test_campaign(CampaignStatus::Active, None, 0, Some(1_000));
        let result = validate_campaign_purchase_state(&campaign, 1_001);
        assert!(result.is_err());
    }

    #[test]
    fn validate_campaign_purchase_state_prioritizes_status_error() {
        let campaign = test_campaign(CampaignStatus::Paused, Some(1), 1, Some(1));
        let result = validate_campaign_purchase_state(&campaign, 2);
        assert!(matches!(result, Err(error) if error == MembershipError::CampaignNotActive.into()));
    }

    #[test]
    fn split_handles_zero_fee() {
        let (platform, owner) = calculate_platform_and_owner_split(1_000_000, 0, 0).unwrap();
        assert_eq!(platform, 0);
        assert_eq!(owner, 1_000_000);
    }

    #[test]
    fn split_handles_max_fee() {
        let (platform, owner) = calculate_platform_and_owner_split(1_000_000, 10_000, 0).unwrap();
        assert_eq!(platform, 1_000_000);
        assert_eq!(owner, 0);
    }

    #[test]
    fn split_handles_typical_fee() {
        let (platform, owner) = calculate_platform_and_owner_split(2_000_000, 500, 0).unwrap();
        assert_eq!(platform, 100_000);
        assert_eq!(owner, 1_900_000);
    }

    #[test]
    fn split_applies_min_fee_floor() {
        let (platform, owner) = calculate_platform_and_owner_split(1_000_000, 10, 10_000).unwrap();
        assert_eq!(platform, 10_000);
        assert_eq!(owner, 990_000);
    }

    #[test]
    fn split_rejects_invalid_bps() {
        let result = calculate_platform_and_owner_split(100, 10_001, 0);
        assert!(result.is_err());
    }

    #[test]
    fn split_rounds_down_platform_share() {
        let (platform, owner) = calculate_platform_and_owner_split(1, 500, 0).unwrap();
        assert_eq!(platform, 0);
        assert_eq!(owner, 1);
    }

    #[test]
    fn split_rejects_overflow() {
        let result = calculate_platform_and_owner_split(u64::MAX, 10_000, 0);
        assert!(result.is_err());
    }
}
