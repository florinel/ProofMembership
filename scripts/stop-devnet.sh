#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "Stopping devnet app processes..."
pkill -f "pnpm --filter @solnft/indexer dev" || true
pkill -f "pnpm dev:web" || true
pkill -f "next dev" || true
if [ -f .solnft/changelog-watch.pid ]; then
  kill "$(cat .solnft/changelog-watch.pid)" >/dev/null 2>&1 || true
  rm -f .solnft/changelog-watch.pid
fi

echo "Stopped (or already not running):"
echo "- indexer dev process"
echo "- web dev process"
echo "- changelog watcher"

echo "No localnet validator or persisted .solnft/indexer data was deleted."
echo "Tip: check /tmp/solnft-indexer-devnet.log, /tmp/solnft-web-devnet.log, /tmp/solnft-changelog-watch-devnet.log"
