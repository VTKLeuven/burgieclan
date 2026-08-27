#!/usr/bin/env python3
"""List the comments whose assigned academic year disagrees with a year in their text.

    python3 scripts/wiki_migration/review_year_conflicts.py            # human-readable
    python3 scripts/wiki_migration/review_year_conflicts.py --json     # for an LLM to read

Each entry carries a `row_key`. To correct one, put it in scripts/wiki_migration/year_overrides.json:

    { "a1b2c3d4e5f6": "2019-2020" }

then re-run `extract_wiki_comments.py build`. row_key is derived from the source page,
category and body text, so it survives a rebuild as long as the wiki text is unchanged.

These are WARNINGS, not blockers -- the import is valid without touching any of them.
Most are a review that legitimately mentions another year ("[Sinds 2019] Enkel
meerkeuzevragen"), where the assigned year is already right and no override is needed.
"""

import argparse
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
IMPORT_FILE = REPO_ROOT / "migration_data" / "wiki_comments_import.json"

PREFIX_RE = re.compile(r"^\[(\d{4}-\d{4})\]\s*")
YEAR_RE = re.compile(r"\b(20[0-2]\d\s*[-/–]\s*(?:20)?[0-2]\d|20[0-2]\d)\b")


def mask_false_years(text):
    t = re.sub(r"\b(?:[01]?\d|20)\s*/\s*20\b", " ", text)
    t = re.sub(r"\b\d{1,2}\s*[-–]\s*\d{1,2}\s*(?:u|uur|h|hrs?|hours?)\b", " ", t, flags=re.I)
    t = re.sub(r"\b\d+\s*[-–]\s*\d+\s*(?:blz|pag|pp|page|pages|slides?|sp|ects)\b", " ", t,
               flags=re.I)
    return t


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    ap.add_argument("--limit", type=int, help="only the first N conflicts")
    ap.add_argument("--chars", type=int, default=700, help="body characters to show")
    args = ap.parse_args()

    if not IMPORT_FILE.exists():
        sys.exit(f"missing {IMPORT_FILE}. Run `extract_wiki_comments.py build` first.")
    rows = json.loads(IMPORT_FILE.read_text())

    out = []
    for r in rows:
        body = PREFIX_RE.sub("", r["content"])
        assigned = r["academic_year"]
        parts = assigned.split("-")
        ok = set(parts) | {p[-2:] for p in parts} | {assigned, f"{parts[0][-2:]}-{parts[1][-2:]}"}
        found = {t.strip() for t in YEAR_RE.findall(mask_false_years(body))}
        conflicting = sorted(found - ok)
        if not conflicting:
            continue
        out.append({
            "row_key": r["row_key"],
            "course_code": r["course_code"],
            "course_name": r["course_name"],
            "category_id": r["category_id"],
            "assigned_year": assigned,
            "year_source": r["year_source"],
            "other_years_in_text": conflicting,
            "source_page": r["source_page"],
            "source_heading": r["source_heading"],
            "grouped_blocks": r.get("grouped_blocks", 1),
            "body": body[:args.chars],
            "body_truncated": len(body) > args.chars,
        })

    if args.limit:
        out = out[:args.limit]

    if args.json:
        print(json.dumps(out, indent=2, ensure_ascii=False))
        return

    print(f"{len(out)} of {len(rows)} comments have a year in the body that differs "
          f"from the assigned year.\n")
    for e in out:
        print("=" * 78)
        print(f"row_key {e['row_key']}  {e['course_code']} ({e['course_name']})  "
              f"cat={e['category_id']}")
        print(f"  assigned {e['assigned_year']} (from {e['year_source']}), "
              f"body also mentions {e['other_years_in_text']}")
        print(f"  page {e['source_page']} / heading {e['source_heading']!r}")
        print(f"  {e['body']}{' ...' if e['body_truncated'] else ''}")
    print("\nOverride only where the assigned year is actually wrong; see the module "
          "docstring for the file format.")


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:
        # piping into head/less closes stdout early; that is not an error
        sys.stdout = None
