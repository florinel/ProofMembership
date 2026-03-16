# SolNFT

SolNFT is a monorepo for a Solana membership platform. It combines:

- an Anchor program in `programs/membership_core` for platform setup, club creation, campaign creation, and SOL/USDC membership purchases
- a Next.js web app in `apps/web` with admin, owner, storefront, and dev-role flows
- shared TypeScript contracts in `packages/types` and a small client wrapper in `packages/sdk`
- a lightweight indexer scaffold in `services/indexer`
- file-backed local persistence under `.solnft/` for the current web read model, event log, and uploaded media

## Repository structure

- `apps/web` - Next.js 15 App Router application
- `packages/types` - shared domain types for clubs, campaigns, memberships, assets, and auth-facing data
- `packages/sdk` - fetch-based client for the web/API surface
- `programs/membership_core` - Anchor program with SOL and USDC purchase instructions
- `services/indexer` - event-normalization scaffold
- `scripts` - local stack helper scripts
- `tests/integration` - manual integration checklists
- `USER_MANUAL.md` - operator/user workflow guide
- `DEVNET_TESTING.md` - devnet deployment and verification runbook
- `.github/copilot-instructions.md` - repository guidance for future Copilot sessions

## Prerequisites

For the web app and workspace:

- Node 20+
- pnpm 9+

For the Anchor program and backend tests:

- Rust toolchain
- Solana CLI
- Anchor CLI

## Installation

From the repository root:

```bash
pnpm install
```

## Common commands

### Web app

```bash
pnpm dev:web
pnpm build:web
pnpm lint:web
```

### Tests

```bash
pnpm test:web:unit
pnpm test:backend:unit
anchor test --provider.cluster localnet
```

Run a single web test file:

```bash
pnpm --filter @solnft/web test:unit -- src/lib/data/store.test.ts
pnpm --filter @solnft/web test:unit -- src/components/owner/OwnerCampaignCreateClient.test.tsx
```

Run a single Rust test:

```bash
cargo test --manifest-path programs/membership_core/Cargo.toml split_handles_typical_fee
```

### Local stack helpers

```bash
pnpm util:clean-start:local
pnpm util:stop-all:local
pnpm util:watch:changelog
pnpm --filter @solnft/indexer dev
```

Use these scripts when you want to reset and restart the whole local stack cleanly:

- `pnpm util:clean-start:local` stops any existing local SolNFT processes, clears the persisted local read model, starts `solana-test-validator`, builds and deploys the Anchor program to localnet, then launches the indexer scaffold and web app.
- `pnpm util:clean-start:local` also starts the local changelog watcher, which keeps the `## Unreleased` development activity section in `CHANGELOG.md` updated as watched files change.
- `pnpm util:stop-all:local` stops the local validator, indexer, and web app processes and removes the generated local indexer state under `.solnft/indexer`.
- `pnpm util:watch:changelog` runs the watcher by itself if you want changelog monitoring without starting the rest of the local stack.

## Current architecture

### Web app

`apps/web` is a role-based Next.js App Router application with these primary routes:

- `/admin` - admin overview, platform initialization, club creation, and club drill-down
- `/owner` - owner dashboard with campaign overview
- `/owner/campaigns/new` - owner campaign creation flow
- `/storefront` - browse campaigns, purchase memberships, and view purchased assets
- `/dev` - non-production role switcher for route-gated UI work

The app also exposes API routes for:

- admin actions: `/api/admin/platform/init`, `/api/admin/clubs`, `/api/admin/overview`
- owner actions: `/api/owner/campaigns`, `/api/owner/template-upload`
- public reads: `/api/clubs`, `/api/clubs/[clubId]`, `/api/clubs/[clubId]/campaigns`, `/api/memberships/[wallet]`
- storefront/media reads: `/api/storefront/purchase`, `/api/metadata/[assetId]`, `/api/media/[mediaId]`
- auth: `/api/auth/challenge`, `/api/auth/verify`, `/api/auth/logout`, `/api/auth/dev-role`

### Local read model and media storage

The current web implementation uses local persisted files instead of a database:

- `.solnft/indexer/read-model.json` - clubs, campaigns, memberships, config, assets, and ledger snapshot
- `.solnft/indexer/events.json` - append-only event log used as a simple indexer projection trail
- `.solnft/media/` - uploaded campaign template images and metadata sidecars

This keeps the flows testable end to end without requiring a separate database while the indexer layer is still being built out.

### Shared packages

- `packages/types` defines the shared contracts for `Club`, `Campaign`, `Membership`, minted asset metadata, roles, payment tokens, and mint modes.
- `packages/sdk` wraps the API surface with a `PlatformClient` so callers do not duplicate fetch paths.

### Anchor program

`programs/membership_core` holds the on-chain model:

- `initialize_platform` stores treasury, USDC mint, fee configuration, and authority
- `create_club` collects the platform club-creation fee and creates a club PDA
- `create_campaign` collects the campaign-creation fee and creates a campaign PDA
- `purchase_membership` handles SOL purchases with platform/owner fee splitting
- `purchase_membership_usdc` handles USDC purchases with SPL token transfers

The payment split logic is centralized in `src/utils.rs`, and successful state transitions emit events from `src/events.rs`.

## Current product flow

1. Admin initializes platform fees and treasury configuration.
2. Admin creates a club for an owner once the club fee is paid.
3. Owner uploads a campaign template image and creates a campaign.
4. Storefront users browse active campaigns and purchase memberships.
5. The purchase flow records a membership plus a synthetic minted-asset record with metadata served from `/api/metadata/[assetId]`.

## Auth and role model

Two auth paths exist today:

- development cookie role switching through `/dev` and `/api/auth/dev-role`
- wallet challenge + signature verification through `/api/auth/challenge` and `/api/auth/verify`, which issues a signed session cookie

Role resolution currently works like this:

- admin wallets come from `SOLNFT_ADMIN_WALLETS`
- owner role is inferred from club ownership in the local read model
- member role is inferred from non-revoked memberships in the local read model

## Testing coverage

### Web unit tests

The current Vitest suite covers:

- `src/lib/data/store.test.ts` for platform initialization, fee collection, campaign creation, live mint gating, and purchase lifecycle
- `src/components/owner/OwnerCampaignCreateClient.test.tsx` for owner campaign form behavior

### Backend tests

The Rust test suite in `programs/membership_core/src/utils.rs` covers fee-split math and guard conditions for basis-point handling.

## Related docs

- `USER_MANUAL.md` for the day-to-day product workflow
- `DEVNET_TESTING.md` for deploying and validating the stack on devnet
- `tests/integration/*.md` for scenario-specific manual verification checklists
- `.github/copilot-instructions.md` for repository-specific Copilot guidance
