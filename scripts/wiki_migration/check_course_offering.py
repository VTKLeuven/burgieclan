#!/usr/bin/env python3
"""Ask KU Leuven's onderwijsaanbod which course codes are still offered.

For deciding what to do with wiki comments sitting under an old course code: is that code
still taught, or has it been replaced?

    python3 scripts/wiki_migration/check_course_offering.py            # report
    python3 scripts/wiki_migration/check_course_offering.py --json

Anonymous access to dataservice.kuleuven.be only permits the current year indices --
opo2024, opo2025, opo2026 at the time of writing; older ones return a security_exception.
So this answers "is this code current?", not "which year did it change?". A code absent
from all three stopped being offered before 2024, but the API will not say when.

Read-only, no authentication, and it only ever sends course codes.
"""

import argparse
import collections
import json
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA = REPO_ROOT / "migration_data"
RAW = DATA / "raw"

BASE = "https://dataservice.kuleuven.be"
# Probed rather than hardcoded: the aliases roll every 15 July, and which years are
# readable anonymously changes with them.
CANDIDATE_YEARS = [2023, 2024, 2025, 2026, 2027]
CHUNK = 200


def search(index, body, timeout=30):
    req = urllib.request.Request(
        f"{BASE}/{index}/_search", method="POST",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode())
    except Exception:
        return None


def readable_years():
    years = []
    for y in CANDIDATE_YEARS:
        res = search(f"opo{y}", {"size": 0})
        if res and "hits" in res:
            years.append(y)
    return years


def codes_offered(codes, years):
    """{code: [years it appears in]} for the years we are allowed to read."""
    found = collections.defaultdict(list)
    for y in years:
        for i in range(0, len(codes), CHUNK):
            chunk = codes[i:i + CHUNK]
            res = search(f"opo{y}", {
                "size": len(chunk),
                "query": {"terms": {"ectsCode.keyword": chunk}},
                "_source": ["ectsCode"],
            })
            if not res:
                print(f"  warning: opo{y} chunk {i // CHUNK} failed", file=sys.stderr)
                continue
            for hit in res.get("hits", {}).get("hits", []):
                code = (hit.get("_source", {}).get("ectsCode") or "").upper()
                if code:
                    found[code].append(y)
    return found


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    courses = json.loads((RAW / "burgieclan_courses.json").read_text())
    report = json.loads((DATA / "wiki_comments_report.json").read_text())
    rows = json.loads((DATA / "wiki_comments_import.json").read_text())

    years = readable_years()
    if not years:
        sys.exit("no opo index is readable anonymously; the API may be down.")
    print(f"readable year indices: {', '.join('opo%d' % y for y in years)}\n", file=sys.stderr)

    bclan = sorted({c["code"].strip().upper() for c in courses})
    dropped = sorted({d["reason"].split(":", 1)[1] for d in report["dropped_pages"]
                      if d["reason"].startswith("course_code_not_in_burgieclan")})
    offered = codes_offered(sorted(set(bclan) | set(dropped)), years)

    per = collections.Counter(r["course_code"] for r in rows)
    by_code = {c["code"].strip().upper(): c for c in courses}

    out = {
        "readable_years": years,
        "burgieclan_current": sorted(c for c in bclan if offered.get(c)),
        "burgieclan_discontinued": sorted(c for c in bclan if not offered.get(c)),
        "wiki_only_current": sorted(c for c in dropped if offered.get(c)),
        "wiki_only_discontinued": sorted(c for c in dropped if not offered.get(c)),
    }
    if args.json:
        out["offered"] = {k: v for k, v in offered.items()}
        print(json.dumps(out, indent=2))
        return

    print("=" * 74)
    print("BURGIECLAN COURSES")
    print("=" * 74)
    print(f"  still offered      : {len(out['burgieclan_current'])}")
    print(f"  no longer offered  : {len(out['burgieclan_discontinued'])}")
    stale = [(c, per[c]) for c in out["burgieclan_discontinued"] if per[c]]
    stale.sort(key=lambda x: -x[1])
    print(f"  ...of those, holding wiki comments: {len(stale)} "
          f"({sum(n for _, n in stale)} comments)\n")
    for code, n in stale[:15]:
        print(f"    {code}  {n:>4} comments  {by_code[code]['name'][:46]}")

    print("\n" + "=" * 74)
    print("CODES ON THE WIKI BUT NOT IN BURGIECLAN")
    print("=" * 74)
    print(f"  still offered by KU Leuven : {len(out['wiki_only_current'])}"
          f"   <- these belong in Burgieclan")
    print(f"  no longer offered          : {len(out['wiki_only_discontinued'])}")
    for code in out["wiki_only_current"][:20]:
        print(f"    {code}  offered in {out and offered[code]}")


if __name__ == "__main__":
    main()
