#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "Stopping local SolNFT processes..."
pkill -f solana-test-validator || true
pkill -f "pnpm --filter @solnft/indexer dev" || true
pkill -f "pnpm dev:web" || true
pkill -f "next dev" || true
if [ -f .solnft/changelog-watch.pid ]; then
  kill "$(cat .solnft/changelog-watch.pid)" >/dev/null 2>&1 || true
  rm -f .solnft/changelog-watch.pid
fi

rm -rf .solnft/indexer || true
rm -rf apps/web/.solnft/indexer || true

echo "Stopped (or already not running):"
echo "- solana-test-validator"
echo "- indexer dev process"
echo "- web dev process"
echo "- changelog watcher"

echo "Tip: If background logs remain, check /tmp/solana-test-validator.log, /tmp/solnft-indexer.log, /tmp/solnft-web.log, /tmp/solnft-changelog-watch.log"
