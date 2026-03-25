# SolNFT User Manual

This guide explains how to run and use the current SolNFT implementation from the web app.

## 1. Roles and surfaces

### Contract admin

- initializes the platform fee configuration
- creates clubs for owners
- reviews club, campaign, and balance overview data

Primary route: `/admin`

### Club owner

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

- `pnpm util:clean-start:local` stops existing local SolNFT processes, clears the local read model, starts the local validator, builds and deploys the Anchor program, then launches the indexer scaffold, web app, and changelog watcher.
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
4. The server issues the `solnft_session` cookie.

Use `POST /api/auth/logout` to clear the signed session.

## 5. Complete in-app workflow

### Step A: initialize platform as admin

1. Set the role to admin from `/dev` if you are in local development mode.
2. Open `/admin`.
3. In `Initialize Platform`, enter:
   - club creation fee
   - campaign creation fee
   - campaign fee BPS
4. Submit the form.
5. Click `Refresh Overview` to confirm the config is stored.

### Step B: create a club

1. Stay on `/admin`.
2. In `Approve Owner Application`, enter:
  - application ID
   - fee paid
3. Submit the form to approve the owner wallet.

### Step C: apply and create a club as owner

1. Set the role to owner from `/dev`.
2. Open `/owner`.
3. In `Apply for Club Ownership`, enter:
  - wallet
  - club description
4. Submit the application and copy the returned application ID.
5. Ask admin to approve the application.
6. In `Create Club`, enter:
  - approved owner wallet
  - club slug
  - metadata URI
  - fee paid
7. Submit the form.
8. Confirm the club appears in owner and admin views.

### Step D: create a campaign as owner

1. Open `/owner/campaigns/new`.
3. Enter the owner wallet that matches an existing club.
4. Confirm the club dropdown populates from owned clubs.
5. Set:
   - campaign name
   - price
  - payment token (`SOL`)
   - mint mode (`on_purchase` or `live_event`)
   - optional live mint start timestamp
   - template image URI or upload a template image
   - max supply
   - expiry mode and optional end date
6. Submit the form.
7. Return to `/owner` to review the campaign in the owner table.

### Step E: purchase from storefront

1. Open `/storefront`.
2. Enter a buyer wallet label or address in `Buyer wallet`.
3. Review the list of active campaigns.
4. Click `Buy membership`.
5. Confirm the new membership appears in `My memberships`.
6. Follow the asset link to verify the metadata JSON served from `/api/metadata/[assetId]`.

## 6. Files created during usage

The current implementation persists local data during web flows:

- `.solnft/indexer/read-model.json` stores clubs, campaigns, memberships, balances, and minted assets
- `.solnft/indexer/events.json` stores a simple append-only event history
- `.solnft/media/` stores uploaded campaign template images

If you want to reset these files during local development, use:

```bash
pnpm util:stop-all:local
```

or manually delete `.solnft/`.

## 7. Running tests

### Web unit tests

```bash
pnpm test:web:unit
```

Run a single web test file:

```bash
pnpm --filter @solnft/web test:unit -- src/lib/data/store.test.ts
pnpm --filter @solnft/web test:unit -- src/components/owner/OwnerCampaignCreateClient.test.tsx
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

- `403 owner_role_required` on `/owner`
  - Set the owner role from `/dev`, or use a wallet that owns a club in the current read model.

- `template_image_required` while creating a campaign
  - Upload or provide a template image URI before submitting.

- `mint_not_started` during purchase
  - The campaign uses `live_event` mint mode and the mint start timestamp is still in the future.

- Rust or Anchor commands fail
  - Install the Rust toolchain and Anchor CLI before running backend commands.

## 9. Current implementation boundaries

- The storefront creates a synthetic minted asset record and metadata endpoint; it is not yet a full marketplace-grade on-chain NFT mint pipeline.
- The web read model is file-backed local storage, not a shared external database.
- The indexer service is still a scaffold and does not yet provide a full ingestion/persistence stack.
