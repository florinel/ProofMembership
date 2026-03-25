# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

<!-- AUTO-CHANGELOG-START -->
### Development Activity

_Auto-generated from the local changelog watcher. Curated release notes should stay in the sections above._

- 2026-03-25 19:32:54.762 UTC - Updated `apps/web/src/lib/data/store.ts`
- 2026-03-25 19:32:54.761 UTC - Updated `apps/web/.env.local`
- 2026-03-25 19:32:21.382 UTC - Updated `tests/integration/payments_sol_usdc.md`
- 2026-03-25 19:32:21.382 UTC - Updated `tests/integration/club_campaign_lifecycle.md`
- 2026-03-25 19:32:21.382 UTC - Updated `scripts/stop-devnet.sh`
- 2026-03-25 19:32:21.382 UTC - Updated `scripts/stop-all-local.sh`
- 2026-03-25 19:32:21.382 UTC - Updated `scripts/start-devnet.sh`
- 2026-03-25 19:32:21.382 UTC - Updated `scripts/deploy-devnet.sh`
- 2026-03-25 19:32:21.382 UTC - Updated `scripts/clean-start-local.sh`
- 2026-03-25 19:32:21.382 UTC - Updated `scripts/changelog-watch.mjs`
- 2026-03-25 19:32:21.382 UTC - Updated `services/indexer/src/webhooks.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `services/indexer/package.json`
- 2026-03-25 19:32:21.382 UTC - Updated `programs/membership_core/Cargo.toml`
- 2026-03-25 19:32:21.382 UTC - Updated `packages/types/src/index.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `packages/types/package.json`
- 2026-03-25 19:32:21.382 UTC - Updated `packages/sdk/src/index.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `packages/sdk/package.json`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/vitest.setup.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/vitest.config.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/tsconfig.json`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/lib/types/solana.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/lib/media/mediaStore.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/lib/media/mediaStore.test.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/lib/data/store.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/lib/data/store.test.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/lib/data/mock.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/lib/chain/purchase.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/lib/chain/purchase.test.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/lib/auth/walletChallenge.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/lib/auth/token.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/lib/auth/session.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/lib/auth/roles.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/lib/auth/roleResolver.ts`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/components/storefront/StorefrontFlowClient.tsx`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/components/owner/OwnerOnboardingClient.tsx`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/components/owner/OwnerCampaignCreateClient.tsx`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/components/owner/OwnerCampaignCreateClient.test.tsx`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/components/auth/WalletConnectClient.tsx`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/components/admin/AdminFlowClient.tsx`
- 2026-03-25 19:32:21.382 UTC - Updated `apps/web/src/components/ThemeToggle.tsx`
<!-- AUTO-CHANGELOG-END -->

### Improvements

- Refreshed the repository documentation to match the current product state, including the role-based web app, wallet-auth flow, local read-model storage, media upload flow, and SOL purchase paths.
- Expanded the main README with clearer setup, architecture, test commands, single-test examples, and local stack helper usage.
- Added clearer operator guidance in `USER_MANUAL.md` and `DEVNET_TESTING.md`, including clean start/stop scripts and end-to-end validation steps.
- Updated `.github/copilot-instructions.md` so future Copilot sessions use the current repository structure, commands, and architectural conventions.
- Reworked the manual integration plans in `tests/integration` into fuller scenario checklists for campaign lifecycle and payment validation.
- Added a local changelog watcher plus start/stop script integration so `CHANGELOG.md` can track ongoing filesystem activity during development.

### Bug Fixes

- Fixed wallet challenge response typing in the web auth client so `pnpm build:web` succeeds with the current API response shape.
- Fixed owner campaign form test execution by restoring the React import expected by the component test environment.
- Updated mock campaign data to include the current `templateImageUri`, `mintMode`, and `mintStartsAtUnix` fields required by the shared `Campaign` type.

### Documentation

- Added targeted code comments in the local read-model, auth middleware, owner campaign flow, and Anchor payment utilities to explain the non-obvious behavior behind session precedence, file-backed persistence, and fee splitting.
