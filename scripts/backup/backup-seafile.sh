#!/usr/bin/env bash
#
# Full backup of a Seafile server (databases + data + config).
#
# Run this ON the Seafile server, as root:
#
#     sudo bash backup-seafile.sh
#
# or pipe it in from a workstation:
#
#     ssh -t burgieclan 'sudo bash -s' < scripts/backup/backup-seafile.sh
#
# A Seafile backup is exactly three things, and it is worthless if any is missing:
#
#   1. ccnet-db   - users, groups, org structure
#   2. seafile-db - libraries, commits, ownership
#   3. seahub-db  - accounts, shares, tokens, profiles
#   ...plus seafile-data/ (the content-addressed object store) and conf/.
#
# The DB alone cannot restore anything: it only holds hashes pointing into
# seafile-data. The data alone cannot either: without the DB nothing knows
# which object is which file, or what it was called.
#
set -euo pipefail

SEAFILE_ROOT="${SEAFILE_ROOT:-/vtk/burgieclan}"
DEST="${DEST:-/vtk/backups/seafile}"
KEEP="${KEEP:-7}"
DRY_RUN=0
SKIP_DATA=0

usage() {
    sed -n '2,28p' "$0" | sed 's/^#\s\?//'
    cat <<USAGE

Options:
  --seafile-root DIR   Seafile install root      (default: $SEAFILE_ROOT)
  --dest DIR           Where snapshots are kept  (default: $DEST)
  --keep N             Snapshots to retain       (default: $KEEP)
  --skip-data          Databases + config only; skip the object store
  --dry-run            Show what would happen, change nothing
  -h, --help           This message
USAGE
    exit 0
}

while [ $# -gt 0 ]; do
    case "$1" in
        --seafile-root) SEAFILE_ROOT="$2"; shift 2 ;;
        --dest)         DEST="$2";         shift 2 ;;
        --keep)         KEEP="$2";         shift 2 ;;
        --skip-data)    SKIP_DATA=1;       shift ;;
        --dry-run)      DRY_RUN=1;         shift ;;
        -h|--help)      usage ;;
        *) echo "unknown option: $1" >&2; exit 2 ;;
    esac
done

log()  { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }
die()  { printf '\nFAILED: %s\n' "$*" >&2; exit 1; }
run()  { if [ "$DRY_RUN" = 1 ]; then echo "  would run: $*"; else "$@"; fi; }

# ---------------------------------------------------------------- preflight

[ "$(id -u)" = 0 ] || die "must run as root (seafile-data is mode 0700, owned by the seafile user)"
[ -d "$SEAFILE_ROOT" ] || die "no such directory: $SEAFILE_ROOT (pass --seafile-root)"
[ -d "$SEAFILE_ROOT/conf" ] || die "$SEAFILE_ROOT has no conf/ - is this really a Seafile root?"

for t in mysqldump gzip rsync sha256sum; do
    command -v "$t" >/dev/null 2>&1 || die "required tool missing: $t"
done

# ------------------------------------------------------ database credentials
#
# Read them out of Seafile's own config rather than hardcoding. ccnet.conf uses
# UPPERCASE keys, seafile.conf lowercase - hence two lookups.

ini_get() {  # ini_get <file> <section> <key>
    awk -v sect="$2" -v key="$3" '
        /^[[:space:]]*\[/ { in_sect = ($0 ~ "\\[" sect "\\]") ? 1 : 0; next }
        in_sect && $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
            sub(/^[^=]*=[[:space:]]*/, ""); sub(/[[:space:]]+$/, ""); print; exit
        }' "$1" 2>/dev/null
}

CCNET_CONF="$SEAFILE_ROOT/conf/ccnet.conf"
[ -r "$CCNET_CONF" ] || die "cannot read $CCNET_CONF"

DB_HOST="$(ini_get "$CCNET_CONF" Database HOST)";   DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="$(ini_get "$CCNET_CONF" Database PORT)";   DB_PORT="${DB_PORT:-3306}"
DB_USER="$(ini_get "$CCNET_CONF" Database USER)"
DB_PASS="$(ini_get "$CCNET_CONF" Database PASSWD)"

[ -n "$DB_USER" ] || die "could not read the database user from $CCNET_CONF"

