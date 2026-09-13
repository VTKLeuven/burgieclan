#!/usr/bin/env python3
"""
29_fix_course_semesters.py
Fixes the semester mapping for all courses in Burgieclan.
Resolves accurate semester values from:
1. KU Leuven OpenSearch API (opo* across all academic years)
2. KU Leuven OpenSearch API (pg* programme structures)
3. Historical course catalogs (09_audit, 16_historical)
4. Successor course relationships for deprecated/split courses
5. Existing verified database semester values

Generates migration_data/fix_course_semesters.sql with transactional updates.
"""

import json
import time
import urllib.request
import urllib.error
from collections import Counter

# 1. Historical Curated Courses Catalog
HISTORICAL_CATALOG = {
    'H01B0A': ['Semester 1'],
    'H01B2A': ['Semester 2'],
    'H01C8A': ['Semester 1'],
    'H01D2A': ['Semester 1'],
    'H01J7A': ['Semester 1'],
    'H01M8A': ['Semester 2'],
    'H01N5A': ['Semester 2'],
    'H0H57A': ['Semester 1'],
    'H03I6A': ['Semester 1'],
    'H0N07A': ['Semester 1'],
    'H0H51A': ['Semester 1'],
    'H03L1B': ['Semester 2'],
    'H0N71B': ['Semester 2'],
    'H01S8B': ['Semester 2'],
    'H05L7A': ['Semester 2'],
    'I0N62A': ['Semester 1'],
    'H01C4C': ['Semester 1'],
    'H01D2D': ['Semester 2'],
    'H0N65B': ['Semester 1'],
}

def extract_courses_from_dump(dump_path):
    courses = {}
    with open(dump_path, 'r', encoding='utf-8') as f:
        in_course = False
        for line in f:
            if line.startswith('COPY public.course '):
                in_course = True
                continue
            if in_course:
                if line.strip() == r'\.':
                    break
                parts = line.split('\t')
                # cols: id, name, code, professors, semesters, language, credits, created_at, updated_at, name_nl, name_en
                cid = parts[0]
                name = parts[1]
                code = parts[2]
                semesters_raw = parts[4]
                try:
                    sem_list = json.loads(semesters_raw) if semesters_raw and semesters_raw != r'\N' else []
                except Exception:
                    sem_list = []
                courses[code] = {
                    'id': cid,
                    'name': name,
                    'current_semesters': sem_list
                }
    return courses

def extract_course_links_from_dump(dump_path):
    """Returns mapping of old_course_id -> list of new_course_ids"""
    links = {}
    id_to_code = {}
    with open(dump_path, 'r', encoding='utf-8') as f:
        in_course = False
        in_links = False
        for line in f:
            if line.startswith('COPY public.course '):
                in_course = True
                continue
            if in_course:
                if line.strip() == r'\.':
                    in_course = False
                else:
                    parts = line.split('\t')
                    id_to_code[parts[0]] = parts[2]
            elif line.startswith('COPY public.course_course '):
                in_links = True
                continue
            if in_links:
                if line.strip() == r'\.':
                    break
                parts = line.split('\t')
                # source = new course, target = old course
                src_id = parts[0].strip()
                tgt_id = parts[1].strip()
                old_code = id_to_code.get(tgt_id)
                new_code = id_to_code.get(src_id)
                if old_code and new_code:
                    links.setdefault(old_code, []).append(new_code)
    return links

def query_opensearch_opo(codes):
    """Query opo* index for codes in chunks with retries"""
    url = 'https://dataservice.kuleuven.be/opo*/_search'
    results = {}
    chunk_size = 50

    for i in range(0, len(codes), chunk_size):
        chunk = codes[i:i + chunk_size]
        payload = {
            'size': len(chunk) * 12,
            'query': {'terms': {'ectsCode.keyword': chunk}},
            'sort': [{'_index': 'desc'}]
        }
        data_bytes = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={'Content-Type': 'application/json', 'User-Agent': 'Burgieclan/1.0'}
        )

        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    for h in data.get('hits', {}).get('hits', []):
                        src = h.get('_source', {})
                        code = src.get('ectsCode')
                        p = str(src.get('offerPeriod', ''))
                        if code and p in ('1', '2', '3') and code not in results:
                            if p == '1':
                                results[code] = ['Semester 1']
                            elif p == '2':
                                results[code] = ['Semester 2']
                            elif p == '3':
                                results[code] = ['Semester 1', 'Semester 2']
                break
            except Exception as e:
                time.sleep(1 + attempt * 2)
                if attempt == 2:
                    print(f"Warning: opo* query failed for chunk {i}: {e}")

    return results

