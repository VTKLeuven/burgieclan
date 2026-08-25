#!/usr/bin/env python3
"""
12_apply_17_cluster_resplits.py
Applies the surgical 17-cluster re-split to PostgreSQL on `liv` and updates manifest.
"""

import json
import subprocess
import csv
from collections import defaultdict

print("1. Ensuring all target courses exist in database...")

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
        'code': 'H00D0B',
        'name': 'Transportverschijnselen',
        'name_nl': 'Transportverschijnselen',
        'name_en': 'Transport Phenomena',
        'credits': 6,
        'language': 'nl',
        'semesters': '["1"]'
    },
    {
        'code': 'H06T0A',
        'name': 'Transportverschijnselen: chemische ingenieurstoepassingen',
        'name_nl': 'Transportverschijnselen: chemische ingenieurstoepassingen',
        'name_en': 'Transport Phenomena: Chemical Engineering Applications',
        'credits': 6,
        'language': 'en',
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
        'code': 'H01B0A',
        'name': 'Toegepaste mechanica, deel 1',
        'name_nl': 'Toegepaste mechanica, deel 1',
        'name_en': 'Applied Mechanics, Part 1',
        'credits': 3,
        'language': 'nl',
        'semesters': '["1"]'
    },
    {
        'code': 'H03I2A',
        'name': 'Biomedische dataverwerking',
        'name_nl': 'Biomedische dataverwerking',
        'name_en': 'Biomedical Data Processing',
        'credits': 6,
        'language': 'nl',
        'semesters': '["2"]'
    },
    {
        'code': 'H0N07A',
        'name': 'Mechanica van heterogene materialen',
        'name_nl': 'Mechanica van heterogene materialen',
        'name_en': 'Mechanics of Heterogeneous Materials',
        'credits': 3,
        'language': 'en',
        'semesters': '["1"]'
    },
    {
        'code': 'H0H51A',
        'name': 'Elasticiteits- en plasticiteitsleer',
        'name_nl': 'Elasticiteits- en plasticiteitsleer',
        'name_en': 'Theory of Elasticity and Plasticity',
        'credits': 6,
        'language': 'nl',
        'semesters': '["1"]'
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
        'code': 'H08U4A',
        'name': 'Systeemtheorie',
        'name_nl': 'Systeemtheorie',
        'name_en': 'System Theory',
        'credits': 3,
        'language': 'nl',
        'semesters': '["1"]'
    },
    {
        'code': 'I0N62A',
        'name': 'Geografische informatiesystemen en digitale terreinmodellering',
        'name_nl': 'Geografische informatiesystemen en digitale terreinmodellering',
        'name_en': 'Geographic Information Systems and Digital Terrain Modelling',
        'credits': 4,
        'language': 'nl',
        'semesters': '["1"]'
    },
    {
        'code': 'H03L1B',
        'name': 'Bouweconomie',
        'name_nl': 'Bouweconomie',
        'name_en': 'Building Economics',
        'credits': 3,
        'language': 'nl',
        'semesters': '["2"]'
    },
    {
        'code': 'H0N71B',
        'name': 'Grondmechanica',
        'name_nl': 'Grondmechanica',
        'name_en': 'Soil Mechanics',
        'credits': 6,
        'language': 'nl',
        'semesters': '["2"]'
    },
    {
        'code': 'H01S8B',
        'name': 'Sociologie van de gebouwde omgeving',
        'name_nl': 'Sociologie van de gebouwde omgeving',
        'name_en': 'Sociology of the Built Environment',
        'credits': 3,
        'language': 'nl',
        'semesters': '["2"]'
    },
    {
        'code': 'H05L7A',
        'name': 'Vernieuwbouw van structuren',
        'name_nl': 'Vernieuwbouw van structuren',
        'name_en': 'Renovation of Structures',
        'credits': 3,
        'language': 'nl',
        'semesters': '["1"]'
    },
]

insert_sql_parts = []
for c in courses_to_ensure:
    name_escaped = c['name'].replace("'", "''")
    nl_escaped = c['name_nl'].replace("'", "''")
    en_escaped = c['name_en'].replace("'", "''")
    sql = f"""
    INSERT INTO course (code, name, name_nl, name_en, credits, language, semesters, created_at, updated_at)
    VALUES ('{c['code']}', '{name_escaped}', '{nl_escaped}', '{en_escaped}', {c['credits']}, '{c['language']}', '{c['semesters']}', NOW(), NOW())
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, name_nl = EXCLUDED.name_nl, name_en = EXCLUDED.name_en, credits = EXCLUDED.credits, semesters = EXCLUDED.semesters;
    """
    insert_sql_parts.append(sql)

full_sql = "\n".join(insert_sql_parts)

print("2. Syncing course entities to liv...")
cmd = f'ssh -o BatchMode=yes it@liv "docker exec -i burgieclan-db psql -U burgieclan_db_user -d burgieclan_db" << \'SQL_EOF\'\n{full_sql}\nSQL_EOF'
res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print("Insert/Update Status:\n", res.stdout, res.stderr)

