#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

PROOF_WALLET="${HOME}/.config/solana/proofmembership/admin.json"
LEGACY_WALLET="${HOME}/.config/solana/solnft/admin.json"

if [[ -f "${PROOF_WALLET}" ]]; then
	DEPLOY_WALLET="${PROOF_WALLET}"
elif [[ -f "${LEGACY_WALLET}" ]]; then
	DEPLOY_WALLET="${LEGACY_WALLET}"
else
	echo "No deploy wallet found. Expected one of:"
	echo "  ${PROOF_WALLET}"
	echo "  ${LEGACY_WALLET}"
	exit 1
fi

echo "[1/3] Ensuring Solana CLI points to devnet..."
solana config set --url https://api.devnet.solana.com >/dev/null
solana config set --keypair "${DEPLOY_WALLET}" >/dev/null

echo "[2/3] Building and deploying Anchor program to devnet..."
anchor deploy --provider.cluster devnet --provider.wallet "${DEPLOY_WALLET}"

echo "[3/3] Done."
echo "Deployed to devnet with provider cluster devnet using wallet ${DEPLOY_WALLET}."
