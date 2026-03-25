use anchor_lang::prelude::*;

use crate::error::MembershipError;

/// Derive the platform and owner fee split from a price and basis-point fee setting,
/// applying a minimum fee floor in lamports.
pub fn calculate_platform_and_owner_split(price: u64, fee_bps: u16, min_fee_lamports: u64) -> Result<(u64, u64)> {
    if fee_bps > 10_000 {
        return err!(MembershipError::InvalidCampaignFeeBps);
    }

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
