#!/usr/bin/env bash
# git pull + build + reinicio PM2 seguro (todo en uno).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

echo "==> git pull origin main"
git pull origin main

exec bash "$SCRIPT_DIR/vps-build.sh"
