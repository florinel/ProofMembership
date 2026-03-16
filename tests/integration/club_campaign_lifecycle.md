# Club and Campaign Lifecycle Test Plan

Use this checklist when validating the main admin -> owner -> storefront flow.

## Preconditions

- web app is running
- local or devnet environment is configured
- an admin role/session is available
- an owner wallet value is chosen
- a member wallet value is chosen

## Scenario

1. Initialize platform config from `/admin`.
   - set club creation fee
   - set campaign creation fee
   - set campaign fee BPS
   - confirm admin overview shows initialized config

2. Create a club from `/admin`.
   - provide slug, owner wallet, metadata URI, and fee paid
   - confirm the club appears in the admin table
   - open `/admin/clubs/[clubId]`

3. Create a campaign from `/owner/campaigns/new`.
   - use an owner wallet that matches the club
   - upload or provide a template image URI
   - create a campaign with an indefinite end date or fixed end date
   - confirm the campaign appears on `/owner`

4. Purchase a membership from `/storefront`.
   - use the member wallet
   - purchase an active campaign
   - confirm `My memberships` shows the new item

5. Validate generated asset metadata.
   - open the linked `/api/metadata/[assetId]`
   - confirm metadata includes campaign, club, and owner attributes

6. Validate persisted state.
   - confirm `.solnft/indexer/read-model.json` includes the platform config, club, campaign, membership, and asset
   - confirm `.solnft/indexer/events.json` contains `platform_initialized`, `club_created`, `campaign_created`, and `membership_purchased`

7. Validate admin metrics.
   - owners count increased
   - clubs count increased
   - campaigns count increased
   - platform balance reflects collected fees
