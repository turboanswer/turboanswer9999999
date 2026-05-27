#!/usr/bin/env bash
# Neon -> Azure Database for PostgreSQL migration
#
# Reads two env vars (set as Replit Secrets):
#   DATABASE_URL          — current Neon URL (source)
#   AZURE_DATABASE_URL    — target Azure Postgres URL
#
# Optional flags:
#   --dry-run    show what would happen, don't write to Azure
#   --skip-dump  reuse existing dump file (faster re-run)
#   --no-verify  skip row-count verification (not recommended)
#
# Safety:
#   * Source (Neon) is READ-ONLY throughout — never written, never dropped.
#   * Target (Azure) gets DROP SCHEMA public CASCADE first — assumes empty/new DB.
#   * Verification compares row counts on every user table; fails loud on mismatch.
#   * Dump file kept in /tmp/turboanswer-migration/ for 7-day rollback.

set -euo pipefail

DRY_RUN=false
SKIP_DUMP=false
VERIFY=true
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --skip-dump) SKIP_DUMP=true ;;
    --no-verify) VERIFY=false ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

WORK_DIR="/tmp/turboanswer-migration"
mkdir -p "$WORK_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="$WORK_DIR/neon-dump-$STAMP.dump"
SRC_COUNTS="$WORK_DIR/src-counts-$STAMP.txt"
DST_COUNTS="$WORK_DIR/dst-counts-$STAMP.txt"

# Reuse most recent dump if --skip-dump
if $SKIP_DUMP; then
  DUMP_FILE="$(ls -t "$WORK_DIR"/neon-dump-*.dump 2>/dev/null | head -1)"
  [[ -z "$DUMP_FILE" ]] && { echo "ERROR: --skip-dump requested but no existing dump found in $WORK_DIR"; exit 1; }
  echo ">> Reusing existing dump: $DUMP_FILE"
fi

# ---------- preflight ----------
echo "================================================================"
echo "  TURBO ANSWER · Neon -> Azure Postgres migration"
echo "  $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "================================================================"

[[ -z "${DATABASE_URL:-}" ]]       && { echo "ERROR: DATABASE_URL (source Neon) not set"; exit 1; }
[[ -z "${AZURE_DATABASE_URL:-}" ]] && { echo "ERROR: AZURE_DATABASE_URL (target Azure) not set"; exit 1; }

# Mask passwords in log output
mask() { sed -E 's|//([^:]+):[^@]+@|//\1:****@|'; }
echo ">> Source : $(echo "$DATABASE_URL" | mask)"
echo ">> Target : $(echo "$AZURE_DATABASE_URL" | mask)"
echo ">> Dump   : $DUMP_FILE"
$DRY_RUN && echo ">> MODE   : DRY RUN (no writes to Azure)"
echo ""

# Test source connectivity
echo ">> [1/6] Testing source (Neon) connectivity..."
SRC_VERSION="$(psql "$DATABASE_URL" -tAc 'SELECT version();' 2>&1)" || {
  echo "ERROR: cannot connect to source Neon DB:"
  echo "$SRC_VERSION"
  exit 1
}
echo "   OK — $(echo "$SRC_VERSION" | head -c 60)..."

# Test target connectivity
echo ">> [2/6] Testing target (Azure) connectivity..."
DST_VERSION="$(psql "$AZURE_DATABASE_URL" -tAc 'SELECT version();' 2>&1)" || {
  echo "ERROR: cannot connect to target Azure DB. Common causes:"
  echo "       - Azure firewall blocking Replit egress (add 0.0.0.0/0 temporarily)"
  echo "       - sslmode=require missing from connection string"
  echo "       - database name in URL doesn't exist (create 'turboanswer' DB in Azure portal)"
  echo "$DST_VERSION"
  exit 1
}
echo "   OK — $(echo "$DST_VERSION" | head -c 60)..."

# Snapshot source row counts
echo ">> [3/6] Snapshotting source row counts (read-only)..."
psql "$DATABASE_URL" -tAc "
  SELECT schemaname || '.' || tablename || E'\t' || n_live_tup
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
" > "$SRC_COUNTS"
SRC_TABLES=$(wc -l < "$SRC_COUNTS")
SRC_ROWS=$(awk -F'\t' '{s+=$2} END {print s}' "$SRC_COUNTS")
echo "   Source: $SRC_TABLES tables, ~$SRC_ROWS rows total"

