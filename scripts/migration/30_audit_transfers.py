#!/usr/bin/env python3
"""
30_audit_transfers.py - one read-only audit of every file and course transfer.

The migration moved files between courses in several passes (classification, the
import itself, scripts 16 and 17, later link SQL), and each pass only reported on
itself. This script puts them side by side, per file and per course, and checks the
result against the two independent sources of truth we have:

  * the original Seafile path - where students themselves put the file, and which
    course code the folder names;
  * KU Leuven's offering years per code (raw/course_offering_years.json) - whether
    the course a file sits on actually ran in the year the file is from.

It never writes to any database. Inputs (all under --data, default ../../migration_data):

  manifest_final_for_import.jsonl          course per file as first imported
  manifest_final_standardized_validated.json  course per file after script 16
  prod_curriculum_2026-11-06.sql           courses, links, modules on prod (pg_dump)
  link_predecessors_2.sql                  links added on prod on 2026-11-10
  raw/course_offering_years.json           KU offering years per code
  wiki_comments_import.json                imported wiki comments
  wiki_documents_final_import_plan.json    imported wiki documents

Without --prod-docs the "current" course per file is a reconstruction: the script-16
manifest with script 17's rules replayed. With --prod-docs (a CSV export of the live
document table, see the report) it is what prod actually holds, and every flag
below is about the real site.

    python3 scripts/migration/30_audit_transfers.py
    python3 scripts/migration/30_audit_transfers.py --prod-docs migration_data/prod_documents.csv
"""
import argparse
import collections
import csv
import json
import re
from pathlib import Path

CODE_RX = re.compile(r'(?<![A-Z0-9])([A-Z][0-9][0-9A-Z]{3}[A-Z])(?![A-Z0-9])')
YEAR_RX = re.compile(r'(20\d\d)\s*-\s*(20\d\d)')

# Script 16 and 17 decided by checking whether a word occurs anywhere in the path.
# These are the words that could move a file without its folder naming the code.
SCRIPT16_KEYWORDS = {
    'gegevensbanken': 'H01O9A', 'numerieke modellering in de mechanica': 'H00R8A',
    'aandrijftechniek': 'H00R7A', 'cad': 'H00S8B', 'tweefasenstroming': 'H04Y9A',
}


def parse_copy_blocks(sql_path):
    """Read the COPY ... FROM stdin blocks of a pg_dump into {table: [row dicts]}."""
    tables, current, cols = {}, None, None
    with open(sql_path, encoding='utf-8') as f:
        for line in f:
            if current is None:
                m = re.match(r'COPY public\.(\w+) \((.*)\) FROM stdin;', line)
                if m:
                    current, cols = m.group(1), [c.strip().strip('"') for c in m.group(2).split(',')]
                    tables[current] = []
                continue
            if line.startswith('\\.'):
                current = None
                continue
            values = [None if v == '\\N' else v for v in line.rstrip('\n').split('\t')]
            tables[current].append(dict(zip(cols, values)))
    return tables


def parse_added_links(sql_path):
    """The INSERTs in link_predecessors_2.sql, as (kind, source_code, target_code)."""
    links = []
    if not sql_path.exists():
        return links
    for line in sql_path.read_text(encoding='utf-8').splitlines():
        m = re.search(r"INSERT INTO (course_course|course_identical_courses).*?code = '(\w+)' AND \w+\.code = '(\w+)'", line)
        if m:
            links.append((m.group(1), m.group(2), m.group(3)))
    return links


def year_start(value):
    if not value:
        return None
    m = YEAR_RX.search(str(value))
    return int(m.group(1)) if m else None


