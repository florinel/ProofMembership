#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "Stopping devnet app processes..."
pkill -f "pnpm --filter @proofmembership/indexer dev" || true
pkill -f "pnpm dev:web" || true
pkill -f "next dev" || true
if [ -f .proofmembership/changelog-watch.pid ]; then
  kill "$(cat .proofmembership/changelog-watch.pid)" >/dev/null 2>&1 || true
  rm -f .proofmembership/changelog-watch.pid
fi

echo "Stopped (or already not running):"
echo "- indexer dev process"
echo "- web dev process"
echo "- changelog watcher"

echo "No localnet validator or persisted .proofmembership/indexer data was deleted."
echo "Tip: check /tmp/proofmembership-indexer-devnet.log, /tmp/proofmembership-web-devnet.log, /tmp/proofmembership-changelog-watch-devnet.log"
