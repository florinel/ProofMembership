# ProofMembership

ProofMembership is a club membership contract and web platform built on Solana.

It is designed for membership communities such as sports membership clubs, rotary clubs, event communities, fan groups, and other subscription-based organizations.

## What it does

1. A club owner signs up and submits a club ownership application with a description.
2. An admin reviews the application, approves it, charges an onboarding fee, and marks the wallet as an approved owner.
3. The approved owner connects and can create one or more clubs.
4. On each club creation, the configured club fee is paid to the platform account.
5. The owner creates membership campaigns for each club.
6. Members purchase campaigns in SOL, and the platform and owner fee split is applied.

## Repository layout

- apps/web: Next.js app with admin, owner, storefront, and API routes
- programs/membership_core: Anchor contract for platform, club, campaign, and membership logic
- packages/types: shared domain types
- packages/sdk: thin fetch client
- services/indexer: local indexer scaffold

## Quick start

Install dependencies:

```bash
pnpm install
```

Run web app:

```bash
pnpm dev:web
```

Optional media storage configuration for campaign template uploads:

- `PROOFMEMBERSHIP_MEDIA_PROVIDER=local|arweave` (default: `local`)
- `PROOFMEMBERSHIP_ARWEAVE_UPLOAD_URL=https://...` (required when provider is `arweave`)
- `PROOFMEMBERSHIP_ARWEAVE_API_KEY=...` (optional bearer token header for your uploader)

When `PROOFMEMBERSHIP_MEDIA_PROVIDER=arweave`, `/api/owner/template-upload` will send the image to your configured uploader endpoint and store the returned permanent URI as the campaign template image URI.

Optional purchase mode configuration:

- `PROOFMEMBERSHIP_PURCHASE_MODE=local|onchain` (default: `local`)

When using `PROOFMEMBERSHIP_PURCHASE_MODE=onchain`, configure:

- `PROOFMEMBERSHIP_RPC_URL=https://...`
- `PROOFMEMBERSHIP_PROGRAM_ID=...`
- `PROOFMEMBERSHIP_PLATFORM_TREASURY=...`

On-chain purchase mode also requires campaign-to-onchain account mapping (`campaign.onchainAddress`) in the read model.
Use the admin panel section `Map Campaign Onchain Address` to set this mapping.

`onchain` mode now builds and submits a real Anchor `purchase_membership` transaction from the storefront wallet.
After confirmation, the web app calls `/api/storefront/purchase/confirm`, which verifies the transaction over RPC before projecting the membership into the local read model.

Run tests:

```bash
pnpm test:web:unit
pnpm test:backend:unit
```

Backend automation scope:

- Rust unit tests are the current automated backend coverage.
- `tests/integration/*.md` are manual scenario checklists.

Start and stop the full local stack:

```bash
pnpm util:clean-start:local
pnpm util:stop-all:local
```

## Key routes

- /admin: platform setup, owner application review (approve with fee charge or reject), fee policy controls
- /owner: public owner application plus owner management after approval
- /owner/campaigns/new: campaign creation flow for approved owners
- /storefront: member purchase flow

## Local data files

- .proofmembership/indexer/read-model.json
- .proofmembership/indexer/events.json
- .proofmembership/media/

## Notes

- Payment token in the current web flow is SOL.
- The Anchor `purchase_membership` instruction now mints a real SPL NFT (mint + associated token account + mint_to) and records the mint address in membership state.
- In `PROOFMEMBERSHIP_PURCHASE_MODE=onchain`, the storefront builds/signs the Anchor purchase instruction and confirmation is validated from RPC before read-model projection.
- The projected storefront membership record remains a local read-model projection (`provenance: onchain`) until a full indexer ingestion pipeline is wired.
