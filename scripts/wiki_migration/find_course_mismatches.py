#!/usr/bin/env python3
"""Find wiki content that landed on the wrong Burgieclan course, or on none at all.

Two ways a course code goes wrong between the wiki and Burgieclan:

  A. The wiki page's code is not in Burgieclan at all, so its comments were dropped.
  B. The code IS in Burgieclan, but that row is a superseded duplicate: the same course
     also exists under a newer code, and the comments landed on the old row that nobody
     browses. Toegepaste mechanica is this case -- H01B0A holds 46 comments while the
     current H01B0B holds none.

Neither can be resolved automatically: matching on course name alone was tried and mapped
"Ingenieur en bouwkunst" onto an unrelated course. This prints candidates ranked by how
many comments are at stake, for a human to accept into course_code_aliases.json.

    python3 scripts/wiki_migration/find_course_mismatches.py           # both, ranked
    python3 scripts/wiki_migration/find_course_mismatches.py --json    # machine-readable
"""

import argparse
import collections
import difflib
import json
import re
import sys
import unicodedata
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA = REPO_ROOT / "migration_data"
RAW = DATA / "raw"

MIN_SIMILARITY = 0.72


def norm(name):
    n = unicodedata.normalize("NFKD", name.lower())
    n = re.sub(r"\((?:b-kul-)?[a-z0-9]{5,12}\)", " ", n)   # strip a course code
    n = re.sub(r"\b(deel|part|i|ii|iii)\b", " ", n)
    return re.sub(r"[^a-z0-9]+", " ", n).strip()


def load():
    for f in ("wiki_pages.json", "burgieclan_courses.json"):
        if not (RAW / f).exists():
            sys.exit(f"missing {RAW / f}; run extract_wiki_comments.py dump first.")
    return (json.loads((RAW / "wiki_pages.json").read_text()),
            json.loads((RAW / "burgieclan_courses.json").read_text()),
            json.loads((DATA / "wiki_comments_report.json").read_text()),
            json.loads((DATA / "wiki_comments_import.json").read_text()))


# Measured against pages that did import: grouped exam sessions collapse many blocks
# into one comment, so blocks over-count final comments by roughly 2x.
BLOCKS_PER_COMMENT = 1.95


def count_blocks(page_text):
    """Text blocks on the page. Only a ranking signal -- see BLOCKS_PER_COMMENT."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import extract_wiki_comments as ex
    n = 0
    for m in ex.HEADING_RE.finditer(page_text or ""):
        end = page_text.find("\n=", m.end())
        sec = page_text[m.end(): end if end > 0 else len(page_text)]
        n += sum(1 for b in ex.split_blocks(sec)
                 if len(ex.clean_wikitext(b)) >= ex.MIN_COMMENT_CHARS)
    return n


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--limit", type=int, default=25)
    args = ap.parse_args()

    pages, courses, report, rows = load()
    by_code = {c["code"].strip().upper(): c for c in courses}
    per_code = collections.Counter(r["course_code"] for r in rows)
    page_by_title = {p["title"]: p.get("text", "") for p in pages}

    # ---- A. dropped: code absent from Burgieclan --------------------------------------
    names = {norm(c["name"]): c for c in courses}
    unmatched = []
    for d in report["dropped_pages"]:
        if not d["reason"].startswith("course_code_not_in_burgieclan"):
            continue
        title = d["title"]
        wiki_code = d["reason"].split(":", 1)[1]
        key = norm(title.replace("_", " "))
        hit = difflib.get_close_matches(key, names, n=1, cutoff=MIN_SIMILARITY)
        cand = names[hit[0]] if hit else None
        unmatched.append({
            "wiki_page": title, "wiki_code": wiki_code,
            "comments_at_stake": count_blocks(page_by_title.get(title, "")),
            "suggested_code": cand["code"] if cand else None,
            "suggested_name": cand["name"] if cand else None,
            "similarity": round(difflib.SequenceMatcher(None, key, hit[0]).ratio(), 2)
                          if hit else 0.0,
        })
    unmatched.sort(key=lambda e: (-e["comments_at_stake"], e["wiki_page"]))

    # ---- B. landed on a superseded duplicate ------------------------------------------
    clusters = collections.defaultdict(list)
    for c in courses:
        clusters[norm(c["name"])].append(c)
    misplaced = []
    for group in clusters.values():
        if len(group) < 2:
            continue
        counts = {c["code"]: per_code.get(c["code"], 0) for c in group}
        if not any(counts.values()):
            continue
        # The newest code is the one students browse; codes sort naturally by suffix.
        newest = max(group, key=lambda c: c["code"])
        holders = [c for c in group if counts[c["code"]] and c["code"] != newest["code"]]
        if holders:
            misplaced.append({
                "name": newest["name"],
                "current_code": newest["code"],
                "current_has": counts[newest["code"]],
                "comments_on_old": sum(counts[c["code"]] for c in holders),
                "old": [{"code": c["code"], "name": c["name"], "comments": counts[c["code"]]}
                        for c in holders],
            })
    misplaced.sort(key=lambda e: -e["comments_on_old"])

    if args.json:
        print(json.dumps({"dropped_codes": unmatched, "superseded": misplaced},
                         indent=2, ensure_ascii=False))
        return

    print("=" * 78)
    print("B. COMMENTS ON A SUPERSEDED COURSE ROW")
    print("=" * 78)
    print(f"{len(misplaced)} clusters, {sum(e['comments_on_old'] for e in misplaced)} "
          f"comments sitting on an old code.\n")
    for e in misplaced[:args.limit]:
        print(f"  {e['name'][:60]}")
        print(f"     current  {e['current_code']}  {e['current_has']:>4} comments")
        for o in e["old"]:
            print(f"     old      {o['code']}  {o['comments']:>4} comments   ({o['name'][:40]})")
    print("\n  Same name can still mean two real courses (different faculties). Check "
          "before aliasing.")

    print("\n" + "=" * 78)
    print("A. WIKI CODES ABSENT FROM BURGIECLAN")
    print("=" * 78)
    withc = [e for e in unmatched if e["suggested_code"]]
    print(f"{len(unmatched)} pages dropped; {len(withc)} have a plausible course by name.\n")
    for e in withc[:args.limit]:
        est = round(e["comments_at_stake"] / BLOCKS_PER_COMMENT)
        print(f"  ~{est:>4} comments  {e['wiki_code']} -> "
              f"{e['suggested_code']}  (sim {e['similarity']})")
        print(f"                  wiki: {e['wiki_page'][:62]}")
        print(f"                  bclan: {e['suggested_name'][:62]}")
    est_all = round(sum(e["comments_at_stake"] for e in withc) / BLOCKS_PER_COMMENT)
    lost = round(sum(e["comments_at_stake"] for e in unmatched
                     if not e["suggested_code"]) / BLOCKS_PER_COMMENT)
    print(f"\n  recoverable if every suggestion above is accepted: ~{est_all} comments")
    print(f"  {len(unmatched) - len(withc)} pages have no candidate (~{lost} comments); "
          f"most are genuinely discontinued courses.")
    print("\nAccept a mapping by adding \"OLD\": \"NEW\" to "
          "scripts/wiki_migration/course_code_aliases.json, then re-run build.")


if __name__ == "__main__":
    main()
