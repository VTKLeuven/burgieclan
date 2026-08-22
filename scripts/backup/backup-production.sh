#!/usr/bin/env bash
#
# Backup of the NEW Burgieclan production stack (Postgres + uploads + JWT keys).
#
# Run on the production host:
#
#     sudo bash backup-production.sh
#
# Formalises the recipe documented in PRODUCTION.md, and adds the parts that
# turn a copy into a backup: verification, a manifest, and retention.
#
# Take one of these before any bulk import. Restoring a snapshot is a minute;
# unpicking fifty thousand wrongly-classified Document rows by hand is not.
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/burgieclan}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DEST="${DEST:-/var/backups/burgieclan}"
KEEP="${KEEP:-14}"
DRY_RUN=0

while [ $# -gt 0 ]; do
    case "$1" in
        --app-dir) APP_DIR="$2"; shift 2 ;;
        --dest)    DEST="$2";    shift 2 ;;
        --keep)    KEEP="$2";    shift 2 ;;
        --dry-run) DRY_RUN=1;    shift ;;
        -h|--help)
            echo "usage: $0 [--app-dir DIR] [--dest DIR] [--keep N] [--dry-run]"; exit 0 ;;
        *) echo "unknown option: $1" >&2; exit 2 ;;
    esac
done

log() { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }
die() { printf '\nFAILED: %s\n' "$*" >&2; exit 1; }
run() { if [ "$DRY_RUN" = 1 ]; then echo "  would run: $*"; else "$@"; fi; }

[ -d "$APP_DIR" ] || die "no such directory: $APP_DIR (pass --app-dir)"
cd "$APP_DIR"
[ -f "$COMPOSE_FILE" ] || die "$APP_DIR/$COMPOSE_FILE not found"

# Credentials come from the server's .env, the same place compose reads them.
DB_USER="$(grep -E '^POSTGRES_USER=' .env 2>/dev/null | cut -d= -f2- || true)"
DB_NAME="$(grep -E '^POSTGRES_DB=' .env 2>/dev/null | cut -d= -f2- || true)"
DB_USER="${DB_USER:-burgieclan_db_user}"
DB_NAME="${DB_NAME:-burgieclan_db}"

STAMP="$(date +%Y-%m-%dT%H-%M-%S)"
SNAP="$DEST/$STAMP"

log "app dir     : $APP_DIR"
log "destination : $SNAP"
log "database    : $DB_NAME (user $DB_USER)"
[ "$DRY_RUN" = 1 ] && log "DRY RUN - nothing will be written"

run mkdir -p "$SNAP"

# --- database -----------------------------------------------------------
# Custom format (-Fc): compressed, and restorable table-by-table with
# pg_restore, which matters when an import only wrecked the document tables.

log "dumping database"
if [ "$DRY_RUN" = 1 ]; then
    echo "  would run: pg_dump -Fc $DB_NAME > $SNAP/db.dump"
else
    docker compose -f "$COMPOSE_FILE" exec -T db \
        pg_dump -U "$DB_USER" -Fc "$DB_NAME" < /dev/null > "$SNAP/db.dump" \
        || die "pg_dump failed"
    [ -s "$SNAP/db.dump" ] || die "pg_dump produced an empty file"
    # Proves the archive is readable, not merely non-empty.
    docker compose -f "$COMPOSE_FILE" exec -T db \
        pg_restore --list < "$SNAP/db.dump" > "$SNAP/db.toc" 2>/dev/null \
        || die "dump is not a valid pg_restore archive - do NOT trust this snapshot"
    log "  ok  $(ls -lh "$SNAP/db.dump" | awk "{print \$5}"), $(wc -l < "$SNAP/db.toc") objects"
fi

# --- uploads ------------------------------------------------------------
# Only meaningful when documents live on local disk. In production they are in
# Hetzner Object Storage (flysystem.yaml, when@prod) - versioning on the bucket
# is what protects those, not this script.

if [ -d "$APP_DIR/data" ]; then
    log "syncing data/ (local uploads)"
    run rsync -a --no-owner --no-group --delete "$APP_DIR/data/" "$SNAP/data/"
else
    log "no data/ directory - uploads are presumably on S3 (see flysystem.yaml)"
fi

# --- JWT keys -----------------------------------------------------------
# Lose these and every issued token is void: all users are logged out and the
# refresh tokens in the database become undecryptable.

if [ -d "$APP_DIR/jwt" ]; then
    log "copying jwt/"
    run rsync -a --no-owner --no-group "$APP_DIR/jwt/" "$SNAP/jwt/"
    [ "$DRY_RUN" != 1 ] && { chmod -R go-rwx "$SNAP/jwt" 2>/dev/null || log "note: could not tighten jwt/ permissions (network filesystem?)"; }
fi

# --- env ----------------------------------------------------------------
[ -f "$APP_DIR/.env" ] && { run cp "$APP_DIR/.env" "$SNAP/env.txt"; \
    { chmod go-rwx "$SNAP/env.txt" 2>/dev/null || true; }; }

# --- manifest + retention ----------------------------------------------

if [ "$DRY_RUN" != 1 ]; then
    {
        echo "taken_at=$(date -Is)"
        echo "taken_on=$(hostname)"
        echo "app_dir=$APP_DIR"
        echo "database=$DB_NAME"
        echo "git_sha=$(git -C "$APP_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
        echo "size=$(du -sh "$SNAP" | cut -f1)"
        echo "--- sha256 ---"
        (cd "$SNAP" && find . -maxdepth 1 -type f -exec sha256sum {} + 2>/dev/null || true)
    } > "$SNAP/MANIFEST.txt"
    chmod -R go-rwx "$SNAP" 2>/dev/null || log "note: could not tighten snapshot permissions (network filesystem?)"
    ln -sfn "$SNAP" "$DEST/latest"

    if [ "$KEEP" -gt 0 ]; then
        mapfile -t OLD < <(find "$DEST" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' \
                           | sort | head -n "-$KEEP")
        for o in "${OLD[@]:-}"; do
            [ -n "$o" ] && [ "$o" != "$STAMP" ] || continue
            log "pruning $o"; rm -rf "${DEST:?}/${o:?}"
        done
    fi
    cat "$SNAP/MANIFEST.txt"
fi

log "done -> $SNAP"
