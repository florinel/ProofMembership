# SOL and USDC Payment Test Plan

Use this checklist when validating both purchase paths and fee-splitting behavior.

## Preconditions

- platform is initialized with treasury and fee configuration
- one club exists for the target owner
- the environment has the required SOL and, for the USDC path, matching token accounts

## Scenario

1. Create one SOL campaign.
   - payment token: `SOL`
   - valid template image
   - known price

2. Create one USDC campaign.
   - payment token: `USDC`
   - valid template image
   - known price

3. Execute a SOL purchase.
   - purchase from `/storefront` or invoke the SOL instruction on-chain
   - confirm membership creation succeeds

4. Execute a USDC purchase.
   - use buyer, owner, and platform token accounts with the configured USDC mint
   - confirm membership creation succeeds

5. Verify fee split behavior.
   - confirm platform share matches `campaign_fee_bps`
   - confirm owner share matches the remainder
   - confirm the split rounds down safely when needed

6. Verify read-model and metadata output.
   - purchased memberships appear in `.solnft/indexer/read-model.json`
   - `membership_purchased` events appear in `.solnft/indexer/events.json`
   - purchased assets expose metadata via `/api/metadata/[assetId]`

7. Negative checks.
   - wrong token mint for USDC path fails
   - wrong platform treasury fails
   - wrong owner treasury or token account fails
   - sold-out, expired, or inactive campaign fails
