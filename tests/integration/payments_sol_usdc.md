# SOL Payment Test Plan

Use this checklist when validating membership purchases and fee-splitting behavior.

## Preconditions

- platform is initialized with treasury and fee configuration
- one club exists for the target owner
- the environment has the required SOL balances for buyer, owner, and platform wallets

## Scenario

1. Create one SOL campaign.
   - payment token: `SOL`
   - valid template image
   - known price

2. Execute a SOL purchase.
   - purchase from `/storefront` or invoke the SOL instruction on-chain
   - confirm membership creation succeeds

3. Verify fee split behavior.
   - confirm platform share matches `campaign_fee_bps`
   - confirm owner share matches the remainder
   - confirm the split rounds down safely when needed

4. Verify read-model and metadata output.
   - purchased memberships appear in `.solnft/indexer/read-model.json`
   - `membership_purchased` events appear in `.solnft/indexer/events.json`
   - purchased assets expose metadata via `/api/metadata/[assetId]`

5. Negative checks.
   - wrong platform treasury fails
   - wrong owner treasury fails
   - sold-out, expired, or inactive campaign fails
