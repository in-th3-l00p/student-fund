#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
SHOWCASE_DIR="$ROOT_DIR/showcase"
DEPLOY_OUTPUT_DIR="$CONTRACTS_DIR/deployments"
ENV_OUT="$DEPLOY_OUTPUT_DIR/local.env"

RPC_URL="http://127.0.0.1:8545"
CHAIN_ID="31337"
MNEMONIC="${MNEMONIC:-test test test test test test test test test test test junk}"
PRIVATE_KEY="${PRIVATE_KEY:-}"

if ! command -v anvil >/dev/null 2>&1; then
  echo "anvil not found. Install Foundry (foundryup) first." >&2
  exit 1
fi
if ! command -v forge >/dev/null 2>&1; then
  echo "forge not found. Install Foundry (foundryup) first." >&2
  exit 1
fi

echo "Starting anvil (chain-id=$CHAIN_ID) ..."
ANVIL_LOG="$DEPLOY_OUTPUT_DIR/anvil.log"
mkdir -p "$DEPLOY_OUTPUT_DIR"
pkill -f "anvil --chain-id $CHAIN_ID" >/dev/null 2>&1 || true
anvil --chain-id "$CHAIN_ID" --port 8545 --mnemonic "$MNEMONIC" --base-fee 0 --gas-price 0 >"$ANVIL_LOG" 2>&1 &
ANVIL_PID=$!
sleep 1
echo "Anvil PID: $ANVIL_PID"

if [[ -z "$PRIVATE_KEY" ]]; then
  if command -v cast >/dev/null 2>&1; then
    DERIVED_PK=$(cast wallet private-key --mnemonic "$MNEMONIC" --derivation-path "m/44'/60'/0'/0/0" 2>/dev/null || true)
    if [[ -n "${DERIVED_PK:-}" ]]; then
      PRIVATE_KEY="$DERIVED_PK"
      echo "Derived PRIVATE_KEY for deployer from mnemonic."
    fi
  fi
fi

if [[ -z "$PRIVATE_KEY" ]]; then
  echo "Please export PRIVATE_KEY for the deployer (first anvil account)."
  echo "Tip: anvil prints accounts and private keys on startup; copy the first and rerun:"
  echo "  export PRIVATE_KEY=<paste-privkey>"
  echo "  scripts/devnet.sh"
  kill $ANVIL_PID
  exit 1
fi

echo "Deploying contracts via forge script ..."
pushd "$CONTRACTS_DIR" >/dev/null
PRIVATE_KEY="$PRIVATE_KEY" forge script script/DeployLocal.s.sol:DeployLocal --rpc-url "$RPC_URL" --broadcast -vv
popd >/dev/null

if [[ ! -f "$ENV_OUT" ]]; then
  echo "Expected $ENV_OUT not found. Deployment script may have failed." >&2
  kill $ANVIL_PID
  exit 1
fi

echo "Writing frontend env to $SHOWCASE_DIR/.env.local ..."
cp "$ENV_OUT" "$SHOWCASE_DIR/.env.local"

echo "Done. Summary:"
cat "$ENV_OUT"
echo
echo "Anvil running (pid=$ANVIL_PID). Press Ctrl+C to stop or run: kill $ANVIL_PID"


