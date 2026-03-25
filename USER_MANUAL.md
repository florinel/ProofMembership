# ProofMembership User Manual

This guide explains how to run and use the current ProofMembership implementation from the web app.

## 1. Roles and surfaces

### Contract admin

- initializes the platform fee configuration
- reviews owner applications and approves (with onboarding fee collection) or rejects
- reviews club, campaign, and balance overview data

Primary route: `/admin`

### Club owner

- applies for owner role before creating clubs
- reviews campaigns for owned clubs
- uploads template media
- creates membership campaigns

Primary routes:

- `/owner`
- `/owner/campaigns/new`

### Storefront user

- browses active campaigns
- purchases memberships
- checks purchased assets and metadata links

Primary route: `/storefront`

### Developer role switcher

- sets a non-production role cookie for route-gated UI testing

Primary route: `/dev`

## 2. Setup

### Web prerequisites

- Node 20+
- pnpm 9+

Install dependencies from the repository root:

```bash
pnpm install
```

Optional campaign media storage configuration:

- `PROOFMEMBERSHIP_MEDIA_PROVIDER=local|arweave` (default: `local`)
- `PROOFMEMBERSHIP_ARWEAVE_UPLOAD_URL=https://...` (required for `arweave` mode)
- `PROOFMEMBERSHIP_ARWEAVE_API_KEY=...` (optional bearer token for your uploader)

In `arweave` mode, the template upload API forwards files to your configured uploader and uses the returned permanent URI.

Optional purchase mode configuration:

- `PROOFMEMBERSHIP_PURCHASE_MODE=local|onchain` (default: `local`)

When using `onchain` mode, configure:

- `PROOFMEMBERSHIP_RPC_URL=https://...`
- `PROOFMEMBERSHIP_PROGRAM_ID=...`
- `PROOFMEMBERSHIP_PLATFORM_TREASURY=...`

`onchain` mode now performs real wallet transaction wiring for Anchor `purchase_membership`.
The storefront confirms the transaction, then calls `/api/storefront/purchase/confirm`, which validates transaction contents from RPC before membership projection.

### Optional backend prerequisites

If you want to run Rust tests or Anchor commands as part of the workflow, also install:

- Rust toolchain
- Solana CLI
- Anchor CLI

## 3. Start the app

From the repository root:

```bash
pnpm dev:web
```

Then open `http://localhost:3000`.

If you want to reset and relaunch the whole local stack cleanly, use:

```bash
pnpm util:clean-start:local
pnpm util:stop-all:local
pnpm util:watch:changelog
```

- `pnpm util:clean-start:local` stops existing local ProofMembership processes, clears the local read model, starts the local validator, builds and deploys the Anchor program, then launches the indexer scaffold, web app, and changelog watcher.
- `pnpm util:stop-all:local` stops the local validator, indexer, and web app processes and removes generated local indexer state.
- `pnpm util:watch:changelog` runs the changelog watcher by itself if you only want filesystem-driven changelog updates.

## 4. Current auth options

### Option A: development role cookie

Use `/dev` during local UI work:

1. Open `/dev`.
2. Click `Set admin`, `Set owner`, or `Set member`.
3. Navigate to the protected route you want to test.

This path is intended for local development and route-gated UX checks.

### Option B: wallet signature session

The app also supports API-driven wallet auth:

1. `POST /api/auth/challenge` with a wallet address.
2. Sign the returned message with the wallet.
3. `POST /api/auth/verify` with wallet, nonce, message, and signature.
4. The server issues the `proofmembership_session` cookie.

Use `POST /api/auth/logout` to clear the signed session.

## 5. Complete in-app workflow

### Step A: initialize platform as admin

1. Set the role to admin from `/dev` if you are in local development mode.
2. Open `/admin`.
3. In `Initialize Platform`, enter:
   - owner approval fee
   - club creation fee
   - campaign creation fee
   - default campaign fee BPS
   - default minimum campaign fee
4. Submit the form.
5. Click `Refresh Overview` to confirm the config is stored.

### Step B: review owner application as admin

1. Stay on `/admin`.
2. In `Review Owner Applications`, inspect the pending application.
3. Approve to collect the onboarding fee and unlock owner role, or reject with an optional review note.

### Step C: apply and create a club as owner

1. Open `/owner`.
2. In `Apply for Club Ownership`, enter:
   - wallet
   - club description
3. Submit the application and copy the returned application ID.
4. Ask admin to review and approve the application.
5. In `Create Club`, enter:
   - approved owner wallet
   - club slug
   - metadata URI
   - fee paid
6. Submit the form.
7. Confirm the club appears in owner and admin views.

### Step D: create a campaign as owner

1. Open `/owner/campaigns/new`.
2. Enter the owner wallet that matches an existing club.
3. Confirm the club dropdown populates from owned clubs.
4. Set:
   - campaign name
   - price
    - payment token (`SOL`)
   - mint mode (`on_purchase` or `live_event`)
   - optional live mint start timestamp
   - template image URI or upload a template image
   - max supply
   - expiry mode and optional end date
5. Submit the form.
6. Return to `/owner` to review the campaign in the owner table.

### Step E: purchase from storefront

1. Open `/storefront`.
2. Enter a buyer wallet label or address in `Buyer wallet`.
3. Review the list of active campaigns.
4. Click `Buy membership`.
5. In `onchain` mode, approve the wallet transaction prompt.
6. Wait for confirmation and read-model projection status.
7. Confirm the new membership appears in `My memberships`.
8. Follow the asset link to verify the metadata JSON served from `/api/metadata/[assetId]`.

## 6. Files created during usage

The current implementation persists local data during web flows:

- `.proofmembership/indexer/read-model.json` stores clubs, campaigns, memberships, balances, and minted assets
- `.proofmembership/indexer/events.json` stores a simple append-only event history
- `.proofmembership/media/` stores uploaded campaign template images

If you want to reset these files during local development, use:

```bash
pnpm util:stop-all:local
```

or manually delete `.proofmembership/`.

## 7. Running tests

### Web unit tests

```bash
pnpm test:web:unit
```

Run a single web test file:

```bash
pnpm --filter @proofmembership/web test:unit -- src/lib/data/store.test.ts
pnpm --filter @proofmembership/web test:unit -- src/components/owner/OwnerCampaignCreateClient.test.tsx
```

### Backend unit tests

```bash
pnpm test:backend:unit
```

Run a single Rust test:

```bash
cargo test --manifest-path programs/membership_core/Cargo.toml split_handles_typical_fee
```

## 8. Common issues

- `403 admin_role_required` on `/admin`
  - Set the admin role from `/dev`, or use a valid signed session whose wallet resolves to admin.

- `403 owner_role_required` on owner-only routes like `/owner/campaigns/new`
  - Submit an owner application from `/owner`, then use a wallet session that has been approved by admin.

- `template_image_required` while creating a campaign
  - Upload or provide a template image URI before submitting.

- `mint_not_started` during purchase
  - The campaign uses `live_event` mint mode and the mint start timestamp is still in the future.

- Rust or Anchor commands fail
  - Install the Rust toolchain and Anchor CLI before running backend commands.

## 9. Current implementation boundaries

- The Anchor program purchase instruction supports real SPL NFT minting and the storefront now builds/signs this instruction in `onchain` mode.
- The web confirmation path verifies transaction success, instruction discriminator, account ordering, writable flags, and treasury balance deltas from RPC before projection.
- Membership rows shown in the web app are still read-model projections; full indexer-driven chain ingestion remains a separate follow-up.
- The web read model is file-backed local storage, not a shared external database.
- The indexer service is still a scaffold and does not yet provide a full ingestion/persistence stack.
