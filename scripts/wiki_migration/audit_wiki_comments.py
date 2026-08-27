#!/usr/bin/env python3
"""Audit migration_data/wiki_comments_import.json before it goes anywhere near production.

Checks the things that can actually be wrong, and exits non-zero if any BLOCKER fires:

  BLOCKER  mangled openings      content starting mid-sentence (broken prefix stripping)
  BLOCKER  markup residue        leftover wiki/HTML syntax
  BLOCKER  duplicates            identical content within the same course + category
  BLOCKER  year prefix in text   a [YYYY-YYYY] left inside content (it belongs in its own field)
  BLOCKER  fabricated year      a guessed year exposed in academic_year_confirmed
  BLOCKER  bad references        unknown category id, missing course id, unparseable date
  WARN     year conflicts        a year in the body that disagrees with the assigned one
  WARN     oversize              rows the frontend will render as a wall of text
  WARN     fallback share        how much of the set has a guessed year

Usage:  python3 scripts/wiki_migration/audit_wiki_comments.py [--verbose]
"""

import argparse
import json
import os
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
IMPORT_FILE = REPO_ROOT / "migration_data" / "wiki_comments_import.json"

# The eight original categories plus the separate Examenvragen (10) category.
VALID_CATEGORIES = {2, 3, 4, 5, 6, 7, 8, 9, 10}
MAX_COMMENT_CHARS = 4000
FALLBACK_WARN_THRESHOLD = 0.50

PREFIX_RE = re.compile(r"^\[(\d{4}-\d{4})\]\s*")

# "..." is a legitimate opening (a student trailing off); a single leading "." or ":" is
# the signature of a botched prefix strip.
# "/!\" and "..." are things students actually write; a lone leading "." or ":", or a
# "/" straight onto a digit ("/2005 12u30"), is the signature of a botched prefix strip.
MANGLED_START_RE = re.compile(r"^(?:\.(?!\.)|[,;:)\]}–—]|/(?=\d))|^-\s")

# Only real HTML tag names count. Exam questions are full of maths and placeholders --
# "4 vormen <E", "x <K", "<wolk>", "<intermediate point>" -- which a generic `<[a-zA-Z]`
# pattern reports as markup residue. Wiki heading residue only counts at line start.
HTML_TAGS = (r"br|p|div|span|b|i|u|s|strong|em|ol|ul|li|dl|dt|dd|table|tbody|thead|tr|td|th|"
             r"pre|code|center|small|big|font|sub|sup|hr|blockquote|nowiki|ref|math|gallery|"
             r"h[1-6]|a|img|filelist|source|syntaxhighlight")
MARKUP_RE = re.compile(
    # Table markers count only at line start, where MediaWiki requires them. Inline
    # they are maths: "max{x,|y|}<=1", and bra-ket notation "{|(up)(up)>, |(up)(down)>}".
    # Nested subscript/superscript braces in math (AES_{K \oplus P_{i-1}}) are not template markup.
    r"^[ \t]*\{\||^[ \t]*\|\}|\[\[|\]\]|\{\{|(?<![_\^\\{])\}\}|'''"
    # The tag name must be followed by a real delimiter, or maths notation students
    # write in exam questions -- <A,B>, <A|B>, <A, B> -- reads as an <a> tag.
    rf"|</?(?:{HTML_TAGS})(?:\s[^<>]*)?/?>"
    # "==> therefore" is an arrow, not a heading.
    r"|^={2,}(?!>)",
    re.IGNORECASE | re.MULTILINE,
)
YEAR_IN_TEXT_RE = re.compile(r"\b(20[0-2]\d\s*[-/–]\s*(?:20)?[0-2]\d|20[0-2]\d)\b")


def body_of(content):
    return PREFIX_RE.sub("", content)


def norm(text):
    return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFKD", text.lower())).strip()


