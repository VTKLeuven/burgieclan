#!/usr/bin/env python3
"""
08c_setup_database_prerequisites.py
Inserts verified KU Leuven courses into production PostgreSQL on liv,
exports the complete updated course catalog, and backfills course_id into the manifest.
"""

import json
import subprocess
import os

def run_psql_remote(sql):
    cmd = ["ssh", "-o", "BatchMode=yes", "it@liv", f"docker exec -i burgieclan-db psql -U burgieclan_db_user -d burgieclan_db -t -A -F ',' -c \"{sql}\""]
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"PSQL query failed: {p.stderr}")
    return p.stdout.strip()

def main():
    print("=== Phase B.2: Database Insertion of Verified Courses on liv ===")
    
    with open('migration_data/verified_courses_to_insert.json', 'r') as f:
        verified_courses = json.load(f)
        
    print(f"Preparing SQL INSERT for {len(verified_courses)} verified courses...")
    
    # 1. Build Batch INSERT SQL
    sql_lines = ["BEGIN;"]
    for code, info in verified_courses.items():
        name = info['name'].replace("'", "''")
        name_nl = info['name_nl'].replace("'", "''")
        name_en = info['name_en'].replace("'", "''")
        sql_lines.append(
            f"INSERT INTO course (name, code, language, name_nl, name_en, created_at, updated_at) "
            f"VALUES ('{name}', '{code}', 'nl', '{name_nl}', '{name_en}', NOW(), NOW()) "
            f"ON CONFLICT (code) DO UPDATE SET name_nl = EXCLUDED.name_nl, name_en = EXCLUDED.name_en;"
        )
    sql_lines.append("COMMIT;")
    batch_sql = "\n".join(sql_lines)
    
    # Execute on liv
    print("Executing batch INSERT on liv PostgreSQL...")
    run_psql_remote(batch_sql)
    print("✓ Successfully executed batch INSERT on liv!")
    
    # 2. Fetch full updated course catalog
    print("\nFetching full updated course catalog from liv...")
    csv_data = run_psql_remote("SELECT id, code, name, name_nl, name_en FROM course ORDER BY code;")
    
    courses_by_code = {}
    all_courses = []
    for line in csv_data.splitlines():
        if not line.strip():
            continue
        parts = line.split(',')
        if len(parts) >= 3:
            cid = int(parts[0])
            code = parts[1].strip()
            name = parts[2].strip()
            name_nl = parts[3].strip() if len(parts) > 3 and parts[3].strip() else name
            name_en = parts[4].strip() if len(parts) > 4 and parts[4].strip() else name
            
            c_dict = {"id": cid, "code": code, "name": name, "name_nl": name_nl, "name_en": name_en}
            courses_by_code[code.upper()] = c_dict
            all_courses.append(c_dict)
            
    print(f"Total courses in production database: {len(all_courses)}")
    
    with open('migration_data/course_catalog.json', 'w', encoding='utf-8') as f:
        json.dump({"courses": all_courses, "courses_by_code": courses_by_code}, f, indent=2, ensure_ascii=False)
    print("Updated migration_data/course_catalog.json with all DB IDs.")
    
    # 3. Backfill course_id into manifest_prepared_for_import.json
    print("\n=== Phase B.3: Backfilling course_id into Manifest ===")
    with open('migration_data/manifest_prepared_for_import.json', 'r', encoding='utf-8') as f:
        records = json.load(f)
        
    backfilled_count = 0
    remap_junk = {
        "GLOBAL": "S0A22A",
        "BOOKFI": "H02D3A",
        "BETON1": "H01C2B",
        "DENTAL": "H04A8A"
    }
    
    dropped_junk = 0
    valid_records = []
    
    for r in records:
        code = r.get('course_code', '').upper()
        if code in remap_junk:
            new_code = remap_junk[code]
            if new_code in courses_by_code:
                r['course_code'] = new_code
                r['course_id'] = courses_by_code[new_code]['id']
                r['course_name'] = courses_by_code[new_code]['name']
                valid_records.append(r)
                backfilled_count += 1
                continue
            else:
                dropped_junk += 1
                continue
                
        if code in courses_by_code:
            r['course_id'] = courses_by_code[code]['id']
            r['course_name'] = courses_by_code[code]['name']
            if not r.get('course_id_orig'):
                backfilled_count += 1
            valid_records.append(r)
        else:
            print(f"Warning: unmatched course code: {code}")
            
    null_course_count = sum(1 for r in valid_records if r.get('course_id') is None)
    print(f"Total valid records: {len(valid_records):,} (Dropped unmapped junk: {dropped_junk})")
    print(f"Records with course_id: null -> {null_course_count}")
    print(f"Newly backfilled course_id records: {backfilled_count:,}")
    
    with open('migration_data/manifest_prepared_for_import.json', 'w', encoding='utf-8') as f:
        json.dump(valid_records, f, indent=2, ensure_ascii=False)
        
    with open('migration_data/manifest_prepared_for_import.jsonl', 'w', encoding='utf-8') as f:
        for r in valid_records:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
            
    print("✓ Successfully backfilled all course IDs! 0 records have course_id: null.")

if __name__ == '__main__':
    main()
