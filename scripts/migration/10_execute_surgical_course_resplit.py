#!/usr/bin/env python3
"""
10_execute_surgical_course_resplit.py
Surgically splits collapsed courses in PostgreSQL on `liv` and updates the manifest.
"""

import json
import subprocess

print("1. Defining course insertions...")

courses_to_ensure = [
    {
        'code': 'H01J7A',
        'name': 'Transportverschijnselen',
        'name_nl': 'Transportverschijnselen',
        'name_en': 'Transport Phenomena',
        'credits': 5,
        'language': 'nl',
        'semesters': '["1"]'
    },
    {
        'code': 'H0H57A',
        'name': 'Transportverschijnselen',
        'name_nl': 'Transportverschijnselen',
        'name_en': 'Transport Phenomena',
        'credits': 3,
        'language': 'nl',
        'semesters': '["1"]'
    },
    {
        'code': 'H01N5A',
        'name': 'Rotsmechanica',
        'name_nl': 'Rotsmechanica',
        'name_en': 'Rock Mechanics',
        'credits': 3,
        'language': 'nl',
        'semesters': '["2"]'
    },
    {
        'code': 'H01M8A',
        'name': 'Systeemtheorie en regeltechniek',
        'name_nl': 'Systeemtheorie en regeltechniek',
        'name_en': 'Systems Theory and Control Theory',
        'credits': 6,
        'language': 'nl',
        'semesters': '["2"]'
    },
    {
        'code': 'H01B0A',
        'name': 'Toegepaste mechanica, deel 1',
        'name_nl': 'Toegepaste mechanica, deel 1',
        'name_en': 'Applied Mechanics, Part 1',
        'credits': 3,
        'language': 'nl',
        'semesters': '["1"]'
    },
    {
        'code': 'H01C8A',
        'name': 'Toegepaste mechanica, deel 2',
        'name_nl': 'Toegepaste mechanica, deel 2',
        'name_en': 'Applied Mechanics, Part 2',
        'credits': 6,
        'language': 'nl',
        'semesters': '["1"]'
    },
    {
        'code': 'H03I6A',
        'name': 'Biomedische beeldverwerking 2',
        'name_nl': 'Biomedische beeldverwerking 2',
        'name_en': 'Medical Image Processing 2',
        'credits': 3,
        'language': 'nl',
        'semesters': '["1"]'
    }
]

# Generate SQL insert statements
insert_sql_parts = []
for c in courses_to_ensure:
    sql = f"""
    INSERT INTO course (code, name, name_nl, name_en, credits, language, semesters, created_at, updated_at)
    VALUES ('{c['code']}', '{c['name']}', '{c['name_nl']}', '{c['name_en']}', {c['credits']}, '{c['language']}', '{c['semesters']}', NOW(), NOW())
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, name_nl = EXCLUDED.name_nl, name_en = EXCLUDED.name_en, credits = EXCLUDED.credits, semesters = EXCLUDED.semesters;
    """
    insert_sql_parts.append(sql)

full_sql = "\n".join(insert_sql_parts)

print("2. Inserting/updating missing course records on liv...")
cmd = f'ssh -o BatchMode=yes it@liv "docker exec -i burgieclan-db psql -U burgieclan_db_user -d burgieclan_db" << \'SQL_EOF\'\n{full_sql}\nSQL_EOF'
res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print("Insert Result:\n", res.stdout, res.stderr)

# Now fetch the mapping of course_code -> course_id from liv
print("3. Fetching course_code -> course_id map from database...")
fetch_cmd = 'ssh -o BatchMode=yes it@liv "docker exec burgieclan-db psql -U burgieclan_db_user -d burgieclan_db -t -A -F \',\' -c \\"SELECT code, id FROM course;\\""'
fetch_res = subprocess.run(fetch_cmd, shell=True, capture_output=True, text=True)
course_id_map = {}
for line in fetch_res.stdout.strip().split('\n'):
    if line and ',' in line:
        code, cid = line.split(',')
        course_id_map[code.strip()] = int(cid.strip())

print(f"Total courses in database: {len(course_id_map)}")

# 4. Load manifest and calculate reassignments
print("4. Calculating re-assignments from manifest...")
with open('migration_data/manifest_final_standardized_validated.json') as f:
    docs = json.load(f)

reassignments = []  # list of (file_name, target_code, target_course_id)

for d in docs:
    repo = d.get('repo_name', '')
    path = d.get('path', '')
    target_code = d.get('course_code')
    file_name = d.get('file_name')
    
    # Check if this document belongs to one of the split courses
    if 'Chemische technologie' in repo and 'Transportverschijnselen' in path:
        target_code = 'H01J7A'
    elif 'Materiaalkunde' in repo and 'Transportverschijnselen' in path:
        target_code = 'H00D0B'
    elif 'Chemical Engineering' in repo and 'Ma' in repo and 'Transport' in path:
        target_code = 'H06T0A'
    elif 'Biomedische' in repo and 'Transportverschijnselen' in path:
        target_code = 'H0H57A'
    elif 'Bouwkunde' in repo and 'Rotsmechanica' in path:
        target_code = 'H01N5A'
    elif 'Architectuur' in repo and '1 BIRA' in path and 'Mechanica' in path:
        target_code = 'H01B0A'
    elif 'Biomedical' in repo and 'musculoskeletal biomechanics' in path:
        target_code = 'H03I2A'
    elif 'Elektrotechniek' in repo and 'H01M8A' in path:
        target_code = 'H01M8A'
    elif 'Biomedical' in repo and 'Systeemtheorie' in path:
        target_code = 'H08U4A'
    elif 'Mobility' in repo and 'GIS' in path:
        target_code = 'I0N62A'
    elif 'Biomedische' in repo and 'Anatomie' in path:
        target_code = 'H0H08A'
    elif 'Biomedical' in repo and 'imaging' in path:
        target_code = 'H03I6A'
        
    d['course_code'] = target_code
    target_cid = course_id_map.get(target_code)
    if target_cid:
        reassignments.append((file_name, target_code, target_cid))

print(f"Total documents targeted for alignment: {len(reassignments)}")

# 5. Execute batch SQL updates on liv
print("5. Executing batch SQL updates in database on liv...")
sql_updates = []
for file_name, new_c, new_cid in reassignments:
    sql_updates.append(f"UPDATE document SET course_id = {new_cid} WHERE file_name = '{file_name}';")

batch_size = 100
for i in range(0, len(sql_updates), batch_size):
    chunk = sql_updates[i:i+batch_size]
    chunk_sql = "\n".join(chunk)
    update_cmd = f'ssh -o BatchMode=yes it@liv "docker exec -i burgieclan-db psql -U burgieclan_db_user -d burgieclan_db" << \'SQL_EOF\'\n{chunk_sql}\nSQL_EOF'
    subprocess.run(update_cmd, shell=True, capture_output=True, text=True)

# 6. Save updated manifest
print("6. Saving updated manifest...")
with open('migration_data/manifest_final_standardized_validated.json', 'w') as f:
    json.dump(docs, f, indent=2)

print("Re-split complete!")
