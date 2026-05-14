#!/usr/bin/env bash
# Solo reinicio PM2 seguro (sin npm build). Útil si vps-build dejó el proceso en errored.
exec bash "$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)/pm2-fix.sh"
