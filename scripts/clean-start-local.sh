#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "[1/11] Stopping local processes (if running)..."
pkill -f solana-test-validator || true
pkill -f "pnpm --filter @solnft/indexer dev" || true
pkill -f "pnpm dev:web" || true
pkill -f "next dev" || true
if [ -f .solnft/changelog-watch.pid ]; then
  kill "$(cat .solnft/changelog-watch.pid)" >/dev/null 2>&1 || true
  rm -f .solnft/changelog-watch.pid
fi

echo "[2/11] Resetting persisted read-model data..."
rm -rf .solnft/indexer
rm -rf apps/web/.solnft/indexer
mkdir -p .solnft/indexer
printf '%s' '[]' > .solnft/indexer/events.json

echo "[3/11] Preparing deploy output folder..."
mkdir -p target/deploy
rm -f target/deploy/membership_core.so

echo "[4/11] Starting local validator..."
nohup solana-test-validator -r > /tmp/solana-test-validator.log 2>&1 &

echo "Waiting for validator RPC on 127.0.0.1:8899..."
for _ in $(seq 1 20); do
  if solana cluster-version --url http://127.0.0.1:8899 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! solana cluster-version --url http://127.0.0.1:8899 >/dev/null 2>&1; then
  echo "Local validator did not become ready."
  echo "Check: /tmp/solana-test-validator.log"
  tail -n 50 /tmp/solana-test-validator.log || true
  exit 1
fi

if ! solana config set --url http://127.0.0.1:8899 >/dev/null; then
  echo "Failed to set Solana URL to localnet."
  exit 1
fi

echo "[5/11] Building Anchor program..."
anchor build

echo "[6/11] Syncing program artifact to root target/deploy..."
if [ ! -f programs/membership_core/target/deploy/membership_core.so ]; then
  echo "Build artifact not found at programs/membership_core/target/deploy/membership_core.so"
  exit 1
fi
cp programs/membership_core/target/deploy/membership_core.so target/deploy/membership_core.so

echo "[7/11] Deploying program to localnet..."
anchor deploy --provider.cluster localnet

echo "[8/11] Starting indexer service..."
nohup pnpm --filter @solnft/indexer dev > /tmp/solnft-indexer.log 2>&1 &

echo "[9/11] Starting web app..."
nohup pnpm dev:web > /tmp/solnft-web.log 2>&1 &

echo "[10/11] Starting changelog watcher..."
mkdir -p .solnft
nohup node scripts/changelog-watch.mjs > /tmp/solnft-changelog-watch.log 2>&1 &
echo $! > .solnft/changelog-watch.pid

echo "[11/11] Done."
echo "Web:       http://localhost:3000"
echo "Validator: /tmp/solana-test-validator.log"
echo "Indexer:   /tmp/solnft-indexer.log"
echo "Web app:   /tmp/solnft-web.log"
echo "Changelog: /tmp/solnft-changelog-watch.log"