def replay_script17(code, full):
    """Script 17's segregation rules, verbatim, so the reconstruction matches what ran."""
    if code in ('H0H00A', 'H00Q0A'):
        if 'thermische systemen' in full or 'h00q0a' in full or 'fase 2' in full:
            return 'H00Q0A'
        if 'thermal systems' in full or 'h0h00a' in full:
            return 'H0H00A'
    elif code in ('H04S6A', 'H00R7A'):
        if 'aandrijftechniek' in full or 'h00r7a' in full or 'h04s7a' in full or 'h04s9a' in full:
            return 'H00R7A'
        if 'mechanical drive' in full or 'h04s6a' in full:
            return 'H04S6A'
    elif code in ('H0P86A', 'H06M6A'):
        if 'bouwfysica' in full or 'h06m6a' in full:
            return 'H06M6A'
        if 'bouwakoestiek' in full or 'h0p86a' in full:
            return 'H0P86A'
    elif code in ('H0V09A', 'H01E4A'):
        if 'h01e4a' in full or ('geologie' in full and 'toegepaste geologie' not in full and 'h0v09a' not in full):
            return 'H01E4A'
        return 'H0V09A'
    elif code in ('H0H51A', 'H08W3A'):
        if 'sterkteleer 3' in full or 'h08w3a' in full:
            return 'H08W3A'
        if 'elasticiteit' in full or 'h0h51a' in full:
            return 'H0H51A'
    elif code in ('H03Y1A', 'H07S3A'):
        if 'h07s3a' in full:
            return 'H07S3A'
        if 'h03y1a' in full:
            return 'H03Y1A'
    elif code in ('H0N71B', 'H01H5A'):
        if 'h01h5a' in full:
            return 'H01H5A'
        if 'h0n71b' in full or 'grondmechanica' in full:
            return 'H0N71B'
    return code


