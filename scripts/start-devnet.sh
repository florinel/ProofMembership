#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "[1/5] Stopping existing web/indexer/changelog processes (if running)..."
pkill -f "pnpm --filter @proofmembership/indexer dev" || true
pkill -f "pnpm dev:web" || true
pkill -f "next dev" || true
if [ -f .proofmembership/changelog-watch.pid ]; then
  kill "$(cat .proofmembership/changelog-watch.pid)" >/dev/null 2>&1 || true
  rm -f .proofmembership/changelog-watch.pid
fi

echo "[2/5] Ensuring Solana CLI points to devnet..."
solana config set --url https://api.devnet.solana.com >/dev/null

echo "[3/5] Starting indexer service..."
nohup pnpm --filter @proofmembership/indexer dev > /tmp/proofmembership-indexer-devnet.log 2>&1 &

echo "[4/5] Starting web app..."
nohup pnpm dev:web > /tmp/proofmembership-web-devnet.log 2>&1 &

echo "[5/5] Starting changelog watcher..."
mkdir -p .proofmembership
nohup node scripts/changelog-watch.mjs > /tmp/proofmembership-changelog-watch-devnet.log 2>&1 &
echo $! > .proofmembership/changelog-watch.pid

echo "Done."
echo "Web:       http://localhost:3000"
echo "Cluster:   https://api.devnet.solana.com"
echo "Indexer:   /tmp/proofmembership-indexer-devnet.log"
echo "Web app:   /tmp/proofmembership-web-devnet.log"
echo "Changelog: /tmp/proofmembership-changelog-watch-devnet.log"
