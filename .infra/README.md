# Infrastructure — data safety

This directory keeps the platform's data safe across VM restarts.

## The problem

- `/tmp` is a tmpfs: **wiped on every VM restart**. Postgres cannot run its live
  data directory anywhere else here, because this workspace filesystem does not
  support `chown`, and Postgres refuses a data dir it does not own.
- So: Postgres **runs** in `/tmp/pgdata` (fast, correct ownership), but the
  **truth that survives reboots** is the backup chain in `.infra/backups/`.

## What's here

| Path | Purpose | Survives restart |
|---|---|---|
| `pginstall/` | Postgres 16.2 binaries (persistent copy) | ✅ |
| `backups/` | `pg_dump` custom-format dumps, newest 10 kept | ✅ |
| `redis/` | Redis AOF persistence dir | ✅ |
| `backup-db.sh` | Takes a backup now | ✅ (script) |
| `start-infra.sh` | Post-reboot recovery (see below) | ✅ (script) |

## Post-reboot recovery

```bash
sudo bash ~/workspace/electro-commerce/.infra/start-infra.sh
```

If `/tmp/pgdata` is gone, the script: `initdb`s a fresh cluster in `/tmp`,
restores the **latest** backup, then starts postgres on `:5433` and redis on
`:6379` (AOF persisted under `.infra/redis/`). Then start Medusa + storefront
as usual (`pnpm dev:medusa`, `pnpm dev:storefront`).

## Backups

- Automatic: cron `electro-db-backup` runs `backup-db.sh` every 6 hours
  (silent on success, alerts on failure).
- Manual: `bash ~/workspace/electro-commerce/.infra/backup-db.sh`
- Restore test (2026-09-25): dump → scratch DB → 24/24 products verified.

## Never do

- Do **not** move `/tmp/pgdata` into the workspace: Postgres will refuse to
  start (ownership check) because `chown` is not permitted on this filesystem.
- Do **not** delete `.infra/backups/` — it is the only durable copy of the DB.
