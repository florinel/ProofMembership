# SolNFT Local Testing Runbook

This runbook is for validating the current SolNFT stack on localnet. It covers the Anchor program, the web app, local projection files, and wallet-auth endpoints in a fully local setup.

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

## 2. Prepare local wallets

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

The local provider wallet defaults to the admin key in `Anchor.toml`.

## 3. Install workspace dependencies

From the repo root:

```bash
cd /home/flow/dev/solnft
pnpm install
```

## 4. Configure local web auth environment

Create `apps/web/.env.local`:

```bash
SOLNFT_AUTH_SECRET=replace_with_long_random_secret
SOLNFT_ADMIN_WALLETS=ADMIN_PUBKEY
SOLNFT_AUTH_DOMAIN=localhost
SOLNFT_AUTH_URI=http://localhost:3000
SOLNFT_CHAIN_ID=solana:localnet
```

Notes:

- `SOLNFT_AUTH_SECRET` signs the session JWT cookie.
- `SOLNFT_ADMIN_WALLETS` determines which verified wallets resolve to admin.
- owner and member roles are inferred from the current read model.

## 5. Verify localnet program and provider configuration

The current program ID is configured in:

- `Anchor.toml` (`[programs.localnet]`)
- `programs/membership_core/src/lib.rs`

The provider wallet defaults to:

- `~/.config/solana/solnft/admin.json`

If you generate a new deploy keypair, update both locations before deploy:

```bash
solana-keygen new --outfile ./target/deploy/membership_core-keypair.json
solana address -k ./target/deploy/membership_core-keypair.json
```

## 6. Run local validation before stack startup

These commands validate the parts of the stack that should already work:

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

## 7. Start the full local stack

From repo root, run:

```bash
pnpm util:clean-start:local
```

This script:

- stops existing local validator, indexer, web app, and changelog watcher processes
- clears `.solnft/indexer` and legacy `apps/web/.solnft/indexer`
- starts `solana-test-validator` on `127.0.0.1:8899`
- runs `anchor build`
- deploys with `anchor deploy --provider.cluster localnet`
- starts indexer scaffold and web app
- starts changelog watcher

Background logs are written to:

- `/tmp/solana-test-validator.log`
- `/tmp/solnft-indexer.log`
- `/tmp/solnft-web.log`
- `/tmp/solnft-changelog-watch.log`

Stop and clean local processes/state with:

```bash
pnpm util:stop-all:local
```

## 8. Run the role and purchase flow

Open `http://localhost:3000`.

### Admin flow

1. Use `/dev` to set the admin role for local UI gating, or use wallet-auth endpoints to establish a signed session.
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
4. Confirm new memberships appear in the table.
5. Open `/api/metadata/[assetId]` for at least one purchased membership.

## 9. Validate local projections and uploaded media

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

## 10. Validate localnet chain-side effects

For each on-chain transaction, verify:

```bash
solana confirm -v TX_SIGNATURE --url http://127.0.0.1:8899
solana balance PLATFORM_TREASURY_PUBKEY --url http://127.0.0.1:8899
solana balance OWNER_TREASURY_PUBKEY --url http://127.0.0.1:8899
```

For USDC purchases, also verify SPL token accounts used for:

- buyer payment account
- owner payment account
- platform payment account

The USDC instruction expects all three token accounts to use the `usdc_mint` stored in `PlatformConfig`.

## 11. Negative tests

Run these intentionally:

- visit `/admin` without admin role and confirm the route is blocked
- visit `/owner` without owner role and confirm the route is blocked
- call `/api/admin/*` or `/api/owner/*` without the required role and confirm `403`
- submit campaign creation without a template image and confirm `template_image_required`
- purchase a future `live_event` campaign before its start time and confirm `mint_not_started`
- submit invalid wallet challenge/verify data and confirm auth rejection
- use wrong treasury or wrong token accounts on-chain and confirm the transaction fails

## 12. Manual fallback (without helper script)

If `pnpm util:clean-start:local` fails, run the steps manually:

```bash
solana-test-validator -r
anchor build
anchor deploy --provider.cluster localnet
pnpm --filter @solnft/indexer dev
pnpm dev:web
```

Use separate terminals for each long-running process.

## 13. Signoff checklist

- local validator starts and is reachable on `127.0.0.1:8899`
- program builds and deploys to localnet
- admin, owner, and member wallets exist and can be used in flow testing
- platform initialization succeeds
- club creation succeeds
- one SOL campaign and one USDC campaign are created
- at least one membership is purchased successfully
- metadata is served from `/api/metadata/[assetId]`
- `.solnft/indexer/read-model.json` and `.solnft/indexer/events.json` reflect the actions
- negative checks above behave as expected
