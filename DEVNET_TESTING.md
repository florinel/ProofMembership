# ProofMembership Devnet Testing Runbook

This runbook is for validating the current ProofMembership stack on devnet. It covers the Anchor program, the web app, local projection files, and the wallet-auth endpoints that exist today.

## 1. Install tooling

Install these in a Linux or WSL shell:

```bash
sudo apt update
sudo apt install -y build-essential pkg-config libssl-dev git curl
```

### Rust

```bash
curl https://sh.rustup.rs -sSf | sh -s -- -y
source "$HOME/.cargo/env"
rustc --version
cargo --version
```

### Solana CLI

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana --version
```

### Anchor CLI

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.32.1
avm use 0.32.1
anchor --version
```

### Node and pnpm

```bash
node -v
npm -v
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm -v
```

## 2. Prepare wallets

Use separate wallets for:

- admin
- club owner
- member

Example setup:

```bash
mkdir -p ~/.config/solana/proofmembership
solana-keygen new --outfile ~/.config/solana/proofmembership/admin.json
solana-keygen new --outfile ~/.config/solana/proofmembership/owner.json
solana-keygen new --outfile ~/.config/solana/proofmembership/member.json
```

Print the addresses:

```bash
solana address -k ~/.config/solana/proofmembership/admin.json
solana address -k ~/.config/solana/proofmembership/owner.json
solana address -k ~/.config/solana/proofmembership/member.json
```

Switch to devnet and fund the wallets:

```bash
solana config set --url https://api.devnet.solana.com
solana balance -k ~/.config/solana/proofmembership/admin.json
solana balance -k ~/.config/solana/proofmembership/owner.json
solana balance -k ~/.config/solana/proofmembership/member.json
```

## 3. Install workspace dependencies

From the repo root:

```bash
cd /home/flow/dev/solnft
pnpm install
```

## 4. Configure web auth environment

Create `apps/web/.env.local`:

```bash
PROOFMEMBERSHIP_AUTH_SECRET=replace_with_long_random_secret
PROOFMEMBERSHIP_ADMIN_WALLETS=ADMIN_PUBKEY
PROOFMEMBERSHIP_AUTH_DOMAIN=localhost
PROOFMEMBERSHIP_AUTH_URI=http://localhost:3000
PROOFMEMBERSHIP_CHAIN_ID=solana:devnet
```

Notes:

- `PROOFMEMBERSHIP_AUTH_SECRET` signs the session JWT cookie.
- `PROOFMEMBERSHIP_ADMIN_WALLETS` determines which verified wallets resolve to admin.
- owner and member roles are inferred from the current read model.

## 5. Verify program ID configuration

The current program ID is configured in:

- `Anchor.toml`
- `programs/membership_core/src/lib.rs`

If you generate a new deploy keypair, update both files before deploy:

```bash
solana-keygen new --outfile ./target/deploy/membership_core-keypair.json
solana address -k ./target/deploy/membership_core-keypair.json
```

## 6. Run local validation before devnet deploy

These commands validate the parts of the stack that should already work locally:

```bash
pnpm lint:web
pnpm test:web:unit
pnpm test:backend:unit
pnpm build:web
```

Run a single targeted test if needed:

```bash
pnpm --filter @proofmembership/web test:unit -- src/lib/data/store.test.ts
cargo test --manifest-path programs/membership_core/Cargo.toml split_handles_typical_fee
```

## 7. Build and deploy to devnet

```bash
cd /home/flow/dev/solnft
anchor build
anchor deploy --provider.cluster devnet
```

Verify the deployed program:

```bash
solana program show 3Ne2f2pLbgpsWL3v9xCDy6VjKmoqHjbBtEJL3a6tMuCs
```

## 8. Start the services

In one terminal:

```bash
pnpm util:start:devnet
```

In another terminal, open the combined live log console:

```bash
pnpm util:console:devnet
```

If you want to run the services manually instead, use:

In one terminal:

```bash
pnpm --filter @proofmembership/indexer dev
```

In another terminal:

```bash
pnpm dev:web
```

The current indexer service is still a scaffold, but the web app also writes a local read model and event log under `.proofmembership/indexer/`.

The devnet console tails these files together:

- `/tmp/proofmembership-indexer-devnet.log`
- `/tmp/proofmembership-web-devnet.log`
- `/tmp/proofmembership-changelog-watch-devnet.log`