# Ask MySQL which of the three actually exist, instead of assuming the names.
MYSQL_ARGS=(-h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER")
[ -n "$DB_PASS" ] && MYSQL_ARGS+=("-p$DB_PASS")

mapfile -t DATABASES < <(
    mysql "${MYSQL_ARGS[@]}" -N -B -e \
        "SHOW DATABASES LIKE '%-db'" 2>/dev/null || true
)
[ "${#DATABASES[@]}" -gt 0 ] || die "no *-db databases visible to user '$DB_USER' - check credentials"

# ------------------------------------------------------------------ snapshot

STAMP="$(date +%Y-%m-%dT%H-%M-%S)"
SNAP="$DEST/$STAMP"
LATEST="$DEST/latest"

log "Seafile root : $SEAFILE_ROOT"
log "Destination  : $SNAP"
log "Databases    : ${DATABASES[*]}"
[ "$DRY_RUN" = 1 ] && log "DRY RUN - nothing will be written"

# Warn rather than refuse: a same-disk backup still protects against the most
# common loss (a bad migration), just not against disk failure.
if [ "$(stat -f -c %i "$SEAFILE_ROOT" 2>/dev/null)" = "$(stat -f -c %i "$(dirname "$DEST")" 2>/dev/null)" ]; then
    log "NOTE: destination is on the same filesystem as the data it backs up."
    log "      Copy the snapshot off this host to be safe against disk loss."
fi

run mkdir -p "$SNAP"

# --- 1. databases FIRST -------------------------------------------------
#
# Order is not cosmetic. seafile-data is append-only: objects are written and
# never mutated. Dumping the DB first means every hash it references already
# exists on disk and will be picked up by the copy that follows. Copying data
# first and dumping second would let a library created in between land in the
# dump while its objects were missing from the copy - a backup that restores
# into a broken state.

for db in "${DATABASES[@]}"; do
    log "dumping $db"
    if [ "$DRY_RUN" = 1 ]; then
        echo "  would run: mysqldump $db > $SNAP/$db.sql.gz"
    else
        mysqldump "${MYSQL_ARGS[@]}" \
            --single-transaction --quick --routines --events \
            --default-character-set=utf8 \
            "$db" 2>/dev/null | gzip -6 > "$SNAP/$db.sql.gz" \
            || die "mysqldump failed for $db"

        # A dump that ends without this marker was truncated mid-write.
        gzip -dc "$SNAP/$db.sql.gz" | tail -5 | grep -q 'Dump completed' \
            || die "$db dump is truncated - do NOT trust this snapshot"
        log "  ok  $(du -h "$SNAP/$db.sql.gz" | cut -f1)"
    fi
done

# --- 2. config ----------------------------------------------------------
# Small, and holds the DB passwords and secret keys a restore needs.

log "copying conf/"
run rsync -a "$SEAFILE_ROOT/conf/" "$SNAP/conf/"

# --- 3. the object store ------------------------------------------------
#
# rsync with --link-dest, not tar. The store is millions of small immutable
# objects; hardlinking against the previous snapshot means each new snapshot
# costs only what changed, while still presenting as a complete tree.

if [ "$SKIP_DATA" = 1 ]; then
    log "skipping seafile-data (--skip-data)"
else
    for dir in seafile-data seahub-data; do
        [ -d "$SEAFILE_ROOT/$dir" ] || { log "no $dir/, skipping"; continue; }
        log "syncing $dir/ (this is the slow part)"
        LINK_ARG=()
        [ -d "$LATEST/$dir" ] && LINK_ARG=(--link-dest="$LATEST/$dir")
        run rsync -a --delete "${LINK_ARG[@]}" \
            "$SEAFILE_ROOT/$dir/" "$SNAP/$dir/"
    done
fi

# --- 4. manifest --------------------------------------------------------

if [ "$DRY_RUN" != 1 ]; then
    {
        echo "seafile_root=$SEAFILE_ROOT"
        echo "taken_at=$(date -Is)"
        echo "taken_on=$(hostname)"
        echo "databases=${DATABASES[*]}"
        echo "skip_data=$SKIP_DATA"
        echo "seafile_version=$(basename "$(readlink -f "$SEAFILE_ROOT/seafile-server-latest" 2>/dev/null)" 2>/dev/null)"
        echo "size=$(du -sh "$SNAP" 2>/dev/null | cut -f1)"
        echo "--- sha256 of database dumps ---"
        (cd "$SNAP" && sha256sum ./*.sql.gz 2>/dev/null || true)
    } > "$SNAP/MANIFEST.txt"

    ln -sfn "$SNAP" "$LATEST"
fi

# --- 5. retention -------------------------------------------------------
#
# Deletes oldest-first, never the symlink, never the one just written.

if [ "$DRY_RUN" != 1 ] && [ "$KEEP" -gt 0 ]; then
    mapfile -t OLD < <(find "$DEST" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' \
                       | sort | head -n "-$KEEP")
    for o in "${OLD[@]:-}"; do
        [ -n "$o" ] || continue
        [ "$o" = "$STAMP" ] && continue
        log "pruning old snapshot $o"
        rm -rf "${DEST:?}/${o:?}"
    done
fi

log "done -> $SNAP"
[ "$DRY_RUN" != 1 ] && cat "$SNAP/MANIFEST.txt"