# Fetch course ID map from liv
print("3. Fetching latest course ID map from database...")
fetch_cmd = 'ssh -o BatchMode=yes it@liv "docker exec burgieclan-db psql -U burgieclan_db_user -d burgieclan_db -t -A -F \',\' -c \\"SELECT code, id FROM course;\\""'
fetch_res = subprocess.run(fetch_cmd, shell=True, capture_output=True, text=True)
course_id_map = {}
for line in fetch_res.stdout.strip().split('\n'):
    if line and ',' in line:
        code, cid = line.split(',')
        course_id_map[code.strip()] = int(cid.strip())

print(f"Total active course records in database: {len(course_id_map)}")

# 4. Load manifest and calculate precise reassignments
print("4. Calculating document reassignments...")
with open('migration_data/manifest_final_standardized_validated.json') as f:
    docs = json.load(f)

reassignments = []
target_counts = defaultdict(int)

for d in docs:
    repo = d.get('repo_name', '')
    path = d.get('path', '')
    fn = d.get('filename', '')
    file_name = d.get('file_name')
    current_code = d.get('course_code')
    target_code = current_code
    
    # 1. Transport Cluster
    if current_code == 'H0R12A' or 'transportverschijnselen' in path.lower() or 'transport phenomena' in path.lower():
        if 'Chemische technologie' in repo:
            target_code = 'H01J7A'
        elif 'Materiaalkunde' in repo:
            target_code = 'H00D0B'
        elif 'Chemical Engineering' in repo and 'Ma' in repo:
            target_code = 'H06T0A'
        elif 'Biomedische' in repo:
            target_code = 'H0H57A'
        elif 'Algemene' in repo:
            target_code = 'H0R12A'
            
    # 2. Mechanics Cluster
    elif current_code == 'H0M70A' or 'rotsmechanica' in path.lower() or 'mechanics of heterogeneous' in path.lower() or 'musculoskeletal' in path.lower():
        if 'Bouwkunde' in repo and 'Rotsmechanica' in path:
            target_code = 'H01N5A'
        elif 'Architectuur' in repo and '1 BIRA' in path:
            target_code = 'H01B0A'
        elif 'Biomedical' in repo and 'musculoskeletal' in path.lower():
            target_code = 'H03I2A'
        elif 'Materials' in repo and 'heterogeneous' in path.lower():
            target_code = 'H0N07A'
            
    # 3. Sterkteleer 3 Cluster
    elif 'Sterkteleer 3' in path and 'Bouwkunde' in repo:
        target_code = 'H0H51A'
        
    # 4. Systems Cluster
    elif current_code == 'H0R57A':
        if 'Elektrotechniek' in repo:
            target_code = 'H01M8A'
        elif 'Biomedical' in repo:
            target_code = 'H08U4A'
            
    # 5. GIS Cluster
    elif current_code == 'H09M0A' and 'Mobility' in repo and 'GIS' in path:
        target_code = 'I0N62A'
        
    # 6. Existenz Bundle Clusters
    elif 'notities existenz' in path.lower():
        if 'bouweconomie' in fn.lower():
            target_code = 'H03L1B'
        elif 'grondmechanica' in fn.lower():
            target_code = 'H0N71B'
        elif 'sociologie' in fn.lower():
            target_code = 'H01S8B'
        elif 'vernieuwbouw' in fn.lower():
            target_code = 'H05L7A'
            
    file_id = d.get('file_id')
    d['course_code'] = target_code
    target_cid = course_id_map.get(target_code)
    target_counts[target_code] += 1
    if target_cid and file_id:
        reassignments.append((file_id, target_code, target_cid))

print(f"Total documents prepared for database sync: {len(reassignments)}")
print("Summary of re-split cluster document counts:")
for ccode in ['H0R12A', 'H01J7A', 'H00D0B', 'H06T0A', 'H0H57A', 'H01N5A', 'H01B0A', 'H03I2A', 'H0N07A', 'H0H51A', 'H01M8A', 'H08U4A', 'I0N62A', 'H03L1B', 'H0N71B', 'H01S8B', 'H05L7A']:
    print(f"  • [{ccode}] -> {target_counts[ccode]} documents (Course ID: {course_id_map.get(ccode)})")

# 5. Execute SQL updates in PostgreSQL on liv
print("5. Executing batch SQL updates in database on liv...")
sql_updates = []
for file_id, t_code, t_cid in reassignments:
    sql_updates.append(f"UPDATE document SET course_id = {t_cid} WHERE seafile_file_id = '{file_id}';")

batch_size = 150
for i in range(0, len(sql_updates), batch_size):
    chunk = sql_updates[i:i+batch_size]
    chunk_sql = "\n".join(chunk)
    update_cmd = f'ssh -o BatchMode=yes it@liv "docker exec -i burgieclan-db psql -U burgieclan_db_user -d burgieclan_db" << \'SQL_EOF\'\n{chunk_sql}\nSQL_EOF'
    subprocess.run(update_cmd, shell=True, capture_output=True, text=True)

# 6. Save updated manifest
print("6. Saving updated manifest...")
with open('migration_data/manifest_final_standardized_validated.json', 'w') as f:
    json.dump(docs, f, indent=2)

print("7. Re-alignment completed successfully!")
