# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

<!-- AUTO-CHANGELOG-START -->
### Development Activity

_Auto-generated from the local changelog watcher. Curated release notes should stay in the sections above._

- 2026-03-26 02:13:29.390 UTC - Updated `apps/web/src/lib/data/store.ts`
- 2026-03-26 02:13:29.390 UTC - Updated `apps/web/src/components/owner/OwnerOnboardingClient.tsx`
- 2026-03-26 02:13:29.390 UTC - Updated `apps/web/src/components/owner/OwnerOnboardingClient.test.tsx`
- 2026-03-26 02:13:29.390 UTC - Updated `apps/web/src/components/admin/AdminFlowClient.tsx`
- 2026-03-26 02:13:29.390 UTC - Updated `apps/web/src/app/api/owner-applications/route.test.ts`
- 2026-03-26 02:13:29.390 UTC - Updated `apps/web/src/app/api/admin/owner-applications/[applicationId]/approve/route.test.ts`
- 2026-03-26 02:13:17.388 UTC - Updated `apps/web/src/lib/data/store.ts`
- 2026-03-26 02:13:17.388 UTC - Updated `apps/web/src/components/owner/OwnerOnboardingClient.tsx`
- 2026-03-26 02:13:17.388 UTC - Updated `apps/web/src/components/owner/OwnerOnboardingClient.test.tsx`
- 2026-03-26 02:13:17.388 UTC - Updated `apps/web/src/components/admin/AdminFlowClient.tsx`
- 2026-03-26 02:13:17.388 UTC - Updated `apps/web/src/app/api/owner-applications/route.test.ts`
- 2026-03-26 02:13:17.388 UTC - Updated `apps/web/src/app/api/admin/owner-applications/[applicationId]/approve/route.test.ts`
- 2026-03-26 02:07:26.801 UTC - Updated `apps/web/src/lib/data/store.ts`
- 2026-03-26 02:07:26.801 UTC - Updated `apps/web/src/lib/data/store.test.ts`
- 2026-03-26 02:07:26.801 UTC - Updated `apps/web/src/components/owner/OwnerOnboardingClient.tsx`
- 2026-03-26 02:07:26.801 UTC - Updated `apps/web/src/components/owner/OwnerOnboardingClient.test.tsx`
- 2026-03-26 02:07:26.801 UTC - Updated `apps/web/src/components/admin/AdminFlowClient.tsx`
- 2026-03-26 02:07:26.801 UTC - Updated `apps/web/src/app/api/owner-applications/route.test.ts`
- 2026-03-26 02:07:26.801 UTC - Updated `apps/web/src/app/api/admin/owner-applications/[applicationId]/approve/route.test.ts`
- 2026-03-26 02:07:26.801 UTC - Updated `DEVNET_TESTING.md`
- 2026-03-26 02:07:26.801 UTC - Updated `USER_MANUAL.md`
- 2026-03-26 02:05:48.821 UTC - Updated `DEVNET_TESTING.md`
- 2026-03-26 02:05:48.821 UTC - Updated `USER_MANUAL.md`
- 2026-03-26 02:05:14.643 UTC - Updated `apps/web/src/lib/data/store.test.ts`
- 2026-03-26 02:05:04.401 UTC - Updated `apps/web/src/components/owner/OwnerOnboardingClient.test.tsx`
- 2026-03-26 02:04:58.402 UTC - Updated `apps/web/src/app/api/admin/owner-applications/[applicationId]/approve/route.test.ts`
- 2026-03-26 02:04:48.398 UTC - Updated `apps/web/src/app/api/owner-applications/route.test.ts`
- 2026-03-26 02:04:26.161 UTC - Updated `apps/web/src/components/admin/AdminFlowClient.tsx`
- 2026-03-26 02:04:20.159 UTC - Updated `apps/web/src/components/owner/OwnerOnboardingClient.tsx`
- 2026-03-26 02:04:12.157 UTC - Updated `apps/web/src/lib/data/store.ts`
- 2026-03-26 02:03:19.545 UTC - Updated `apps/web/src/lib/data/store.ts`
- 2026-03-26 02:03:19.545 UTC - Updated `apps/web/src/components/admin/AdminFlowClient.tsx`
- 2026-03-26 02:03:19.545 UTC - Updated `apps/web/src/app/api/admin/owner-applications/[applicationId]/approve/route.ts`
- 2026-03-26 02:03:19.545 UTC - Updated `apps/web/src/app/api/admin/owner-applications/[applicationId]/approve/route.test.ts`
- 2026-03-26 02:03:19.545 UTC - Updated `DEVNET_TESTING.md`
- 2026-03-26 02:03:19.545 UTC - Updated `USER_MANUAL.md`
- 2026-03-26 01:57:10.549 UTC - Updated `DEVNET_TESTING.md`
- 2026-03-26 01:57:10.549 UTC - Updated `USER_MANUAL.md`
- 2026-03-26 01:55:52.857 UTC - Created `apps/web/src/app/api/admin/owner-applications/[applicationId]/approve/route.test.ts`
- 2026-03-26 01:55:44.857 UTC - Updated `apps/web/src/app/api/admin/owner-applications/[applicationId]/approve/route.ts`
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
