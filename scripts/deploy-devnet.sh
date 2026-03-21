#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "[1/3] Ensuring Solana CLI points to devnet..."
solana config set --url https://api.devnet.solana.com >/dev/null

echo "[2/3] Building and deploying Anchor program to devnet..."
anchor deploy --provider.cluster devnet

echo "[3/3] Done."
echo "Deployed to devnet with provider cluster devnet."
