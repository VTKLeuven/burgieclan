# Backup scripts

`app:backup` (see `PRODUCTION.md`) is the supported way to back up Burgieclan.
This directory holds the break-glass alternative.

| Script | Backs up | Run on |
| --- | --- | --- |
| `backup-production.sh` | Postgres, `data/`, `jwt/`, `.env` | the production host (`liv`) |

## Why this exists alongside `app:backup`

`app:backup` runs inside the backend container and needs the application to
boot: the Symfony kernel, the database connection, the object-storage
configuration. That is fine, right up until the moment the application is
what is broken — a failed deploy, a bad migration, a container that will not
start. That is exactly when you most want a backup and least have one.

This script needs only `docker`, `pg_dump` and `rsync`. It writes to local disk
rather than object storage, so it also works when the S3 credentials are the
problem.

It is not a replacement. It does **not** back up the document files, which live
in Hetzner Object Storage and are only reachable through `app:backup`.

## Usage

**Copy the script to the server and run it there. Do not pipe it in over stdin.**

```bash
scp scripts/backup/backup-production.sh liv:/tmp/
ssh liv 'bash /tmp/backup-production.sh --dest /mnt/immich/burgieclan-backups --dry-run'
ssh liv 'bash /tmp/backup-production.sh --dest /mnt/immich/burgieclan-backups'
```

Options: `--app-dir DIR`, `--dest DIR`, `--keep N`, `--dry-run`.

> **Why not `ssh host 'bash -s' < script`?** Because the script *is* stdin, and
> any command inside it that reads stdin will consume the rest of it. `docker
> compose exec -T` does exactly that: `pg_dump` swallowed the remainder of this
> script, bash ran out of input, and the run **exited 0 having silently skipped
> every step after the database**. The script now redirects `< /dev/null` into
> that call so it is safe either way — but copying the file avoids the whole
> class of problem.

## Which host is which

Two different machines both report the hostname `burgieclan`, and mixing them
up is easy. Their addresses, versions and sudo posture are deliberately not
recorded here — keep those in the IT password manager alongside the
credentials, not in a public repository. The SSH aliases below mean nothing
without the matching `~/.ssh/config`.

| Role | What it is |
| --- | --- |
| Production | Burgieclan itself: compose project, `data/`, `jwt/`, `postgres_data/`. The root filesystem is small, so backups must be written to the mounted network share rather than to local disk. |
| Legacy Seafile | The original Seafile install holding the historical libraries. `seafile-data` is mode 0700, so nothing under it is readable without root. |
| Current Seafile | The Dockerised Seafile serving the shared libraries. Container-aware backups are required; see the migration scripts. |
| SSH gateway | A username-routing `sshpiper` gateway. Hosts nothing itself. |

> Check which box you are on before running anything destructive: the shared
> hostname makes it easy to believe you are on the other one.

## Design notes

**Verification, not just exit codes.** `pg_dump` can exit 0 having written a
truncated or unreadable file, so the script runs `pg_restore --list` over its own
output. That check earned its place: it caught a bad invocation on the first run.

**`postgres_data/` is not copied.** Copying a live PostgreSQL data directory
produces an inconsistent snapshot. The logical dump supersedes it.

**`--no-owner --no-group` on rsync.** The destination is usually an NFS share
that squashes ownership, where preserving `root:root` on `jwt/` fails outright.
Modes and contents survive; ownership is reset on restore.

## Restoring

```bash
docker compose -f docker-compose.prod.yml exec -T db \
    pg_restore -U burgieclan_db_user -d burgieclan_db --clean --if-exists \
    < /mnt/immich/burgieclan-backups/latest/db.dump
```

> An untested backup is not a backup. Restore one into a scratch database at
> least once before you rely on it.

## Caveats

- **Document files are not included.** In production they live in Hetzner Object
  Storage (`flysystem.yaml`, `when@prod`); local `data/` is a few MB of
  regenerable zip cache and in-flight uploads. Use `app:backup` for the files.
- `.env` and `jwt/` **are** included here, unlike in `app:backup`. That makes the
  output secret-bearing: write it somewhere access-controlled, and do not treat
  it as routine.
- A snapshot on the same filesystem as its source survives a bad migration but
  not a failed disk.

## Seafile

There is no Seafile backup script here yet. The old server's data is not readable
without root, and the live copy is a Dockerised Seafile, so
anything written for it needs to be container-aware. See the migration work.
