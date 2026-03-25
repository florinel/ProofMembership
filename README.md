# SolNFT

SolNFT is a club membership contract and web platform built on Solana.

It is designed for sports clubs and communities such as golf clubs, tennis clubs, and similar membership organizations.

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

Run tests:

```bash
pnpm test:web:unit
pnpm test:backend:unit
```

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

- .solnft/indexer/read-model.json
- .solnft/indexer/events.json
- .solnft/media/

## Notes

- Payment token in the current web flow is SOL.
- Membership purchases create both a membership record and a synthetic membership asset metadata record.
