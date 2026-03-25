#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

declare -a LOG_ENTRIES=(
  "indexer:/tmp/proofmembership-indexer-devnet.log"
  "web:/tmp/proofmembership-web-devnet.log"
  "changelog:/tmp/proofmembership-changelog-watch-devnet.log"
)

cleanup() {
  jobs -pr | xargs -r kill >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

echo "ProofMembership devnet console"
echo "Web:       http://localhost:3000"
echo "Cluster:   https://api.devnet.solana.com"
echo "Watching:"

for entry in "${LOG_ENTRIES[@]}"; do
  label="${entry%%:*}"
  file="${entry#*:}"
  touch "${file}"
  echo "- ${label}: ${file}"
done

echo
echo "Press Ctrl+C to stop the console."
echo

for entry in "${LOG_ENTRIES[@]}"; do
  label="${entry%%:*}"
  file="${entry#*:}"

  tail -n 20 -F "${file}" | while IFS= read -r line; do
    printf '[%s] %s\n' "${label}" "${line}"
  done &
done

wait