#!/usr/bin/env python3
"""Find which academic years each course code was actually offered, from KU Leuven.

The onderwijsaanbod OpenSearch API only exposes the current three years anonymously, but
the public syllabus archive goes back much further and is year-addressable:

    https://onderwijsaanbod.kuleuven.be/archief/<year>/syllabi/n/<CODE>N.htm   (200 / 404)

That is enough to date a renumbering exactly. Toegepaste mechanica: H01B0A returns 200 for
2012-2017 and 404 after, H01B0B 404 before 2018 and 200 from 2018 on. So comments from
2018-2019 onward belong on H01B0B and everything earlier on H01B0A.

    python3 scripts/wiki_migration/probe_offering_years.py            # codes worth checking
    python3 scripts/wiki_migration/probe_offering_years.py --codes H01B0A,H01B0B
    python3 scripts/wiki_migration/probe_offering_years.py --suggest  # draft the alias file

Results cache to migration_data/raw/course_offering_years.json; cached codes are skipped
unless --refresh. Read-only HEAD-style requests against a public page.
"""

import argparse
import collections
import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA = REPO_ROOT / "migration_data"
RAW = DATA / "raw"
CACHE = RAW / "course_offering_years.json"

FIRST_YEAR, LAST_YEAR = 2010, 2025
# Dutch-taught courses live under /n/ and English-taught under /e/; a code only ever
# appears in one of them, so both are tried. Missing this reported every English course
# ("Data Mining", H02C6A) as never offered.
URL = "https://onderwijsaanbod.kuleuven.be/archief/{year}/syllabi/{lang}/{code}{L}.htm"
WORKERS = 12


def offered(code, year, timeout=12):
    for lang, L in (("n", "N"), ("e", "E")):
        req = urllib.request.Request(
            URL.format(year=year, code=code, lang=lang, L=L), method="HEAD")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                if r.status == 200:
                    return True
        except Exception:
            continue
    return False


def probe(code):
    years = []
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for year, ok in zip(range(FIRST_YEAR, LAST_YEAR + 1),
                            pool.map(lambda y: offered(code, y),
                                     range(FIRST_YEAR, LAST_YEAR + 1))):
            if ok:
                years.append(year)
    return years


def norm(name):
    import re, unicodedata
    n = unicodedata.normalize("NFKD", name.lower())
    n = re.sub(r"\b(deel|part|i|ii|iii)\b", " ", n)
    return re.sub(r"[^a-z0-9]+", " ", n).strip()


def codes_worth_checking():
    """Codes in a name-cluster that holds wiki comments: the renumbering candidates."""
    courses = json.loads((RAW / "burgieclan_courses.json").read_text())
    rows = json.loads((DATA / "wiki_comments_import.json").read_text())
    per = collections.Counter(r["course_code"] for r in rows)
    clusters = collections.defaultdict(list)
    for c in courses:
        clusters[norm(c["name"])].append(c)
    out = []
    for group in clusters.values():
        if len(group) > 1 and any(per.get(c["code"], 0) for c in group):
            out += [c["code"].strip().upper() for c in group]
    return sorted(set(out))


def academic(year):
    """Offering year 2018 means academic year 2018-2019."""
    return f"{year}-{year + 1}"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--codes", help="comma-separated codes instead of the default set")
    ap.add_argument("--refresh", action="store_true", help="re-probe cached codes")
    ap.add_argument("--suggest", action="store_true",
                    help="print a draft course_code_aliases.json from the results")
    args = ap.parse_args()

    RAW.mkdir(parents=True, exist_ok=True)
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}

    codes = ([c.strip().upper() for c in args.codes.split(",")] if args.codes
             else codes_worth_checking())
    todo = [c for c in codes if args.refresh or c not in cache]
    print(f"{len(codes)} codes, {len(todo)} to probe "
          f"({(LAST_YEAR - FIRST_YEAR + 1)} years each)", file=sys.stderr)

    for i, code in enumerate(todo, 1):
        cache[code] = probe(code)
        if i % 10 == 0 or i == len(todo):
            print(f"  {i}/{len(todo)}", file=sys.stderr, flush=True)
            CACHE.write_text(json.dumps(cache, indent=1, sort_keys=True))
    CACHE.write_text(json.dumps(cache, indent=1, sort_keys=True))

    def span(c):
        y = cache.get(c) or []
        return f"{y[0]}-{y[-1]}" if y else "never found"

    if not args.suggest:
        print(f"\n{'code':9} {'offered':14} years")
        for c in codes:
            print(f"  {c:9} {span(c):14} {cache.get(c) or []}")
        print(f"\ncached -> {CACHE}")
        return

    # Draft aliases: within a name-cluster, route each year to the code offered then.
    courses = json.loads((RAW / "burgieclan_courses.json").read_text())
    clusters = collections.defaultdict(list)
    for c in courses:
        if c["code"].strip().upper() in cache:
            clusters[norm(c["name"])].append(c)
    draft = {}
    for group in clusters.values():
        got = [(c, cache.get(c["code"].strip().upper()) or []) for c in group]
        got = [(c, y) for c, y in got if y]
        if len(got) < 2:
            continue
        got.sort(key=lambda e: e[1][0])
        older, newer = got[0], got[-1]
        if older[1][-1] < newer[1][0]:          # clean handover, no overlap
            draft[older[0]["code"].strip().upper()] = {
                "to": newer[0]["code"].strip().upper(),
                "from_academic_year": academic(newer[1][0]),
                "_evidence": f"{older[0]['code']} offered {older[1][0]}-{older[1][-1]}, "
                             f"{newer[0]['code']} from {newer[1][0]}",
            }
    print(json.dumps(draft, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
