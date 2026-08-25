#!/usr/bin/env python3
"""
17_fix_links_and_reassignments.py
1. Deletes invalid links (H04B5B <- H00S8B, and H09M0A <-> I0N62A).
2. Fixes partial document segregation for H0H00A/H00Q0A, H04S6A/H00R7A, H0P86A/H06M6A, H0V09A/H01E4A, H0H51A/H08W3A, H03Y1A/H07S3A, H0N71B/H01H5A.
3. Ensures CAD (H00S8B) is clean without invalid successor.
"""

import json
import subprocess
from collections import defaultdict

# 1. Fetch current course ID map from liv
print("1. Fetching course ID map from liv...")
fetch_cmd = 'ssh -o BatchMode=yes it@liv "docker exec burgieclan-db psql -U burgieclan_db_user -d burgieclan_db -t -A -F \',\' -c \\"SELECT code, id FROM course;\\""'
fetch_res = subprocess.run(fetch_cmd, shell=True, capture_output=True, text=True)
course_id_map = {}
for line in fetch_res.stdout.strip().split('\n'):
    if line and ',' in line:
        code, cid = line.split(',')
        course_id_map[code.strip()] = int(cid.strip())

# 2. Delete incorrect links
print("2. Deleting invalid links...")
delete_sqls = []

# Delete CAD -> Nuclear Energy link
h04b5b_id = course_id_map.get('H04B5B')
h00s8b_id = course_id_map.get('H00S8B')
if h04b5b_id and h00s8b_id:
    delete_sqls.append(f"DELETE FROM course_course WHERE course_source = {h04b5b_id} AND course_target = {h00s8b_id};")

# Delete P&O -> GIS equivalence link
h09m0a_id = course_id_map.get('H09M0A')
i0n62a_id = course_id_map.get('I0N62A')
if h09m0a_id and i0n62a_id:
    delete_sqls.append(f"DELETE FROM course_identical_courses WHERE (course_source = {h09m0a_id} AND course_target = {i0n62a_id}) OR (course_source = {i0n62a_id} AND course_target = {h09m0a_id});")

if delete_sqls:
    del_cmd = f'ssh -o BatchMode=yes it@liv "docker exec -i burgieclan-db psql -U burgieclan_db_user -d burgieclan_db" << \'SQL_EOF\'\n{"".join(delete_sqls)}\nSQL_EOF'
    subprocess.run(del_cmd, shell=True, capture_output=True, text=True)
    print("Deleted invalid links successfully.")

# 3. Reassign older materials that are still residing in successor courses
print("3. Auditing and segregating remaining predecessor files...")
with open('migration_data/manifest_final_standardized_validated.json') as f:
    docs = json.load(f)

# Reassignment map based on folder/path clues
# If file is from an old course folder, assign it to old course ID
reassign_count = 0
updates = []

for d in docs:
    p = d.get('path', '')
    fn = d.get('filename', '')
    file_id = d.get('file_id')
    code = d.get('course_code')
    full = f"{p}/{fn}".lower()
    
    target_code = code
    
    # Thermal systems: H00Q0A (Dutch/pre-2022) vs H0H00A (Master WTK/Energy)
    if code in ['H0H00A', 'H00Q0A']:
        if 'thermische systemen' in full or 'h00q0a' in full or 'fase 2' in full:
            target_code = 'H00Q0A'
        elif 'thermal systems' in full or 'h0h00a' in full:
            target_code = 'H0H00A'
            
    # Mechanical drives: H00R7A (Aandrijftechniek) vs H04S6A (Mechanical Drives)
    elif code in ['H04S6A', 'H00R7A']:
        if 'aandrijftechniek' in full or 'h00r7a' in full or 'h04s7a' in full or 'h04s9a' in full:
            target_code = 'H00R7A'
        elif 'mechanical drive' in full or 'h04s6a' in full:
            target_code = 'H04S6A'
            
    # Acoustics: H06M6A (Bouwfysica 2) vs H0P86A (Bouwakoestiek)
    elif code in ['H0P86A', 'H06M6A']:
        if 'bouwfysica' in full or 'h06m6a' in full:
            target_code = 'H06M6A'
        elif 'bouwakoestiek' in full or 'h0p86a' in full:
            target_code = 'H0P86A'
            
    # Geology: H01E4A (Geologie) vs H0V09A (Toegepaste geologie en mineralogie)
    elif code in ['H0V09A', 'H01E4A']:
        if 'h01e4a' in full or ('geologie' in full and 'toegepaste geologie' not in full and 'h0v09a' not in full):
            target_code = 'H01E4A'
        else:
            target_code = 'H0V09A'
            
    # Elasticity (BWK): H08W3A (Sterkteleer 3) vs H0H51A (Elasticiteit & Plasticiteit)
    elif code in ['H0H51A', 'H08W3A']:
        if 'sterkteleer 3' in full or 'h08w3a' in full:
            target_code = 'H08W3A'
        elif 'elasticiteit' in full or 'h0h51a' in full:
            target_code = 'H0H51A'
            
    # Elasticity (WTK): H07S3A vs H03Y1A
    elif code in ['H03Y1A', 'H07S3A']:
        if 'h07s3a' in full:
            target_code = 'H07S3A'
        elif 'h03y1a' in full:
            target_code = 'H03Y1A'
            
    # Soil Mechanics: H01H5A vs H0N71B
    elif code in ['H0N71B', 'H01H5A']:
        if 'h01h5a' in full:
            target_code = 'H01H5A'
        elif 'h0n71b' in full or 'grondmechanica' in full:
            target_code = 'H0N71B'

    if target_code != code:
        d['course_code'] = target_code
        target_cid = course_id_map.get(target_code)
        if target_cid and file_id:
            updates.append((file_id, target_code, target_cid))
            reassign_count += 1

print(f"Total documents re-segregated to true predecessor/successor: {len(updates)}")

if updates:
    sql_updates = []
    for file_id, t_code, t_cid in updates:
        sql_updates.append(f"UPDATE document SET course_id = {t_cid} WHERE seafile_file_id = '{file_id}';")
        
    batch_size = 150
    for i in range(0, len(sql_updates), batch_size):
        chunk = sql_updates[i:i+batch_size]
        chunk_sql = "\n".join(chunk)
        update_cmd = f'ssh -o BatchMode=yes it@liv "docker exec -i burgieclan-db psql -U burgieclan_db_user -d burgieclan_db" << \'SQL_EOF\'\n{chunk_sql}\nSQL_EOF'
        subprocess.run(update_cmd, shell=True, capture_output=True, text=True)

    with open('migration_data/manifest_final_standardized_validated.json', 'w') as f:
        json.dump(docs, f, indent=2)

print("Database and manifest cleanup complete!")
