# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

<!-- AUTO-CHANGELOG-START -->
### Development Activity

_Auto-generated from the local changelog watcher. Curated release notes should stay in the sections above._

- 2026-03-25 23:49:20.724 UTC - Updated `scripts/start-devnet.sh`
- 2026-03-25 23:49:20.724 UTC - Updated `scripts/devnet-console.sh`
- 2026-03-25 23:49:20.724 UTC - Updated `.github/copilot-instructions.md`
- 2026-03-25 23:49:20.724 UTC - Updated `package.json`
- 2026-03-25 23:49:20.724 UTC - Updated `DEVNET_TESTING.md`
- 2026-03-25 23:49:20.724 UTC - Updated `README.md`
- 2026-03-25 23:47:11.941 UTC - Updated `.github/copilot-instructions.md`
- 2026-03-25 23:47:11.941 UTC - Updated `DEVNET_TESTING.md`
- 2026-03-25 23:47:11.941 UTC - Updated `README.md`
- 2026-03-25 23:47:01.710 UTC - Created `scripts/devnet-console.sh`
- 2026-03-25 23:46:59.709 UTC - Updated `scripts/start-devnet.sh`
- 2026-03-25 23:46:59.709 UTC - Updated `package.json`
- 2026-03-25 23:44:55.028 UTC - Updated `package.json`
- 2026-03-25 23:44:55.028 UTC - Updated `DEVNET_TESTING.md`
- 2026-03-25 23:37:26.126 UTC - Updated `package.json`
- 2026-03-25 23:37:26.126 UTC - Updated `DEVNET_TESTING.md`
- 2026-03-25 22:44:37.207 UTC - Updated `programs/membership_core/src/utils.rs`
- 2026-03-25 22:44:37.207 UTC - Updated `programs/membership_core/src/state.rs`
- 2026-03-25 22:44:37.207 UTC - Updated `programs/membership_core/src/lib.rs`
- 2026-03-25 22:44:37.207 UTC - Updated `programs/membership_core/src/instructions/set_club_fee_policy.rs`
- 2026-03-25 22:44:37.207 UTC - Updated `programs/membership_core/src/instructions/purchase_membership.rs`
- 2026-03-25 22:44:37.207 UTC - Updated `programs/membership_core/src/instructions/initialize_platform.rs`
- 2026-03-25 22:44:37.207 UTC - Updated `programs/membership_core/src/instructions/create_club.rs`
- 2026-03-25 22:44:37.207 UTC - Updated `programs/membership_core/src/instructions/create_campaign.rs`
- 2026-03-25 22:44:37.207 UTC - Updated `apps/web/src/lib/media/mediaStore.ts`
- 2026-03-25 22:44:37.207 UTC - Updated `apps/web/src/lib/data/store.ts`
- 2026-03-25 22:44:37.207 UTC - Updated `apps/web/src/lib/chain/purchase.ts`
- 2026-03-25 22:44:37.207 UTC - Updated `apps/web/src/lib/auth/walletChallenge.ts`
- 2026-03-25 22:44:37.207 UTC - Updated `apps/web/src/lib/auth/token.ts`
- 2026-03-25 22:44:37.207 UTC - Updated `apps/web/src/lib/auth/session.ts`
- 2026-03-25 22:44:37.207 UTC - Updated `apps/web/src/lib/auth/roleResolver.ts`
- 2026-03-25 22:44:37.207 UTC - Updated `apps/web/src/app/api/storefront/purchase/route.ts`
- 2026-03-25 22:44:37.207 UTC - Updated `apps/web/src/app/api/storefront/purchase/confirm/route.ts`
- 2026-03-25 22:44:37.206 UTC - Updated `README.md`
- 2026-03-25 22:43:42.904 UTC - Updated `apps/web/src/app/api/storefront/purchase/route.ts`
- 2026-03-25 22:43:36.901 UTC - Updated `apps/web/src/lib/auth/session.ts`
- 2026-03-25 22:43:26.900 UTC - Updated `README.md`
- 2026-03-25 22:43:22.899 UTC - Updated `programs/membership_core/src/utils.rs`
- 2026-03-25 22:43:18.899 UTC - Updated `programs/membership_core/src/instructions/purchase_membership.rs`
- 2026-03-25 22:43:12.898 UTC - Updated `programs/membership_core/src/instructions/set_club_fee_policy.rs`
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
