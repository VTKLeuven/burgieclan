#!/usr/bin/env python3
"""
26_audit_all_course_relationships_and_years.py
Audits all course relationships in PostgreSQL on liv for:
1. Direction reversal (is the old course younger than the new course?)
2. Program / variant mismatches (e.g. Burgie vs BIRA parallel courses)
3. Document year anomalies
"""

import subprocess
import json

# Fetch all course_course links with names, document counts, and year ranges
sql = """
SELECT 
    c1.code as new_code, 
    COALESCE(c1.name_nl, c1.name, '') as new_name,
    COUNT(d1.id) as new_doc_count,
    MIN(d1.year) as new_min_year,
    MAX(d1.year) as new_max_year,
    c2.code as old_code, 
    COALESCE(c2.name_nl, c2.name, '') as old_name,
    COUNT(d2.id) as old_doc_count,
    MIN(d2.year) as old_min_year,
    MAX(d2.year) as old_max_year
FROM course_course cc
JOIN course c1 ON cc.course_source = c1.id
JOIN course c2 ON cc.course_target = c2.id
LEFT JOIN document d1 ON c1.id = d1.course_id
LEFT JOIN document d2 ON c2.id = d2.course_id
GROUP BY c1.code, c1.name_nl, c1.name, c2.code, c2.name_nl, c2.name
ORDER BY c1.code;
"""

cmd = f'ssh -o BatchMode=yes it@liv "docker exec burgieclan-db psql -U burgieclan_db_user -d burgieclan_db -t -A -F \',\' -c \\"{sql}\\""'
res = subprocess.run(cmd, shell=True, capture_output=True, text=True)

print("="*100)
print(f"{'NEW COURSE (source)':<35} | {'OLD COURSE (target)':<35} | {'NEW DOCS / YEARS':<20} | {'OLD DOCS / YEARS':<20}")
print("="*100)

for line in res.stdout.strip().split('\n'):
    if not line or ',' not in line:
        continue
    parts = line.split(',')
    new_code, new_name, new_docs, new_min_y, new_max_y, old_code, old_name, old_docs, old_min_y, old_max_y = parts[:10]
    
    new_str = f"[{new_code}] {new_name[:25]}"
    old_str = f"[{old_code}] {old_name[:25]}"
    new_y_str = f"{new_docs} docs ({new_min_y or '-'}..{new_max_y or '-'})"
    old_y_str = f"{old_docs} docs ({old_min_y or '-'}..{old_max_y or '-'})"
    
    print(f"{new_str:<35} | {old_str:<35} | {new_y_str:<20} | {old_y_str:<20}")

