# SolNFT Devnet Testing Runbook

This runbook is for validating the current SolNFT stack on devnet. It covers the Anchor program, the web app, local projection files, and the wallet-auth endpoints that exist today.

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
avm install latest
avm use latest
anchor --version
```

### Node and pnpm

```bash
node -v
npm -v
corepack enable
corepack prepare pnpm@9.12.3 --activate
pnpm -v
```

## 2. Prepare wallets

Use separate wallets for:

- admin
- club owner
- member

Example setup:

```bash
mkdir -p ~/.config/solana/solnft
solana-keygen new --outfile ~/.config/solana/solnft/admin.json
solana-keygen new --outfile ~/.config/solana/solnft/owner.json
solana-keygen new --outfile ~/.config/solana/solnft/member.json
```

Print the addresses:

```bash
solana address -k ~/.config/solana/solnft/admin.json
solana address -k ~/.config/solana/solnft/owner.json
solana address -k ~/.config/solana/solnft/member.json
```

Switch to devnet and fund the wallets:

```bash
solana config set --url https://api.devnet.solana.com
solana balance -k ~/.config/solana/solnft/admin.json
solana balance -k ~/.config/solana/solnft/owner.json
solana balance -k ~/.config/solana/solnft/member.json
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
SOLNFT_AUTH_SECRET=replace_with_long_random_secret
SOLNFT_ADMIN_WALLETS=ADMIN_PUBKEY
SOLNFT_AUTH_DOMAIN=localhost
SOLNFT_AUTH_URI=http://localhost:3000
SOLNFT_CHAIN_ID=solana:devnet
```

Notes:

- `SOLNFT_AUTH_SECRET` signs the session JWT cookie.
- `SOLNFT_ADMIN_WALLETS` determines which verified wallets resolve to admin.
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
pnpm --filter @solnft/web test:unit -- src/lib/data/store.test.ts
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
pnpm --filter @solnft/indexer dev
```

In another terminal:

```bash
pnpm dev:web
```

The current indexer service is still a scaffold, but the web app also writes a local read model and event log under `.solnft/indexer/`.

## 9. Run the role and purchase flow

Open `http://localhost:3000`.

### Admin flow

1. Use `/dev` to set the admin role for local UI gating, or use the wallet-auth APIs to establish a signed session.
2. Open `/admin`.
3. Initialize the platform with club fee, campaign fee, and campaign fee BPS.
4. Create a club for the owner wallet.

### Owner flow

1. Switch to owner role.
2. Open `/owner/campaigns/new`.
3. Upload a template image or provide a template URI.
4. Create one SOL campaign and one USDC campaign.
5. Optionally create a `live_event` campaign to verify mint-start gating.

### Storefront flow

1. Open `/storefront`.
2. Purchase the SOL campaign as the member wallet.
3. Purchase the USDC campaign as the member wallet.
4. Confirm the new memberships appear in the table.
5. Open the linked `/api/metadata/[assetId]` response for at least one purchased membership.

## 10. Validate local projections and uploaded media

After create/purchase actions, inspect:

```bash
cat .solnft/indexer/read-model.json
cat .solnft/indexer/events.json
find .solnft/media -maxdepth 1 -type f | sort
```

Confirm:

- platform config and balances update after admin actions
- clubs and campaigns are persisted
- membership purchases append memberships and assets
- event log receives `platform_initialized`, `club_created`, `campaign_created`, and `membership_purchased`
- uploaded template media exists in `.solnft/media`

## 11. Validate chain-side effects

For each on-chain transaction, verify:

```bash
solana confirm -v TX_SIGNATURE
solana balance PLATFORM_TREASURY_PUBKEY
solana balance OWNER_TREASURY_PUBKEY
```

For USDC purchases, also verify the SPL token accounts used for:

- buyer payment account
- owner payment account
- platform payment account

The USDC instruction expects all three token accounts to use the `usdc_mint` stored in `PlatformConfig`.

## 12. Negative tests

Run these intentionally:

- visit `/admin` without admin role and confirm the route is blocked
- visit `/owner` without owner role and confirm the route is blocked
- call `/api/admin/*` or `/api/owner/*` without the required role and confirm `403`
- submit campaign creation without a template image and confirm `template_image_required`
- purchase a future `live_event` campaign before its start time and confirm `mint_not_started`
- submit invalid wallet challenge/verify data and confirm auth rejection
- use the wrong treasury or wrong token accounts on-chain and confirm the transaction fails

## 13. Signoff checklist

- program builds and deploys to devnet
- admin, owner, and member wallets are funded
- platform initialization succeeds
- club creation succeeds
- one SOL campaign and one USDC campaign are created
- at least one membership is purchased successfully
- metadata is served from `/api/metadata/[assetId]`
- `.solnft/indexer/read-model.json` and `.solnft/indexer/events.json` reflect the actions
- negative checks above behave as expected
