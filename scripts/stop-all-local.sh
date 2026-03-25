#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "Stopping local ProofMembership processes..."
pkill -f solana-test-validator || true
pkill -f "pnpm --filter @proofmembership/indexer dev" || true
pkill -f "pnpm dev:web" || true
pkill -f "next dev" || true
if [ -f .proofmembership/changelog-watch.pid ]; then
  kill "$(cat .proofmembership/changelog-watch.pid)" >/dev/null 2>&1 || true
  rm -f .proofmembership/changelog-watch.pid
fi

rm -rf .proofmembership/indexer || true
rm -rf apps/web/.proofmembership/indexer || true

echo "Stopped (or already not running):"
echo "- solana-test-validator"
echo "- indexer dev process"
echo "- web dev process"
echo "- changelog watcher"

echo "Tip: If background logs remain, check /tmp/solana-test-validator.log, /tmp/proofmembership-indexer.log, /tmp/proofmembership-web.log, /tmp/proofmembership-changelog-watch.log"
