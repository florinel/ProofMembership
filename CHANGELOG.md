# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

<!-- AUTO-CHANGELOG-START -->
### Development Activity

_Auto-generated from the local changelog watcher. Curated release notes should stay in the sections above._

- 2026-03-26 04:56:10.083 UTC - Updated `apps/web/src/lib/data/store.test.ts`
- 2026-03-26 04:43:00.539 UTC - Updated `apps/web/src/lib/data/store.test.ts`
- 2026-03-26 04:41:34.864 UTC - Updated `apps/web/src/lib/chain/purchase.test.ts`
- 2026-03-26 04:40:02.500 UTC - Updated `apps/web/src/lib/chain/purchase.test.ts`
- 2026-03-26 04:39:46.496 UTC - Updated `apps/web/src/lib/data/store.ts`
- 2026-03-26 04:39:01.137 UTC - Updated `apps/web/src/lib/data/store.ts`
- 2026-03-26 04:38:35.134 UTC - Updated `apps/web/src/lib/data/store.test.ts`
- 2026-03-26 03:56:24.556 UTC - Updated `apps/web/src/lib/data/store.test.ts`
- 2026-03-26 03:53:53.901 UTC - Updated `apps/web/src/app/(admin)/admin/page.test.tsx`
- 2026-03-26 03:53:53.901 UTC - Updated `apps/web/src/app/(admin)/admin/clubs/[clubId]/page.test.tsx`
- 2026-03-26 03:53:41.246 UTC - Updated `apps/web/src/app/(admin)/admin/page.test.tsx`
- 2026-03-26 03:53:41.246 UTC - Updated `apps/web/src/app/(admin)/admin/clubs/[clubId]/page.test.tsx`
- 2026-03-26 03:53:39.246 UTC - Updated `apps/web/src/app/(admin)/admin/page.test.tsx`
- 2026-03-26 03:53:39.246 UTC - Updated `apps/web/src/app/(admin)/admin/clubs/[clubId]/page.test.tsx`
- 2026-03-26 03:53:31.245 UTC - Updated `apps/web/src/app/(admin)/admin/page.test.tsx`
- 2026-03-26 03:53:31.245 UTC - Updated `apps/web/src/app/(admin)/admin/clubs/[clubId]/page.test.tsx`
- 2026-03-26 03:52:19.946 UTC - Updated `apps/web/src/app/(admin)/admin/page.tsx`
- 2026-03-26 03:52:19.946 UTC - Updated `apps/web/src/app/(admin)/admin/page.test.tsx`
- 2026-03-26 03:52:19.946 UTC - Updated `apps/web/src/app/(admin)/admin/clubs/[clubId]/page.tsx`
- 2026-03-26 03:51:59.097 UTC - Updated `apps/web/src/app/(admin)/admin/page.test.tsx`
- 2026-03-26 03:51:33.093 UTC - Updated `apps/web/src/app/(admin)/admin/page.tsx`
- 2026-03-26 03:51:33.093 UTC - Updated `apps/web/src/app/(admin)/admin/clubs/[clubId]/page.tsx`
- 2026-03-26 03:51:18.194 UTC - Updated `apps/web/src/app/(admin)/admin/page.test.tsx`
- 2026-03-26 03:51:18.194 UTC - Updated `apps/web/src/app/(admin)/admin/clubs/[clubId]/page.test.tsx`
- 2026-03-26 03:51:14.192 UTC - Updated `apps/web/src/app/(admin)/admin/page.test.tsx`
- 2026-03-26 03:51:14.192 UTC - Updated `apps/web/src/app/(admin)/admin/clubs/[clubId]/page.test.tsx`
- 2026-03-26 03:50:00.455 UTC - Updated `apps/web/src/app/(admin)/admin/page.test.tsx`
- 2026-03-26 03:50:00.455 UTC - Updated `apps/web/src/app/(admin)/admin/clubs/[clubId]/page.test.tsx`
- 2026-03-26 03:49:40.418 UTC - Updated `apps/web/src/app/(admin)/admin/page.test.tsx`
- 2026-03-26 03:49:40.418 UTC - Updated `apps/web/src/app/(admin)/admin/clubs/[clubId]/page.test.tsx`
- 2026-03-26 03:49:32.415 UTC - Updated `apps/web/src/app/(admin)/admin/page.test.tsx`
- 2026-03-26 03:49:32.415 UTC - Updated `apps/web/src/app/(admin)/admin/clubs/[clubId]/page.test.tsx`
- 2026-03-26 03:48:55.502 UTC - Updated `apps/web/src/app/(admin)/admin/page.test.tsx`
- 2026-03-26 03:48:55.502 UTC - Updated `apps/web/src/app/(admin)/admin/clubs/[clubId]/page.test.tsx`
- 2026-03-26 03:48:37.500 UTC - Updated `apps/web/src/lib/data/store.ts`
- 2026-03-26 03:48:37.500 UTC - Updated `apps/web/src/components/owner/OwnerCampaignCreateClient.test.tsx`
- 2026-03-26 03:48:37.500 UTC - Updated `apps/web/src/app/(admin)/admin/page.test.tsx`
- 2026-03-26 03:48:37.500 UTC - Updated `apps/web/src/app/(admin)/admin/clubs/[clubId]/page.test.tsx`
- 2026-03-26 03:48:20.611 UTC - Updated `apps/web/src/components/owner/OwnerCampaignCreateClient.test.tsx`
- 2026-03-26 03:48:20.611 UTC - Updated `apps/web/src/app/(admin)/admin/page.test.tsx`
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
