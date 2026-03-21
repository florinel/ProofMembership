#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "[1/5] Stopping existing web/indexer/changelog processes (if running)..."
pkill -f "pnpm --filter @solnft/indexer dev" || true
pkill -f "pnpm dev:web" || true
pkill -f "next dev" || true
if [ -f .solnft/changelog-watch.pid ]; then
  kill "$(cat .solnft/changelog-watch.pid)" >/dev/null 2>&1 || true
  rm -f .solnft/changelog-watch.pid
fi

echo "[2/5] Ensuring Solana CLI points to devnet..."
solana config set --url https://api.devnet.solana.com >/dev/null

echo "[3/5] Starting indexer service..."
nohup pnpm --filter @solnft/indexer dev > /tmp/solnft-indexer-devnet.log 2>&1 &

echo "[4/5] Starting web app..."
nohup pnpm dev:web > /tmp/solnft-web-devnet.log 2>&1 &

echo "[5/5] Starting changelog watcher..."
mkdir -p .solnft
nohup node scripts/changelog-watch.mjs > /tmp/solnft-changelog-watch-devnet.log 2>&1 &
echo $! > .solnft/changelog-watch.pid

echo "Done."
echo "Web:       http://localhost:3000"
echo "Cluster:   https://api.devnet.solana.com"
echo "Indexer:   /tmp/solnft-indexer-devnet.log"
echo "Web app:   /tmp/solnft-web-devnet.log"
echo "Changelog: /tmp/solnft-changelog-watch-devnet.log"
