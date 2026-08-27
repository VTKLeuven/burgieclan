#!/usr/bin/env python3
"""Turn migration_data/wiki_comments_import.json into a reversible SQL import.

    python3 scripts/wiki_migration/import_wiki_comments.py sql          # generate + verify
    python3 scripts/wiki_migration/import_wiki_comments.py sql --skip-oversize

Writes:
    migration_data/wiki_comments_import.sql    one transaction, safe to re-run
    migration_data/wiki_comments_rollback.sql  undoes exactly this import

Every row is created by a dedicated `wiki-migration` account rather than a real person's,
which is what makes the rollback exact: deleting that user's comments deletes precisely
what this import added, and nothing a student wrote. The account has no usable password.

The import is idempotent: a row is skipped when a comment with the same course, category
and normalized text already exists, so the manually copied comments already in production
survive and a second run inserts nothing.

Run it on liv (review the SQL first):

    scp migration_data/wiki_comments_import.sql it@liv:/tmp/
    ssh it@liv 'docker compose -f /opt/burgieclan/docker-compose.prod.yml exec -T db \\
        psql -U burgieclan_db_user -d burgieclan_db -v ON_ERROR_STOP=1' < /tmp/wiki_comments_import.sql
"""

import argparse
import json
import os
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "migration_data"
IMPORT_JSON = DATA_DIR / "wiki_comments_import.json"
SQL_FILE = DATA_DIR / "wiki_comments_import.sql"
ROLLBACK_FILE = DATA_DIR / "wiki_comments_rollback.sql"

MIGRATION_USERNAME = "wiki-migration"
MIGRATION_EMAIL = "wiki-migration@vtk.be"
MIGRATION_FULLNAME = "VTK Wiki (gearchiveerd)"

# The eight original categories plus the separate Examenvragen (10) category.
VALID_CATEGORIES = {2, 3, 4, 5, 6, 7, 8, 9, 10}


def q(value):
    """Quote a string as a Postgres literal."""
    return "'" + value.replace("'", "''") + "'"


HEADER = f"""\
-- VTK wiki -> burgieclan course_comment
-- Generated {{generated}} by scripts/wiki_migration/import_wiki_comments.py
-- Rows: {{count}}
--
-- Single transaction: either every row lands or none does.
-- Re-running is safe; already-present comments are skipped.
-- To undo: migration_data/wiki_comments_rollback.sql

\\set ON_ERROR_STOP on
BEGIN;

-- The migration account. Password is a placeholder that no hasher will ever verify,
-- so the account cannot be logged into.
INSERT INTO burgieclan_user (full_name, username, email, password, roles, sso_roles,
                             default_anonymous, created_at, updated_at)
SELECT {q(MIGRATION_FULLNAME)}, {q(MIGRATION_USERNAME)}, {q(MIGRATION_EMAIL)},
       '!wiki-migration-no-login!', '[]'::json, '[]'::json, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM burgieclan_user WHERE username = {q(MIGRATION_USERNAME)});

CREATE TEMP TABLE wiki_comment_staging (
    seq           INT NOT NULL,   -- file order == original wiki bullet order
    course_id     INT NOT NULL,
    category_id   INT NOT NULL,
    created_at    TIMESTAMP(0) NOT NULL,
    content       TEXT NOT NULL,
    academic_year VARCHAR(11)        -- "2024 - 2025"; NULL when only guessed
) ON COMMIT DROP;
"""

FOOTER = f"""
-- Guard against a stale course_id or category_id in the JSON.
DO $$
DECLARE bad INT;
BEGIN
    SELECT count(*) INTO bad FROM wiki_comment_staging s
     WHERE NOT EXISTS (SELECT 1 FROM course c WHERE c.id = s.course_id);
    IF bad > 0 THEN
        RAISE EXCEPTION 'aborting: % staged rows reference a course id that does not exist', bad;
    END IF;

    SELECT count(*) INTO bad FROM wiki_comment_staging s
     WHERE NOT EXISTS (SELECT 1 FROM comment_category c WHERE c.id = s.category_id);
    IF bad > 0 THEN
        RAISE EXCEPTION 'aborting: % staged rows reference a comment_category that does not exist', bad;
    END IF;
END $$;

INSERT INTO course_comment (creator_id, course_id, category_id, created_at, updated_at,
                            content, anonymous{{year_col}})
SELECT u.id, s.course_id, s.category_id, s.created_at, s.created_at, s.content, true{{year_val}}
  FROM wiki_comment_staging s
 CROSS JOIN (SELECT id FROM burgieclan_user WHERE username = {q(MIGRATION_USERNAME)}) u
 WHERE NOT EXISTS (
     SELECT 1 FROM course_comment cc
      WHERE cc.course_id = s.course_id
        AND cc.category_id = s.category_id
        AND lower(regexp_replace(cc.content, '[^a-zA-Z0-9]+', ' ', 'g'))
          = lower(regexp_replace(s.content,  '[^a-zA-Z0-9]+', ' ', 'g')){{year_dedup}}
 )
 -- Comments display as academicYear DESC, createdAt ASC, id ASC, and many rows share a
 -- createdAt, so id decides the reading order inside a year. Without this ORDER BY the
 -- planner may emit staging rows in any order and scramble each wiki section's bullets.
 ORDER BY s.seq;

SELECT count(*) AS comments_owned_by_wiki_migration
  FROM course_comment cc
  JOIN burgieclan_user u ON u.id = cc.creator_id
 WHERE u.username = {q(MIGRATION_USERNAME)};

COMMIT;
"""

