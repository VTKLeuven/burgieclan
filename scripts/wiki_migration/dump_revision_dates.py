#!/usr/bin/env python3
"""Find when each line of the wiki was actually written, from the full revision history.

The main dump only reads `page_latest`, so a bullet added in 2012 to a page last edited in
2024 looks like it was written in 2024. That is why ~35% of comments have no trustworthy
year. MediaWiki keeps every revision: walking them oldest-first and recording the first
revision each line appears in gives the real creation date.

    export WIKI_DB_PASSWORD=...
    python3 scripts/wiki_migration/dump_revision_dates.py probe    # how big is the history?
    python3 scripts/wiki_migration/dump_revision_dates.py fetch    # stream it, build the index

Writes migration_data/raw/line_first_seen.json:

    { "<page title>": { "<line hash>": "YYYY-MM-DD HH:MM:SS" } }

Only a hash of each normalised line is kept, so the index stays small however large the
history is. extract_wiki_comments.py picks it up automatically if the file exists.

The history is streamed as CSV and processed a row at a time: full wikitext for every
revision of every page can be hundreds of MB, and none of it is held in memory.
"""

import argparse
import csv
import hashlib
import json
import os
import re
import subprocess
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = REPO_ROOT / "migration_data" / "raw"
INDEX_FILE = RAW_DIR / "line_first_seen.json"

# Lines shorter than this carry no signal and would collide across pages.
MIN_LINE_CHARS = 25

PROBE_SQL = """
SELECT count(*) AS revisions, count(DISTINCT p.page_id) AS pages,
       pg_size_pretty(sum(octet_length(pc.old_text))) AS total_wikitext,
       min(r.rev_timestamp)::text AS oldest, max(r.rev_timestamp)::text AS newest
FROM wiki.page p
JOIN wiki.revision r ON r.rev_page = p.page_id
JOIN wiki.slots s ON s.slot_revision_id = r.rev_id
JOIN wiki.content c ON c.content_id = s.slot_content_id
JOIN wiki.pagecontent pc ON pc.old_id = REPLACE(c.content_address, 'tt:', '')::integer
WHERE p.page_namespace = 0;
"""

# Oldest first, so the first time a line is seen is its creation.
FETCH_SQL = """
COPY (
  SELECT p.page_title, r.rev_timestamp::text, pc.old_text
  FROM wiki.page p
  JOIN wiki.revision r ON r.rev_page = p.page_id
  JOIN wiki.slots s ON s.slot_revision_id = r.rev_id
  JOIN wiki.content c ON c.content_id = s.slot_content_id
  JOIN wiki.pagecontent pc ON pc.old_id = REPLACE(c.content_address, 'tt:', '')::integer
  WHERE p.page_namespace = 0
  ORDER BY p.page_title, r.rev_timestamp
) TO STDOUT WITH (FORMAT csv)
"""


def line_key(line):
    """Hash of a line, normalised so trivial re-edits do not look like a new line."""
    t = unicodedata.normalize("NFKD", line.lower())
    t = re.sub(r"[^a-z0-9]+", " ", t).strip()
    if len(t) < MIN_LINE_CHARS:
        return None
    return hashlib.sha1(t.encode()).hexdigest()[:16]


def ssh_command(sql, password, host):
    """psql over ssh, password read from stdin so it never appears in the remote argv."""
    remote = ("IFS= read -r PGPASSWORD; export PGPASSWORD; "
              "psql -h 127.0.0.1 -U wiki -d wiki -t -A -v ON_ERROR_STOP=1 -c "
              + json.dumps(" ".join(sql.split())))
    return (["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", host, remote],
            (password + "\n").encode())


def credentials():
    password = os.environ.get("WIKI_DB_PASSWORD")
    if not password:
        sys.exit("WIKI_DB_PASSWORD is not set; it is deliberately not stored in this repo.")
    return password, os.environ.get("WIKI_SSH_HOST", "it@nina")


def cmd_probe(args):
    password, host = credentials()
    cmd, stdin = ssh_command(PROBE_SQL, password, host)
    out = subprocess.run(cmd, input=stdin, capture_output=True).stdout.decode(errors="replace")
    fields = out.strip().split("|")
    if len(fields) < 5:
        sys.exit(f"unexpected probe output: {out!r}")
    revisions, pages, size, oldest, newest = fields[:5]
    print(f"revisions      : {revisions}")
    print(f"pages          : {pages}")
    print(f"total wikitext : {size}   <- this is what streams over ssh")
    print(f"oldest revision: {oldest}")
    print(f"newest revision: {newest}")
    print("\nThe transfer is streamed and discarded as it goes; only a small hash index is "
          "kept on disk.\nIf the total is more than a few GB, run `fetch` on a good "
          "connection or overnight.")


def cmd_fetch(args):
    password, host = credentials()
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    cmd, stdin = ssh_command(FETCH_SQL, password, host)

    print(f"streaming revision history from {host} ...", flush=True)
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE)
    proc.stdin.write(stdin)
    proc.stdin.close()

    csv.field_size_limit(1 << 30)
    stream = csv.reader((ln.decode("utf-8", "replace") for ln in proc.stdout))

    index, revisions, bytes_seen = {}, 0, 0
    for row in stream:
        if len(row) < 3:
            continue
        title, ts, text = row[0], row[1], row[2]
        revisions += 1
        bytes_seen += len(text)
        try:
            when = datetime.strptime(ts[:19], "%Y-%m-%d %H:%M:%S").strftime("%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue
        page = index.setdefault(title, {})
        for raw in text.split("\n"):
            k = line_key(raw.strip())
            # Oldest-first ordering means the first sighting wins; setdefault keeps it.
            if k is not None:
                page.setdefault(k, when)
        if revisions % 2000 == 0:
            print(f"  {revisions} revisions, {bytes_seen / 1e6:.0f} MB read, "
                  f"{len(index)} pages", flush=True)

    proc.stdout.close()
    err = proc.stderr.read().decode(errors="replace").strip()
    if proc.wait() != 0:
        sys.exit(f"psql failed: {err.replace(password, '***')}")

    INDEX_FILE.write_text(json.dumps(index))
    lines = sum(len(v) for v in index.values())
    print(f"\n{revisions} revisions across {len(index)} pages, {bytes_seen / 1e6:.0f} MB read")
    print(f"{lines} distinct lines dated -> {INDEX_FILE} "
          f"({INDEX_FILE.stat().st_size / 1e6:.1f} MB)")
    print("\nNow re-run: python3 scripts/wiki_migration/extract_wiki_comments.py build")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="command", required=True)
    sub.add_parser("probe", help="report how large the revision history is").set_defaults(
        func=cmd_probe)
    sub.add_parser("fetch", help="stream the history and build the date index").set_defaults(
        func=cmd_fetch)
    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