## 9. Run the role and purchase flow

Optional media storage mode for campaign template uploads:

- `PROOFMEMBERSHIP_MEDIA_PROVIDER=local|arweave` (default `local`)
- `PROOFMEMBERSHIP_ARWEAVE_UPLOAD_URL=https://...` (required for `arweave`)
- `PROOFMEMBERSHIP_ARWEAVE_API_KEY=...` (optional bearer token for uploader)

Optional storefront purchase mode:

- `PROOFMEMBERSHIP_PURCHASE_MODE=local|onchain` (default `local`)
- `PROOFMEMBERSHIP_RPC_URL=https://...` (required for `onchain`)
- `PROOFMEMBERSHIP_PROGRAM_ID=...` (required for `onchain`)
- `PROOFMEMBERSHIP_PLATFORM_TREASURY=...` (required for `onchain`)

Open `http://localhost:3000`.

### Admin flow

1. Use `/dev` to set the admin role for local UI gating, or use the wallet-auth APIs to establish a signed session.
2. Open `/admin`.
3. Initialize the platform with owner approval fee, club creation fee, campaign creation fee, default campaign fee BPS, and default minimum campaign fee.
4. Review a pending owner application.
5. Approve to settle onboarding fee using platform policy, or reject with review notes.

### Owner flow

1. Open `/owner/apply` and submit an ownership application with wallet + description.
2. Use `Check Status` on onboarding to monitor pending/approved/rejected state and settlement status.
3. Ask admin to approve the application.
4. After approval, sign in again and access owner-only management at `/owner` to create a club.
5. Open `/owner/campaigns/new`.
6. Upload a template image or provide a template URI.
7. Create one or more SOL campaigns.
8. Optionally create a `live_event` campaign to verify mint-start gating.

### Storefront flow

1. Open `/storefront`.
2. Purchase the SOL campaign as the member wallet.
3. In `onchain` mode, approve the wallet transaction for Anchor `purchase_membership`.
4. Confirm projection success after RPC-backed `/api/storefront/purchase/confirm` verification.
5. Confirm the new memberships appear in the table.
6. Open the linked `/api/metadata/[assetId]` response for at least one purchased membership.

## 10. Validate local projections and uploaded media

After create/purchase actions, inspect:

```bash
cat .proofmembership/indexer/read-model.json
cat .proofmembership/indexer/events.json
find .proofmembership/media -maxdepth 1 -type f | sort
```

Confirm:

- platform config and balances update after admin actions
- clubs and campaigns are persisted
- membership purchases append memberships and assets
- event log receives `platform_initialized`, `club_created`, `campaign_created`, and purchase events (`membership_purchased` for local mode and `membership_onchain_projected` for on-chain confirmed mode)
- uploaded template media exists in `.proofmembership/media`

## 11. Validate chain-side effects

For each on-chain transaction, verify:

```bash
solana confirm -v TX_SIGNATURE
solana balance PLATFORM_TREASURY_PUBKEY
solana balance OWNER_TREASURY_PUBKEY
```

For SOL purchases, verify platform and owner balances update according to configured fee policy.

## 12. Negative tests

Run these intentionally:

- visit `/admin` without admin role and confirm the route is blocked
- visit `/owner` without owner role and confirm access is blocked
- visit `/owner/apply` without owner role and confirm onboarding is available
- call `/api/admin/*` without the required role and confirm `403`
- call `/api/owner/*` (except `/api/owner-applications`) without owner role and confirm `403`
- submit campaign creation without a template image and confirm `template_image_required`
- purchase a future `live_event` campaign before its start time and confirm `mint_not_started`
- submit invalid wallet challenge/verify data and confirm auth rejection
- use the wrong treasury or wrong token accounts on-chain and confirm the transaction fails

## 13. Signoff checklist

- program builds and deploys to devnet
- admin, owner, and member wallets are funded
- platform initialization succeeds
- owner application review succeeds (approve and reject paths)
- club creation succeeds
- one or more SOL campaigns are created
- at least one membership is purchased successfully
- metadata is served from `/api/metadata/[assetId]`
- `.proofmembership/indexer/read-model.json` and `.proofmembership/indexer/events.json` reflect the actions
- negative checks above behave as expected