ROLLBACK = f"""\
-- Undo the wiki comment import. Deletes only comments created by the migration
-- account, so nothing a student wrote is touched.
-- Generated {{generated}}

\\set ON_ERROR_STOP on
BEGIN;

DELETE FROM course_comment
 WHERE creator_id IN (SELECT id FROM burgieclan_user WHERE username = {q(MIGRATION_USERNAME)});

-- Drop the account too. Comment this out to keep it for a later re-import.
DELETE FROM burgieclan_user WHERE username = {q(MIGRATION_USERNAME)};

COMMIT;
"""


def cmd_sql(args):
    if not args.file.exists():
        sys.exit(f"missing {args.file}. Run `extract_wiki_comments.py build` first.")
    rows = json.loads(args.file.read_text())
    sql_file = args.out_dir / SQL_FILE.name
    rollback_file = args.out_dir / ROLLBACK_FILE.name

    skipped_oversize = 0
    selected = []
    for r in rows:
        if args.skip_oversize and r.get("oversize"):
            skipped_oversize += 1
            continue
        if r.get("category_id") not in VALID_CATEGORIES:
            sys.exit(f"refusing to build: category_id {r.get('category_id')!r} "
                     f"on {r.get('course_code')} is not a known comment category")
        if not isinstance(r.get("course_id"), int):
            sys.exit(f"refusing to build: non-integer course_id on {r.get('course_code')}")
        try:
            datetime.strptime(r["created_at"], "%Y-%m-%d %H:%M:%S")
        except (KeyError, ValueError):
            sys.exit(f"refusing to build: bad created_at on {r.get('course_code')}: "
                     f"{r.get('created_at')!r}")
        if not r.get("content", "").strip():
            sys.exit(f"refusing to build: empty content on {r.get('course_code')}")
        selected.append(r)

    generated = datetime.now().isoformat(timespec="seconds")
    parts = [HEADER.format(generated=generated, count=len(selected))]

    # Chunked multi-row INSERTs keep the file readable and the statement count sane.
    CHUNK = 200
    for i in range(0, len(selected), CHUNK):
        chunk = selected[i:i + CHUNK]
        values = ",\n    ".join(
            f"({i + n}, {r['course_id']}, {r['category_id']}, {q(r['created_at'])}, "
            f"{q(r['content'])}, "
            f"{q(r['academic_year_confirmed']) if r.get('academic_year_confirmed') else 'NULL'})"
            for n, r in enumerate(chunk)
        )
        parts.append("INSERT INTO wiki_comment_staging "
                     "(seq, course_id, category_id, created_at, content, academic_year) "
                     "VALUES\n    "
                     f"{values};\n")

    col = args.year_column
    parts.append(FOOTER.format(
        year_col=f", {col}" if col else "",
        year_val=", s.academic_year" if col else "",
        # Without the year in the key, a second cohort's identical verdict under a
        # different year would be treated as already present and skipped.
        year_dedup=(f"\n        AND cc.{col} IS NOT DISTINCT FROM s.academic_year" if col else ""),
    ))
    sql_file.write_text("\n".join(parts))
    rollback_file.write_text(ROLLBACK.format(generated=generated))

    by_cat = Counter(r["category_id"] for r in selected)
    explicit = sum(1 for r in selected if r.get("year_is_explicit"))
    print(f"{len(selected)} comments -> {sql_file}")
    print(f"  rollback -> {rollback_file}")
    print(f"  courses    : {len({r['course_code'] for r in selected})}")
    print(f"  by category: {dict(sorted(by_cat.items()))}")
    print(f"  with a [year] prefix (year found in the text): {explicit}")
    print(f"  no prefix (year unknown, created_at is the wiki revision date): "
          f"{len(selected) - explicit}")
    if skipped_oversize:
        print(f"  skipped {skipped_oversize} oversize rows (--skip-oversize)")
    elif any(r.get("oversize") for r in selected):
        n = sum(1 for r in selected if r.get("oversize"))
        print(f"  NOTE: {n} rows exceed 4000 chars and will render as a wall of text; "
              f"use --skip-oversize to hold them back")
    print("\nReview the SQL, then run it on liv (see the docstring at the top of this file).")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="command", required=True)
    p = sub.add_parser("sql", help="generate the import and rollback SQL")
    p.add_argument("--skip-oversize", action="store_true",
                   help="leave rows longer than 4000 chars out of the import")
    p.add_argument("--file", type=Path, default=IMPORT_JSON, help="input JSON")
    p.add_argument("--out-dir", type=Path, default=DATA_DIR, help="where to write the SQL")
    p.add_argument("--year-column", metavar="NAME", default=None,
                   help="also write academic_year_confirmed into this course_comment "
                        "column (e.g. --year-column academic_year). Omit until the "
                        "column exists; the year stays in the JSON either way.")
    p.set_defaults(func=cmd_sql)
    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