def main():
    here = Path(__file__).resolve()
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[1])
    ap.add_argument('--data', default=str(here.parents[2] / 'migration_data'))
    ap.add_argument('--curriculum', help='pg_dump of course tables (default: prod_curriculum_2026-11-06.sql)')
    ap.add_argument('--prod-docs', help='CSV export of prod documents (id, seafile_file_id, course_code, year, ...)')
    ap.add_argument('--out', help='output JSON (default: <data>/transfer_audit.json)')
    args = ap.parse_args()
    data = Path(args.data)

    # ---- Courses, links and curriculum placement --------------------------------
    cur = parse_copy_blocks(Path(args.curriculum) if args.curriculum else data / 'prod_curriculum_2026-11-06.sql')
    by_id = {r['id']: r for r in cur['course']}
    course = {r['code'].upper(): r for r in cur['course']}
    in_curriculum = {by_id[r['course_id']]['code'].upper() for r in cur['module_course'] if r['course_id'] in by_id}

    old_of, new_of, ident = (collections.defaultdict(set) for _ in range(3))
    for r in cur['course_course']:  # source = new, target = old
        n, o = by_id[r['course_source']]['code'].upper(), by_id[r['course_target']]['code'].upper()
        old_of[n].add(o)
        new_of[o].add(n)
    for r in cur['course_identical_courses']:
        a, b = by_id[r['course_source']]['code'].upper(), by_id[r['course_target']]['code'].upper()
        ident[a].add(b)
        ident[b].add(a)
    added = parse_added_links(data / 'link_predecessors_2.sql')
    for kind, a, b in added:
        if kind == 'course_course':
            old_of[a].add(b)
            new_of[b].add(a)
        else:
            ident[a].add(b)
            ident[b].add(a)

    def family(code):
        """Every course reachable through predecessor/successor/identical links."""
        seen, todo = {code}, [code]
        while todo:
            c = todo.pop()
            for nxt in old_of[c] | new_of[c] | ident[c]:
                if nxt not in seen:
                    seen.add(nxt)
                    todo.append(nxt)
        return seen

    offering = {k.upper(): set(v) for k, v in json.loads((data / 'raw' / 'course_offering_years.json').read_text()).items()}

    # ---- Files: course at each stage --------------------------------------------
    imported = collections.defaultdict(set)
    imported_rec = {}
    with open(data / 'manifest_final_for_import.jsonl', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                r = json.loads(line)
                imported[r['file_id']].add((r.get('course_code') or '').upper())
                imported_rec.setdefault(r['file_id'], r)
    after16 = json.loads((data / 'manifest_final_standardized_validated.json').read_text())

    files = {}
    for r in after16:
        full = f"{r.get('path', '')}/{r.get('filename', '')}".lower()
        c16 = (r.get('course_code') or '').upper()
        files[r['file_id']] = {
            'file_id': r['file_id'],
            'repo': r.get('repo_name'),
            'path': r.get('path', ''),
            'name': r.get('display_title') or r.get('filename'),
            'year': r.get('year'),
            'bundle': bool(r.get('is_bundled_zip') or r.get('bundled_source_files')),
            'at_import': sorted(imported.get(r['file_id'], set())) or None,
            'after16': c16,
            'after17': replay_script17(c16, full),
        }
    for fid, r in imported_rec.items():  # imported, but gone from the later manifest (bundled or deduplicated)
        if fid not in files:
            files[fid] = {
                'file_id': fid, 'repo': r.get('repo_name'), 'path': r.get('path', ''),
                'name': r.get('display_title') or r.get('filename'), 'year': r.get('year'), 'bundle': False,
                'at_import': sorted(imported[fid]), 'after16': None, 'after17': None, 'not_in_later_manifest': True,
            }

    source = 'reconstruction (script-16 manifest + script 17 replayed)'
    prod_rows = None
    if args.prod_docs:
        source = f'prod export {Path(args.prod_docs).name}'
        prod_rows = list(csv.DictReader(open(args.prod_docs, encoding='utf-8')))
        on_prod = collections.defaultdict(list)
        for row in prod_rows:
            if row.get('seafile_file_id'):
                on_prod[row['seafile_file_id']].append(row)
        for fid, f in files.items():
            rows = on_prod.get(fid, [])
            f['current'] = sorted({r['course_code'].upper() for r in rows}) or None
            if rows:
                f['year'] = rows[0].get('year') or f['year']
    else:
        for f in files.values():
            if f.get('not_in_later_manifest'):
                f['current'] = f['at_import']
            else:
                f['current'] = [f['after17']] if f['after17'] else None

    # ---- Per-file checks ---------------------------------------------------------
    flags = collections.Counter()
    for f in files.values():
        f['flags'] = []
        codes_in_path = [c for c in CODE_RX.findall(f['path'].upper()) if c in course]
        f['folder_code'] = codes_in_path[-1] if codes_in_path else None  # deepest folder that names a code
        cur_codes = f['current'] or []
        # Prod was imported from the later (bundled) manifest, so a file that only the
        # first manifest has was folded into a zip/PDF or dropped as a duplicate before
        # import. Its absence is expected; a later-manifest file missing from prod is not.
        if not cur_codes and not f.get('not_in_later_manifest'):
            f['flags'].append('missing_on_prod' if prod_rows is not None else 'not_on_site')
        for c in cur_codes:
            if c not in course:
                # The course row is gone from prod. document.course_id has no ON DELETE, so
                # Postgres refused the delete while files were attached: they were moved
                # first, and only a prod export says where to.
                f['flags'].append('course_deleted:' + c)
        # Did a later pass move it, and on what grounds?
        if f['at_import'] and cur_codes and set(cur_codes) != set(f['at_import']):
            f['moved'] = f"{'/'.join(f['at_import'])} -> {'/'.join(cur_codes)}"
            full = f['path'].lower()
            for c in cur_codes:
                if c.lower() not in full and c not in codes_in_path:
                    hits = [k for k, v in SCRIPT16_KEYWORDS.items() if v == c and k in full]
                    f['flags'].append('moved_by_keyword:' + (','.join(hits) or 'rule'))
        # Folder names one course, file sits on another
        if f['folder_code'] and cur_codes and f['folder_code'] not in cur_codes and not any(
                c in codes_in_path for c in cur_codes):
            if any(f['folder_code'] in family(c) for c in cur_codes):
                f['flags'].append('folder_code_related')   # combined with a linked course
            else:
                f['flags'].append('folder_code_unrelated')  # likely on the wrong course
        # Year the course did not run. The KU archive only reaches 2010-2025, so a file
        # from outside that window cannot be judged and is left alone.
        ys = year_start(f['year'])
        for c in cur_codes:
            if ys and 2010 <= ys <= 2025 and offering.get(c) and ys not in offering[c]:
                better = sorted(x for x in family(c) - {c} if ys in offering.get(x, ()))
                f['flags'].append('year_not_offered' + (':' + '/'.join(better) if better else ''))
        for fl in f['flags']:
            flags[fl.split(':')[0]] += 1

    # ---- Per-course checks -------------------------------------------------------
    per_course = collections.defaultdict(lambda: {'docs': 0, 'years': collections.Counter(), 'flagged': 0})
    for f in files.values():
        for c in f['current'] or []:
            pc = per_course[c]
            pc['docs'] += 1
            pc['years'][year_start(f['year'])] += 1
            pc['flagged'] += bool(f['flags'])

    comments = collections.Counter(
        (c.get('course_code') or '').upper() for c in json.loads((data / 'wiki_comments_import.json').read_text()))
    wiki_docs = collections.Counter()
    wd = data / 'wiki_documents_final_import_plan.json'
    if wd.exists():
        for r in json.loads(wd.read_text())['records']:
            wiki_docs[(r.get('course_code') or '').upper()] += 1

    # Courses that were on prod in August and are gone now, and - with a prod export -
    # where the files they held in the imported manifest are today.
    deleted = []
    aug_dump = data / 'prod_dump_no_documents.sql'
    if aug_dump.exists():
        aug = parse_copy_blocks(aug_dump)
        for r in aug.get('course', []):
            code = r['code'].upper()
            if code not in course:
                held = [f for f in files.values() if f['after16'] == code]
                went = collections.Counter('/'.join(f['current'] or ['not on prod']) for f in held)
                deleted.append({'code': code, 'name': r.get('name_nl') or r.get('name'),
                                'files': len(held), 'now_on': went.most_common() if prod_rows is not None else None,
                                'comments': comments.get(code, 0), 'wiki_docs': wiki_docs.get(code, 0)})

    courses_out = []
    link_issues = []
    for code, r in sorted(course.items()):
        pc = per_course.get(code, {'docs': 0, 'years': collections.Counter(), 'flagged': 0})
        off = sorted(offering.get(code, ()))
        row = {
            'code': code, 'name': r.get('name_nl') or r.get('name'),
            'in_curriculum': code in in_curriculum,
            'docs': pc['docs'], 'flagged_docs': pc['flagged'],
            'wiki_docs': wiki_docs.get(code, 0), 'comments': comments.get(code, 0),
            'doc_years': [y for y in sorted(k for k in pc['years'] if k)],
            'offered': [off[0], off[-1]] if off else None,
            'old': sorted(old_of[code]), 'new': sorted(new_of[code]), 'identical': sorted(ident[code]),
            'issues': [],
        }
        material = row['docs'] + row['wiki_docs'] + row['comments']
        if not row['in_curriculum'] and material and not row['new'] and not row['identical']:
            row['issues'].append('orphan')  # only reachable through search
        if row['in_curriculum'] and row['docs'] == 0 and any(per_course.get(o, {}).get('docs', 0) for o in row['old']):
            row['issues'].append('empty_successor')
        if len(row['old']) > 1:
            row['issues'].append('multiple_predecessors')
        courses_out.append(row)

        for o in sorted(old_of[code]):
            oo, no = offering.get(o, set()), offering.get(code, set())
            overlap = sorted(oo & no)
            kinds = []
            if code in old_of.get(o, ()):
                kinds.append('both_directions')
            if o in ident[code]:
                kinds.append('also_identical')
            if len(overlap) >= 3:
                kinds.append(f'ran_in_parallel_{len(overlap)}y')
            if oo and no and min(oo) > min(no) + 2:
                kinds.append('old_started_later')
            if kinds:
                link_issues.append({'new': code, 'old': o, 'issues': kinds, 'overlap': [overlap[0], overlap[-1]] if overlap else None})

    out = {
        'source': source,
        'counts': {
            'files': len(files), 'files_flagged': sum(1 for f in files.values() if f['flags']),
            'files_moved_after_import': sum(1 for f in files.values() if f.get('moved')),
            'by_flag': dict(flags.most_common()),
            'courses': len(course), 'courses_with_issues': sum(1 for c in courses_out if c['issues']),
            'links_predecessor': sum(len(v) for v in old_of.values()),
            'links_identical_pairs': sum(len(v) for v in ident.values()) // 2,
            'links_added_2026_11_10': len(added), 'link_issues': len(link_issues),
            'wiki_comments': sum(comments.values()), 'wiki_documents': sum(wiki_docs.values()),
        },
        'moves': collections.Counter(f['moved'] for f in files.values() if f.get('moved')).most_common(),
        'files': [f for f in files.values() if f['flags']],
        'courses': [c for c in courses_out if c['issues'] or c['old'] or c['new'] or c['identical']],
        'link_issues': link_issues,
        'deleted_courses': sorted(deleted, key=lambda d: -d['files']),
    }
    out['counts']['courses_deleted_since_aug'] = len(deleted)
    out_path = Path(args.out) if args.out else data / 'transfer_audit.json'
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=1, default=list))
    print(f'Source of "current": {source}')
    for k, v in out['counts'].items():
        print(f'  {k}: {v}')
    print(f'Wrote {out_path}')


if __name__ == '__main__':
    main()
