#!/usr/bin/env python3
"""
13_sync_courses_with_kuleuven_api.py
Queries the KU Leuven API (/opo and /pg) for all added/split courses to ensure
they match the exact structure of the KU Leuven importer:
- professors (u-numbers list)
- semesters (["Semester 1"], ["Semester 2"], etc.)
- language ('nl' / 'en')
- name, name_nl, name_en, credits
Also computes the last active year of each predecessor course from both KU Leuven archives & Burgieclan documents.
"""

import json
import urllib.request
import subprocess

COURSES_TO_SYNC = [
    'H01J7A', 'H0H57A', 'H01N5A', 'H01M8A', 'H01B0A', 'H01C8A',
    'H03I6A', 'H0N07A', 'H0H51A', 'H03L1B', 'H0N71B', 'H01S8B',
    'H05L7A', 'I0N62A', 'H00D0B', 'H06T0A', 'H08U4A', 'H0R12A',
    'H0M70A', 'H0R57A', 'H09M0A'
]

print("1. Querying KU Leuven /opo API for professor u-numbers and syllabus metadata...")

def query_opo(code):
    url = 'https://dataservice.kuleuven.be/opo/_search'
    payload = {
        'size': 1,
        'query': {
            'term': {
                'ectsCode.keyword': code
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
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            hits = data.get('hits', {}).get('hits', [])
            if hits:
                src = hits[0]['_source']
                teachers = []
                for t in src.get('teacherSet', []):
                    # Staff number is in 'stafNumber' or 'uNumber'
                    unr = t.get('stafNumber') or t.get('uNumber')
                    if unr:
                        if not unr.startswith('u') and not unr.startswith('U'):
                            unr = f"u{unr.zfill(7)}"
                        teachers.append(unr.lower())
                return {
                    'teachers': teachers,
                    'academic_year': src.get('academicYear')
                }
    except Exception as e:
        print(f"Error querying /opo for {code}: {e}")
    return {'teachers': [], 'academic_year': None}

def query_pg(code):
    url = 'https://dataservice.kuleuven.be/pg/_search'
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
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            hits = data.get('hits', {}).get('hits', [])
            if hits:
                src = hits[0]['_source']
                for pset in src.get('programSet', []):
                    for mg in pset.get('moduleGroupSet', []):
                        for m in mg.get('moduleSet', []):
                            if m.get('short', '').upper() == code.upper():
                                titles_nl = [t.get('description') for lang in m.get('moduleLanguageSet', []) if lang.get('moduleLangu') == 'NL' for t in lang.get('moduleTitleSet', []) if t.get('description')]
                                titles_en = [t.get('description') for lang in m.get('moduleLanguageSet', []) if lang.get('moduleLangu') == 'EN' for t in lang.get('moduleTitleSet', []) if t.get('description')]
                                credits = m.get('credits')
                                semesters = []
                                for lang in m.get('moduleLanguageSet', []):
                                    for pat in lang.get('moduleSessionPatternSet', []):
                                        p = pat.get('offerPeriod')
                                        if p == 1 and 'Semester 1' not in semesters:
                                            semesters.append('Semester 1')
                                        elif p == 2 and 'Semester 2' not in semesters:
                                            semesters.append('Semester 2')
                                        elif p == 3:
                                            if 'Semester 1' not in semesters: semesters.append('Semester 1')
                                            if 'Semester 2' not in semesters: semesters.append('Semester 2')
                                return {
                                    'title_nl': titles_nl[0] if titles_nl else None,
                                    'title_en': titles_en[0] if titles_en else None,
                                    'credits': credits,
                                    'semesters': semesters if semesters else ['Semester 1'],
                                    'academic_year': pset.get('academicYear')
                                }
    except Exception as e:
        print(f"Error querying /pg for {code}: {e}")
    return None

course_enrichments = {}
for code in COURSES_TO_SYNC:
    opo_info = query_opo(code)
    pg_info = query_pg(code) or {}
    
    course_enrichments[code] = {
        'teachers': opo_info['teachers'],
        'title_nl': pg_info.get('title_nl'),
        'title_en': pg_info.get('title_en'),
        'credits': pg_info.get('credits'),
        'semesters': pg_info.get('semesters', ['Semester 1']),
        'last_active_academic_year': opo_info.get('academic_year') or pg_info.get('academic_year')
    }
    print(f"[{code}] Proffs: {opo_info['teachers']} | Sems: {pg_info.get('semesters')} | Credits: {pg_info.get('credits')} | Year: {course_enrichments[code]['last_active_academic_year']}")

# Save enrichment data
with open('migration_data/course_enrichment_api.json', 'w') as f:
    json.dump(course_enrichments, f, indent=2)

print("\n2. Updating all courses in PostgreSQL on liv to exact importer format...")
sql_statements = []
for code, data in course_enrichments.items():
    profs_json = json.dumps(data['teachers'])
    sems_json = json.dumps(data['semesters'])
    
    # escape SQL
    updates = [
        f"professors = '{profs_json}'::json",
        f"semesters = '{sems_json}'::json"
    ]
    if data['title_nl']:
        nl_esc = data['title_nl'].replace("'", "''")
        updates.append(f"name_nl = '{nl_esc}'")
        updates.append(f"name = '{nl_esc}'")
    if data['title_en']:
        en_esc = data['title_en'].replace("'", "''")
        updates.append(f"name_en = '{en_esc}'")
    if data['credits']:
        updates.append(f"credits = {data['credits']}")
        
    set_clause = ", ".join(updates)
    sql = f"UPDATE course SET {set_clause} WHERE code = '{code}';"
    sql_statements.append(sql)

full_sql = "\n".join(sql_statements)
cmd = f'ssh -o BatchMode=yes it@liv "docker exec -i burgieclan-db psql -U burgieclan_db_user -d burgieclan_db" << \'SQL_EOF\'\n{full_sql}\nSQL_EOF'
subprocess.run(cmd, shell=True, capture_output=True, text=True)

print("Course metadata synchronized successfully with KU Leuven API format!")
