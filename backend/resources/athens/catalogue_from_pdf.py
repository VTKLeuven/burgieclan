#!/usr/bin/env python3
"""
Turns the faculty's ATHENS course catalogue (the PDF with the advice per study field) into the
"courses" of catalogue.json. See README.md next to this file for the whole yearly update.

    pdftotext -layout athens-course-catalogue.pdf catalogue.txt
    python3 catalogue_from_pdf.py catalogue.txt catalogue.json \
        --edition "2027-2028" --published 2027-09-06 --source "https://eng.kuleuven.be/...pdf" > new.json

Universities are recognised by the names the PDF uses ("sourceNames" in catalogue.json). A name
it does not know stops the script: add the university, or the new spelling, to catalogue.json.
The sessions are copied over unchanged; edit them by hand.
"""
import argparse
import json
import re
import sys

# The advice columns of the PDF, left to right, as programme codes (backend App\Constants\ExchangeProgram).
COLUMNS = {
    'AI': 'AI', 'Archi.Eng.': 'ARCH', 'Biom.Eng.': 'BMT', 'CivilEng.': 'BWK', 'Chem.Eng.': 'CIT',
    'Comp.Sc.': 'CW', 'Elec.Eng.': 'ELT', 'Energy': 'ENE', 'Mob.Supp.': 'MSCE', 'Material.Eng.': 'MTK',
    'Nano': 'NANO', 'Math.Eng.': 'WIT', 'Mech.Eng.': 'WTK',
}


def dump(catalogue: dict) -> str:
    """Like json.dumps(indent=2), but one line per session, university and course, so a yearly diff stays readable."""
    line = lambda value: json.dumps(value, ensure_ascii=False)
    out = ['{']
    keys = list(catalogue)
    for index, key in enumerate(keys):
        value = catalogue[key]
        comma = ',' if index < len(keys) - 1 else ''
        if isinstance(value, list):
            rows = [f'    {line(item)}' for item in value]
            out.append(f'  {line(key)}: [' + ('\n' + ',\n'.join(rows) + '\n  ' if rows else '') + f']{comma}')
        elif isinstance(value, dict):
            rows = [f'    {line(slug)}: {line(item)}' for slug, item in value.items()]
            out.append(f'  {line(key)}: {{\n' + ',\n'.join(rows) + f'\n  }}{comma}')
        else:
            out.append(f'  {line(key)}: {line(value)}{comma}')
    out.append('}')
    return '\n'.join(out) + '\n'


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('text', help='pdftotext -layout output of the catalogue')
    parser.add_argument('catalogue', help='the current catalogue.json, for the universities and sessions')
    parser.add_argument('--edition', required=True, help='academic year, e.g. "2027-2028"')
    parser.add_argument('--published', required=True, help='date on the PDF, YYYY-MM-DD')
    parser.add_argument('--source', required=True, help='URL of the PDF')
    args = parser.parse_args()

    current = json.load(open(args.catalogue, encoding='utf-8'))
    by_name = {}
    for slug, university in current['universities'].items():
        for name in [university['name'], *university.get('sourceNames', [])]:
            by_name[name.casefold()] = slug

    columns = None
    courses, problems = [], []
    for line in open(args.text, encoding='utf-8'):
        line = line.rstrip('\n')
        if not line.strip():
            continue
        if line.strip().startswith('Host University'):
            # The header repeats on every page; it gives the order of the advice columns.
            heads = re.findall(r'Advice\.?\s+(\S+)', line)
            unknown = [head for head in heads if head not in COLUMNS]
            if unknown:
                problems.append(f'unknown advice column(s) {unknown}: add them to COLUMNS')
            columns = [COLUMNS.get(head) for head in heads]
            continue
        if columns is None:
            continue
        match = re.match(r'^(.*?)((?:\s+(?:Yes|No)){%d})\s*$' % len(columns), line)
        parts = re.split(r'\s{2,}', match.group(1).strip()) if match else []
        if len(parts) != 4:
            problems.append(f'cannot read: {line.strip()}')
            continue
        host, code, title, evaluation = parts
        slug = by_name.get(host.casefold())
        if slug is None:
            problems.append(f'unknown university "{host}" ({code}): add it, or this spelling to its sourceNames')
            continue
        advice = match.group(2).split()
        courses.append({
            'code': code,
            'university': slug,
            'title': title,
            'evaluation': evaluation,
            'programs': [program for program, answer in zip(columns, advice) if program and answer == 'Yes'],
        })

    if problems:
        print('\n'.join(problems), file=sys.stderr)
        return 1

    current.update(edition=args.edition, published=args.published, source=args.source, courses=courses)
    sys.stdout.write(dump(current))
    print(f'{len(courses)} courses', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