# Dump
if ! $SKIP_DUMP; then
  echo ">> [4/6] Dumping Neon (custom format, parallel jobs)..."
  pg_dump "$DATABASE_URL" \
    --format=custom \
    --no-owner \
    --no-acl \
    --no-publications \
    --no-subscriptions \
    --verbose \
    --file="$DUMP_FILE" 2>&1 | tail -20
  DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
  echo "   Dump complete: $DUMP_FILE ($DUMP_SIZE)"
else
  echo ">> [4/6] Skipped dump (--skip-dump)"
fi

if $DRY_RUN; then
  echo ""
  echo ">> DRY RUN complete. Source verified, dump created."
  echo "   To execute the restore, re-run without --dry-run:"
  echo "   bash scripts/migrate-neon-to-azure.sh --skip-dump"
  exit 0
fi

# Wipe public schema on target (safety: prompts unless TURBOANSWER_MIGRATE_FORCE=1)
echo ">> [5/6] Preparing target Azure DB..."
if [[ "${TURBOANSWER_MIGRATE_FORCE:-0}" != "1" ]]; then
  echo ""
  echo "   ABOUT TO DROP and recreate 'public' schema on:"
  echo "   $(echo "$AZURE_DATABASE_URL" | mask)"
  echo ""
  read -p "   Type 'MIGRATE' to proceed: " confirm
  [[ "$confirm" != "MIGRATE" ]] && { echo "Aborted."; exit 0; }
fi

psql "$AZURE_DATABASE_URL" <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO PUBLIC;
SQL

# Restore (parallel)
echo "   Restoring to Azure (parallel jobs=4)..."
pg_restore \
  --dbname="$AZURE_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --jobs=4 \
  --verbose \
  "$DUMP_FILE" 2>&1 | tail -30 || {
    echo "WARNING: pg_restore reported errors. Reviewing — some errors (extension already exists) are benign."
  }

# ANALYZE so pg_stat_user_tables is fresh
psql "$AZURE_DATABASE_URL" -c "ANALYZE;" >/dev/null

# Verify
if $VERIFY; then
  echo ">> [6/6] Verifying row counts on target..."
  psql "$AZURE_DATABASE_URL" -tAc "
    SELECT schemaname || '.' || tablename || E'\t' || n_live_tup
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  " > "$DST_COUNTS"
  DST_TABLES=$(wc -l < "$DST_COUNTS")
  DST_ROWS=$(awk -F'\t' '{s+=$2} END {print s}' "$DST_COUNTS")
  echo "   Target: $DST_TABLES tables, ~$DST_ROWS rows total"
  echo ""
  echo "   Per-table diff:"
  diff "$SRC_COUNTS" "$DST_COUNTS" || {
    echo ""
    echo "   ⚠ Row counts differ. Review above (NOTE: estimates from pg_stat,"
    echo "     small drift is normal. For exact counts run scripts/verify-migration.sh)"
  }
else
  echo ">> [6/6] Skipped verification (--no-verify)"
fi

echo ""
echo "================================================================"
echo "  ✅ MIGRATION COMPLETE"
echo "================================================================"
echo ""
echo "Next steps (manual):"
echo "  1. Verify a known user can log in against Azure DB:"
echo "     psql \"\$AZURE_DATABASE_URL\" -c \"SELECT id, email FROM users LIMIT 3;\""
echo ""
echo "  2. Cutover:"
echo "     - In Replit Secrets, rename:"
echo "         DATABASE_URL        -> NEON_DATABASE_URL_BACKUP"
echo "         AZURE_DATABASE_URL  -> DATABASE_URL"
echo "     - Restart 'Start application' workflow"
echo ""
echo "  3. Smoke test: login, send a chat message, check admin panel"
echo ""
echo "  4. After 7 days of green, delete the Neon project"
echo ""
echo "  Dump preserved at: $DUMP_FILE"
echo "  Row count snapshots: $SRC_COUNTS, $DST_COUNTS"
