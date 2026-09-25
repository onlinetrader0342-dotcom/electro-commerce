#!/bin/bash
# Post-reboot recovery for the electro-commerce platform.
# Postgres data lives in /tmp (ephemeral); this script recreates it from the
# latest backup in .infra/backups/ if /tmp was wiped, then starts postgres + redis.
# Usage: sudo bash .infra/start-infra.sh   (needs root for the pgserver user switch)
set -euo pipefail

INFRA="$(cd "$(dirname "$0")" && pwd)"
export LD_LIBRARY_PATH="$INFRA/pginstall/lib:${LD_LIBRARY_PATH:-}"
PGCTL="$INFRA/pginstall/bin/pg_ctl"
REPO="$INFRA/.."

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: run as root (sudo)" >&2
  exit 1
fi

# ---------- postgres ----------
if [ ! -d /tmp/pgdata ]; then
  echo "[infra] /tmp/pgdata missing (fresh boot) - initialising from latest backup..."
  mkdir -p /tmp/pgdata /tmp/pgsock
  chown -R pgserver:pgserver /tmp/pgdata /tmp/pgsock
  su pgserver -c "$INFRA/pginstall/bin/initdb -D /tmp/pgdata -U electro --auth=trust" >/tmp/pg-init.log 2>&1
  su pgserver -c "$PGCTL -D /tmp/pgdata -l /tmp/pg.log -o '-p 5433 -k /tmp/pgsock -c listen_addresses=localhost' start"
  sleep 3
  su pgserver -c "$INFRA/pginstall/bin/createdb -h localhost -p 5433 -U electro electro"
  LATEST="$(ls -t "$INFRA/backups"/electro-*.dump 2>/dev/null | head -1 || true)"
  if [ -n "$LATEST" ]; then
    echo "[infra] restoring $LATEST ..."
    set -a
    # shellcheck disable=SC1090
    source "$REPO/apps/medusa/.env"
    set +a
    "$INFRA/pginstall/bin/pg_restore" -d "$DATABASE_URL" --no-owner --no-privileges "$LATEST" || true
    echo "[infra] restore done"
  else
    echo "[infra] WARNING: no backup found - starting with an empty database"
  fi
else
  echo "[infra] /tmp/pgdata present - starting postgres..."
  mkdir -p /tmp/pgsock
  chown pgserver:pgserver /tmp/pgsock
  su pgserver -c "$PGCTL -D /tmp/pgdata -l /tmp/pg.log -o '-p 5433 -k /tmp/pgsock -c listen_addresses=localhost' start" || true
fi

# ---------- redis (persistent AOF in workspace) ----------
mkdir -p "$INFRA/redis"
if ! pgrep -f "redis-server" >/dev/null; then
  echo "[infra] starting redis..."
  REDIS_BIN="$(find /home/hatch/workspace/.build-tmp/redis-stable/src -name redis-server -type f 2>/dev/null | head -1)"
  if [ -z "$REDIS_BIN" ]; then
    echo "[infra] WARNING: redis-server binary not found, skipping"
  else
    chmod o+rx /home/hatch/workspace/.build-tmp 2>/dev/null || true
    nohup "$REDIS_BIN" --port 6379 --dir "$INFRA/redis" --appendonly yes --daemonize yes >/tmp/redis.log 2>&1
    echo "[infra] redis started"
  fi
else
  echo "[infra] redis already running"
fi

echo "[infra] done. postgres :5433, redis :6379"
