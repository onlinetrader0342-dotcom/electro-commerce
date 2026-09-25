#!/bin/bash
# Nightly-style Postgres backup for the electro-commerce platform.
# Dumps the 'electro' database (custom format) into .infra/backups/, keeps the newest 10.
# Safe to run while postgres is live. Reads credentials from apps/medusa/.env (never prints them).
set -euo pipefail

INFRA="$(cd "$(dirname "$0")" && pwd)"
export LD_LIBRARY_PATH="$INFRA/pginstall/lib:${LD_LIBRARY_PATH:-}"

MEDUSA_ENV="$INFRA/../apps/medusa/.env"
if [ ! -f "$MEDUSA_ENV" ]; then
  echo "ERROR: $MEDUSA_ENV not found" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$MEDUSA_ENV"
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set in $MEDUSA_ENV" >&2
  exit 1
fi

BACKUP_DIR="$INFRA/backups"
mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/electro-$TS.dump"

"$INFRA/pginstall/bin/pg_dump" -Fc -f "$FILE" "$DATABASE_URL"

# keep newest 10, delete older
ls -t "$BACKUP_DIR"/electro-*.dump 2>/dev/null | tail -n +11 | xargs -r rm -f --

echo "backup ok: $FILE ($(du -h "$FILE" | cut -f1))"