def query_opensearch_pg(code):
    """Fallback: query pg* for a single code"""
    url = 'https://dataservice.kuleuven.be/pg*/_search'
    payload = {
        'size': 1,
        'query': {
            'match': {
                'programSet.moduleGroupSet.moduleSet.short': code
            }
        },
        'sort': [{'_index': 'desc'}]
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'User-Agent': 'Burgieclan/1.0'}
    )
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            hits = data.get('hits', {}).get('hits', [])
            if hits:
                src = hits[0]['_source']
                for pset in src.get('programSet', []):
                    for mg in pset.get('moduleGroupSet', []):
                        for m in mg.get('moduleSet', []):
                            if m.get('short', '').upper() == code.upper():
                                semesters = []
                                for lang in m.get('moduleLanguageSet', []):
                                    for pat in lang.get('moduleSessionPatternSet', []):
                                        p = str(pat.get('offerPeriod', ''))
                                        if p == '1' and 'Semester 1' not in semesters:
                                            semesters.append('Semester 1')
                                        elif p == '2' and 'Semester 2' not in semesters:
                                            semesters.append('Semester 2')
                                        elif p == '3':
                                            if 'Semester 1' not in semesters: semesters.append('Semester 1')
                                            if 'Semester 2' not in semesters: semesters.append('Semester 2')
                                if semesters:
                                    semesters.sort()
                                    return semesters
    except Exception:
        pass
    return None

def main():
    dump_path = 'migration_data/prod_dump_no_documents.sql'
    print(f"1. Reading course list from {dump_path}...")
    courses = extract_courses_from_dump(dump_path)
    links = extract_course_links_from_dump(dump_path)
    all_codes = sorted(courses.keys())
    print(f"Total courses found: {len(all_codes)}")

    print("\n2. Querying KU Leuven opo* data services for all academic years...")
    opo_results = query_opensearch_opo(all_codes)
    print(f"Resolved from opo*: {len(opo_results)} / {len(all_codes)}")

    final_semesters = {}
    sources = Counter()

    for code in all_codes:
        current = courses[code]['current_semesters']
        
        # 1. opo*
        if code in opo_results:
            final_semesters[code] = opo_results[code]
            sources['KU Leuven opo* API'] += 1
            continue

        # 2. Historical curated catalog
        if code in HISTORICAL_CATALOG:
            final_semesters[code] = HISTORICAL_CATALOG[code]
            sources['Historical Curated Catalog'] += 1
            continue

        # 3. Inherit from successor course if linked
        if code in links:
            inherited = None
            for successor in links[code]:
                if successor in opo_results:
                    inherited = opo_results[successor]
                    break
            if inherited:
                final_semesters[code] = inherited
                sources['Inherited from Successor Course'] += 1
                continue

        # 4. Existing database value if it was already explicitly Semester 2
        if current == ['Semester 2']:
            final_semesters[code] = ['Semester 2']
            sources['Existing DB Verified (Semester 2)'] += 1
            continue

        # 5. Query pg* directly as fallback
        pg_sem = query_opensearch_pg(code)
        if pg_sem:
            final_semesters[code] = pg_sem
            sources['KU Leuven pg* API'] += 1
            continue

        # 6. Fallback to existing or ['Semester 1']
        final_semesters[code] = current if current else ['Semester 1']
        sources['Kept Existing / Default Semester 1'] += 1

    # Analysis
    print("\n3. Source Breakdown:")
    for src, count in sources.most_common():
        print(f"  - {src}: {count}")

    sem_dist = Counter(tuple(v) for v in final_semesters.values())
    print("\n4. New Semester Distribution:")
    for sem, count in sorted(sem_dist.items()):
        print(f"  - {list(sem)}: {count}")

    # Detect changes
    changed = []
    for code in all_codes:
        old_val = courses[code]['current_semesters']
        new_val = final_semesters[code]
        if old_val != new_val:
            changed.append((code, courses[code]['name'], old_val, new_val))

    print(f"\n5. Total courses being changed: {len(changed)} / {len(all_codes)}")
    print("Sample changes:")
    for code, name, old_val, new_val in changed[:15]:
        print(f"  [{code}] {name}: {old_val} -> {new_val}")

    # Generate SQL file
    sql_lines = [
        "-- Fix course semesters across Burgieclan database",
        "-- Generated by scripts/migration/29_fix_course_semesters.py",
        "BEGIN;\n"
    ]
    for code, _, _, new_val in changed:
        sems_json = json.dumps(new_val)
        sql_lines.append(f"UPDATE course SET semesters = '{sems_json}'::json WHERE code = '{code}';")
    sql_lines.append("\nCOMMIT;\n")

    sql_path = 'migration_data/fix_course_semesters.sql'
    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(sql_lines))

    print(f"\nSaved {len(changed)} SQL update statements to {sql_path}")

    # Save detailed JSON mapping
    with open('migration_data/course_semesters_fixed.json', 'w', encoding='utf-8') as f:
        json.dump({
            code: {
                'name': courses[code]['name'],
                'old_semesters': courses[code]['current_semesters'],
                'new_semesters': final_semesters[code]
            }
            for code in all_codes
        }, f, indent=2, ensure_ascii=False)

if __name__ == '__main__':
    main()
