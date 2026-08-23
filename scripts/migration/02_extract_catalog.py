#!/usr/bin/env python3
"""
02_extract_catalog.py
Extracts courses, programs, categories, and tags from Burgieclan PostgreSQL on liv.
"""

import subprocess
import json
import sys

def run_psql(query):
    cmd = [
        'ssh', '-o', 'BatchMode=yes', 'it@liv',
        'cd /opt/burgieclan && docker compose -f docker-compose.prod.yml exec -T db psql -U burgieclan_db_user -d burgieclan_db -t -A -F "\t" -c "' + query + '"'
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"psql failed: {result.stderr}")
    return result.stdout.strip().split('\n')


def main():
    print("=== Step 2: Extracting Course Catalog from liv PostgreSQL ===")
    
    # 1. Extract Courses
    print("Extracting courses...")
    course_rows = run_psql("SELECT id, code, name, COALESCE(name_nl, ''), COALESCE(name_en, '') FROM course ORDER BY id ASC;")
    courses = []
    course_by_code = {}
    
    for row in course_rows:
        if not row.strip():
            continue
        parts = row.split('\t')
        c_id = int(parts[0])
        code = parts[1].strip()
        name = parts[2].strip()
        name_nl = parts[3].strip() or name
        name_en = parts[4].strip() or name
        
        c_data = {
            'id': c_id,
            'code': code,
            'name': name,
            'name_nl': name_nl,
            'name_en': name_en
        }
        courses.append(c_data)
        course_by_code[code] = c_data
        
    print(f"  ✓ {len(courses)} courses extracted.")

    # 2. Extract Programs
    print("Extracting programs...")
    prog_rows = run_psql("SELECT id, name, COALESCE(kul_id, ''), COALESCE(language, 'nl') FROM program ORDER BY id ASC;")
    programs = []
    for row in prog_rows:
        if not row.strip():
            continue
        parts = row.split('\t')
        programs.append({
            'id': int(parts[0]),
            'name': parts[1].strip(),
            'kul_id': parts[2].strip(),
            'language': parts[3].strip()
        })
    print(f"  ✓ {len(programs)} programs extracted.")

    # 3. Extract Categories
    print("Extracting document categories...")
    cat_rows = run_psql("SELECT id, name_nl, name_en FROM document_category ORDER BY id ASC;")
    categories = []
    for row in cat_rows:
        if not row.strip():
            continue
        parts = row.split('\t')
        categories.append({
            'id': int(parts[0]),
            'name_nl': parts[1].strip(),
            'name_en': parts[2].strip()
        })
    print(f"  ✓ {len(categories)} categories extracted.")

    # 4. Extract Program -> Course mappings (via module_course)
    print("Extracting program-course associations...")
    prog_course_rows = run_psql("""
        SELECT DISTINCT p.id, c.code
        FROM program p
        JOIN module m ON m.program_id = p.id
        JOIN module_course mc ON mc.module_id = m.id
        JOIN course c ON c.id = mc.course_id;
    """)
    prog_courses = {}
    for row in prog_course_rows:
        if not row.strip():
            continue
        parts = row.split('\t')
        p_id = int(parts[0])
        code = parts[1].strip()
        if p_id not in prog_courses:
            prog_courses[p_id] = []
        prog_courses[p_id].append(code)
    print(f"  ✓ Program-course links mapped for {len(prog_courses)} programs.")

    catalog = {
        'courses': courses,
        'courses_by_code': course_by_code,
        'programs': programs,
        'program_courses': prog_courses,
        'categories': categories
    }

    output_path = 'migration_data/course_catalog.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
        
    print(f"\n=== Step 2 Complete: Catalog saved to {output_path} ===")


if __name__ == '__main__':
    main()
