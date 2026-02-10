#!/usr/bin/env bash
set -euo pipefail

if ! command -v solana >/dev/null 2>&1; then
  echo "solana-cli not found in PATH"
  exit 1
fi

echo "== Solana CLI =="
solana --version
echo

echo "== Solana Config =="
solana config get
echo

echo "== Active Wallet Pubkey =="
solana address
echo

echo "== Balance =="
solana balance || true
