# Copilot instructions for SolNFT

## Build, test, and lint commands

- Install dependencies from the repo root with `pnpm install`.
- Start the web app with `pnpm dev:web`.
- Build the web app with `pnpm build:web`.
- Lint the web app with `pnpm lint:web`.
- Run the web unit tests with `pnpm test:web:unit`.
- Run a single web test file with `pnpm --filter @solnft/web test:unit -- src/lib/data/store.test.ts` or `pnpm --filter @solnft/web test:unit -- src/components/owner/OwnerCampaignCreateClient.test.tsx`.
- Run backend Rust tests with `pnpm test:backend:unit`.
- Run a single Rust test with `cargo test --manifest-path programs/membership_core/Cargo.toml split_handles_typical_fee`.
- Run Anchor integration tests from the repo root with `anchor test --provider.cluster localnet`.
- Start the indexer scaffold with `pnpm --filter @solnft/indexer dev`.
- Start the full local stack with `pnpm util:clean-start:local` and stop/reset it with `pnpm util:stop-all:local`.

## High-level architecture

- This repository is split between a pnpm workspace and an Anchor program. The workspace covers `apps/*`, `packages/*`, and `services/*` through `pnpm-workspace.yaml`; the Solana program lives in `programs/membership_core` and is configured from the repo root by `Anchor.toml`.
- `apps/web` is the operational shell for the product. It uses Next.js App Router route groups for the role-specific surfaces: `src/app/(admin)`, `src/app/(owner)`, and `src/app/(storefront)`. `/dev` exists specifically to simulate non-production roles during UI work.
- The current web app is backed by a file-based local projection instead of a database. `apps/web/src/lib/data/store.ts` writes the read model to `.solnft/indexer/read-model.json`, mirrors transitions to `.solnft/indexer/events.json`, and creates synthetic membership asset metadata that is served through `/api/metadata/[assetId]`.
- Uploaded campaign artwork is stored under `.solnft/media`. `apps/web/src/lib/media/mediaStore.ts` persists the uploaded file plus a small JSON sidecar, and `/api/media/[mediaId]` serves that content back to the app.
- `packages/types` is the shared contract for roles, clubs, campaigns, memberships, mint modes, and minted asset metadata. `packages/sdk` is intentionally thin and wraps the existing API routes rather than introducing another domain model.
- `apps/web/tsconfig.json` maps `@solnft/types` and `@solnft/sdk` directly to workspace source files. When changing shared types, update the packages first and let the app compile against source.
- Auth is split into two tracks: a development-only role cookie for local UI work and a wallet-challenge flow that issues a signed session cookie. The server resolves role from `SOLNFT_ADMIN_WALLETS`, existing club ownership, and existing non-revoked memberships in the current read model.
- `programs/membership_core` follows a consistent Anchor layout: `lib.rs` dispatches entrypoints, `instructions/*.rs` contains one instruction per file, `state.rs` holds accounts/enums, `events.rs` defines emitted events, `error.rs` defines program errors, and `utils.rs` holds fee-splitting helpers.
- The on-chain lifecycle is: initialize platform -> create club -> create campaign -> purchase membership in SOL. The same concepts also appear in the web store, shared TypeScript types, user docs, and manual integration plans.

## Key conventions

- Treat the repository as one cross-layer product. When a business concept changes, update the Anchor state/instructions, shared types, SDK surface, web store/API handlers, and docs together.
- Keep role-specific UI inside the existing App Router groups. Do not flatten new admin/owner/storefront pages into unrelated routes.
- Reuse `@solnft/types` instead of creating local copies of campaign, membership, or asset metadata types in the web app.
- The file-backed read model in `apps/web/src/lib/data/store.ts` is the source of truth for current web behavior. If you add new fields or flows, update both persisted state and emitted local events.
- Campaign creation in the web layer requires a template image and a mint mode. `live_event` campaigns also use `mintStartsAtUnix`, and storefront purchase logic must respect that gate.
- Membership purchases in the web layer currently create both a `Membership` record and a synthetic `MintedMembershipAsset` record. Preserve that pairing when changing storefront or metadata behavior.
- Keep the Anchor program organized one instruction per file with a `Params` struct, an `Accounts` struct, and a `handler` function. `lib.rs` should remain a thin dispatcher.
- Follow the existing PDA seed scheme: platform uses `b"platform"`, clubs use `b"club" + owner + slug`, campaigns use `b"campaign" + club + name`, and memberships use `b"membership" + campaign + buyer + nft_mint`.
- Fee handling is centralized. Platform fee configuration lives in `PlatformConfig`, and purchase flows use the shared split calculation in `src/utils.rs`.
- When documenting or testing the system, use `USER_MANUAL.md`, `DEVNET_TESTING.md`, and `tests/integration/*.md` as the current scenario guides instead of reconstructing flows from memory.