def mask_false_years(text):
    t = re.sub(r"\b(?:[01]?\d|20)\s*/\s*20\b", " ", text)
    t = re.sub(r"\b\d{1,2}\s*[-–]\s*\d{1,2}\s*(?:u|uur|h|hrs?|hours?)\b", " ", t, flags=re.I)
    t = re.sub(r"\b\d+\s*[-–]\s*\d+\s*(?:blz|pag|pp|page|pages|slides?|sp|ects)\b", " ", t, flags=re.I)
    return t


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--file", type=Path, default=IMPORT_FILE)
    ap.add_argument("--verbose", action="store_true", help="list every offending row")
    args = ap.parse_args()

    if not args.file.exists():
        sys.exit(f"missing {args.file}. Run `extract_wiki_comments.py build` first.")
    rows = json.loads(args.file.read_text())

    blockers = defaultdict(list)
    warnings = defaultdict(list)

    seen = {}
    for i, r in enumerate(rows):
        content = r.get("content", "")
        body = body_of(content)
        where = f"[{i}] {r.get('course_code')} cat={r.get('category_id')}"

        if MANGLED_START_RE.match(body):
            blockers["mangled_openings"].append(f"{where}: {body[:90]!r}")

        m = MARKUP_RE.search(content)
        if m:
            if m.group(0) == "}}" and "\\oplus" in content and "{{" not in content:
                pass
            else:
                blockers["markup_residue"].append(f"{where}: {m.group(0)!r} in {content[:90]!r}")

        # Same key the extractor dedups on: identical text under the same confirmed
        # year is a duplicate; under different confirmed years it is two cohorts.
        key = (r.get("course_id"), r.get("category_id"),
               r.get("academic_year_confirmed"), norm(content))
        if key in seen:
            blockers["duplicates"].append(f"{where}: same as row [{seen[key]}]: {content[:80]!r}")
        else:
            seen[key] = i

        # The year lives in academic_year_confirmed, never inside the text. A leftover
        # "[2019-2020] " prefix would be shown twice once the column is rendered.
        if PREFIX_RE.match(content):
            blockers["year_prefix_in_content"].append(f"{where}: {content[:80]!r}")

        confirmed = r.get("academic_year_confirmed")
        compact = confirmed.replace(" ", "") if confirmed else confirmed
        if r.get("year_is_explicit") and compact != r.get("academic_year"):
            blockers["bad_references"].append(
                f"{where}: explicit year but academic_year_confirmed={confirmed!r}")
        if not r.get("year_is_explicit") and confirmed is not None:
            # A guessed year must never reach the column students see.
            blockers["fabricated_year"].append(
                f"{where}: guessed year exposed as {confirmed!r}")
        # course_comment.academic_year is VARCHAR(11) in the form "2024 - 2025".
        if confirmed is not None and not re.fullmatch(r"20\d{2} - 20\d{2}", confirmed):
            blockers["bad_references"].append(f"{where}: malformed year {confirmed!r}")
        if confirmed is not None and len(confirmed) > 11:
            blockers["bad_references"].append(f"{where}: year too long for VARCHAR(11)")

        if r.get("category_id") not in VALID_CATEGORIES:
            blockers["bad_references"].append(f"{where}: category_id={r.get('category_id')!r}")
        if not isinstance(r.get("course_id"), int):
            blockers["bad_references"].append(f"{where}: course_id={r.get('course_id')!r}")
        try:
            datetime.strptime(r.get("created_at", ""), "%Y-%m-%d %H:%M:%S")
        except (ValueError, TypeError):
            blockers["bad_references"].append(f"{where}: created_at={r.get('created_at')!r}")
        if not body.strip():
            blockers["bad_references"].append(f"{where}: empty content")

        assigned = r.get("academic_year", "")
        parts = assigned.split("-")
        ok_tokens = set(parts) | {p[-2:] for p in parts} | {assigned,
                                                            f"{parts[0][-2:]}-{parts[-1][-2:]}"}
        found = {t.strip() for t in YEAR_IN_TEXT_RE.findall(mask_false_years(body))}
        conflicting = {t for t in found if t not in ok_tokens}
        if conflicting:
            warnings["year_conflicts"].append(
                f"{where}: assigned {assigned}, body mentions {sorted(conflicting)}")

        if len(content) > MAX_COMMENT_CHARS:
            warnings["oversize"].append(f"{where}: {len(content)} chars, page {r.get('source_page')}")

    total = len(rows)
    fallback = sum(1 for r in rows if not r.get("year_is_explicit", False))

    print("=" * 72)
    print(f"AUDIT  {args.file.name}  --  {total} comments, "
          f"{len({r.get('course_code') for r in rows})} courses")
    print("=" * 72)
    print("\nDistribution")
    print(f"  by category : {dict(sorted(Counter(r.get('category_id') for r in rows).items()))}")
    print(f"  by source   : {dict(Counter(r.get('year_source') for r in rows).most_common())}")
    print(f"  guessed year: {fallback}/{total} ({fallback / max(total, 1):.0%}) "
          f"-- these carry no [year] prefix")

    if fallback / max(total, 1) > FALLBACK_WARN_THRESHOLD:
        warnings["fallback_share"].append(
            f"{fallback / total:.0%} of rows have a guessed year (threshold "
            f"{FALLBACK_WARN_THRESHOLD:.0%})")

    print("\nBlockers")
    if not blockers:
        print("  none")
    for name, items in sorted(blockers.items()):
        print(f"  {name}: {len(items)}")
        for line in (items if args.verbose else items[:5]):
            print(f"      {line}")
        if not args.verbose and len(items) > 5:
            print(f"      ... {len(items) - 5} more (--verbose)")

    print("\nWarnings")
    if not warnings:
        print("  none")
    for name, items in sorted(warnings.items()):
        print(f"  {name}: {len(items)}")
        for line in (items if args.verbose else items[:5]):
            print(f"      {line}")
        if not args.verbose and len(items) > 5:
            print(f"      ... {len(items) - 5} more (--verbose)")

    print()
    if blockers:
        print(f"FAIL -- {sum(len(v) for v in blockers.values())} blocking issues. Do not import.")
        return 1
    print("PASS -- no blocking issues. Review the warnings, then import.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
