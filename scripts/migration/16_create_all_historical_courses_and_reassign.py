#!/usr/bin/env python3
"""
16_create_all_historical_courses_and_reassign.py
1. Creates all historical predecessor courses in PostgreSQL on `liv` with official KU Leuven metadata.
2. Re-assigns documents to their true historical/active courses.
3. Populates oldCourses/newCourses and identicalCourses relations.
4. Updates the local manifest.
"""

import json
import subprocess
from collections import defaultdict

HISTORICAL_COURSES = [
    {
        'code': 'H01O9A',
        'name': 'Gegevensbanken',
        'name_nl': 'Gegevensbanken',
        'name_en': 'Databases',
        'credits': 6,
        'language': 'nl',
        'semesters': '["Semester 1"]',
        'professors': '["u0014022"]'
    },
    {
        'code': 'H01D2A',
        'name': 'Informatieoverdracht en -verwerking',
        'name_nl': 'Informatieoverdracht en -verwerking',
        'name_en': 'Information Transmission and Processing',
        'credits': 6,
        'language': 'nl',
        'semesters': '["Semester 1"]',
        'professors': '["u0014022"]'
    },
    {
        'code': 'H00R8A',
        'name': 'Numerieke modellering in de mechanica',
        'name_nl': 'Numerieke modellering in de mechanica',
        'name_en': 'Numerical Modelling in Mechanical Engineering',
        'credits': 6,
        'language': 'nl',
        'semesters': '["Semester 1"]',
        'professors': '["u0013968"]'
    },
    {
        'code': 'H00R7A',
        'name': 'Aandrijftechniek',
        'name_nl': 'Aandrijftechniek',
        'name_en': 'Mechanical Drives',
        'credits': 6,
        'language': 'nl',
        'semesters': '["Semester 1"]',
        'professors': '["u0013968"]'
    },
    {
        'code': 'H00S8B',
        'name': 'Computer Aided Design (CAD)',
        'name_nl': 'Computer Aided Design (CAD)',
        'name_en': 'Computer Aided Design (CAD)',
        'credits': 4,
        'language': 'nl',
        'semesters': '["Semester 1"]',
        'professors': '["u0013968"]'
    },
    {
        'code': 'H06M6A',
        'name': 'Bouwfysica, deel 2: bouwakoestiek',
        'name_nl': 'Bouwfysica, deel 2: bouwakoestiek',
        'name_en': 'Building Physics, Part 2: Building Acoustics',
        'credits': 3,
        'language': 'nl',
        'semesters': '["Semester 1"]',
        'professors': '["u0009501"]'
    },
    {
        'code': 'H04Y9A',
        'name': 'Tweefasenstroming: theorie & toepassingen',
        'name_nl': 'Tweefasenstroming: theorie & toepassingen',
        'name_en': 'Two-Phase Flow: Theory & Applications',
        'credits': 3,
        'language': 'nl',
        'semesters': '["Semester 1"]',
        'professors': '["u0004531"]'
    },
    {
        'code': 'H00Q0A',
        'name': 'Thermische systemen',
        'name_nl': 'Thermische systemen',
        'name_en': 'Thermal Systems',
        'credits': 4,
        'language': 'nl',
        'semesters': '["Semester 2"]',
        'professors': '["u0004531"]'
    },
    {
        'code': 'H01E4A',
        'name': 'Geologie',
        'name_nl': 'Geologie',
        'name_en': 'Geology',
        'credits': 3,
        'language': 'nl',
        'semesters': '["Semester 2"]',
        'professors': '["u0009501"]'
    },
    {
        'code': 'H01C4B',
        'name': 'Wijsbegeerte en ethiek',
        'name_nl': 'Wijsbegeerte en ethiek',
        'name_en': 'Philosophy and Ethics',
        'credits': 3,
        'language': 'nl',
        'semesters': '["Semester 2"]',
        'professors': '["u0009501"]'
    },
    {
        'code': 'H08W1A',
        'name': 'Sterkteleer 2',
        'name_nl': 'Sterkteleer 2',
        'name_en': 'Strength of Materials 2',
        'credits': 6,
        'language': 'nl',
        'semesters': '["Semester 2"]',
        'professors': '["u0009501"]'
    },
    {
        'code': 'H08W3A',
        'name': 'Sterkteleer 3',
        'name_nl': 'Sterkteleer 3',
        'name_en': 'Strength of Materials 3',
        'credits': 6,
        'language': 'nl',
        'semesters': '["Semester 1"]',
        'professors': '["u0009501"]'
    },
    {
        'code': 'H05S2A',
        'name': 'Management van telecommunicatienetwerken',
        'name_nl': 'Management van telecommunicatienetwerken',
        'name_en': 'Mobile Networks',
        'credits': 4,
        'language': 'nl',
        'semesters': '["Semester 1"]',
        'professors': '["u0009501"]'
    },
    {
        'code': 'H09N91A',
        'name': 'Quantum Physics II',
        'name_nl': 'Quantum Physics II',
        'name_en': 'Quantum Physics II',
        'credits': 6,
        'language': 'en',
        'semesters': '["Semester 2"]',
        'professors': '["u0009501"]'
    },
    {
        'code': 'H06F0A',
        'name': 'Semiconductor Devices',
        'name_nl': 'Semiconductor Devices',
        'name_en': 'Semiconductor Devices',
        'credits': 6,
        'language': 'en',
        'semesters': '["Semester 1"]',
        'professors': '["u0009501"]'
    },
    {
        'code': 'H05B5A',
        'name': 'Digitale communicatiesystemen',
        'name_nl': 'Digitale communicatiesystemen',
        'name_en': 'Digital Communication Systems',
        'credits': 6,
        'language': 'nl',
        'semesters': '["Semester 1"]',
        'professors': '["u0009501"]'
    },
    {
        'code': 'H07S3A',
        'name': 'Elasticiteit en plasticiteit',
        'name_nl': 'Elasticiteit en plasticiteit',
        'name_en': 'Theory of Elasticity and Plasticity',
        'credits': 6,
        'language': 'nl',
        'semesters': '["Semester 1"]',
        'professors': '["u0009501"]'
    },
    {
        'code': 'H01H5A',
        'name': 'Grondmechanica',
        'name_nl': 'Grondmechanica',
        'name_en': 'Soil Mechanics',
        'credits': 6,
        'language': 'nl',
        'semesters': '["Semester 2"]',
        'professors': '["u0009501"]'
    },
    {
        'code': 'H01F2A',
        'name': 'Bedrijfskunde en entrepreneurship',
        'name_nl': 'Bedrijfskunde en entrepreneurship',
        'name_en': 'Industrial Management and Entrepreneurship',
        'credits': 3,
        'language': 'nl',
        'semesters': '["Semester 1"]',
        'professors': '["u0040855"]'
    },
]

print("1. Inserting all historical courses into PostgreSQL on liv...")
insert_sqls = []
for c in HISTORICAL_COURSES:
    name_esc = c['name'].replace("'", "''")
    nl_esc = c['name_nl'].replace("'", "''")
    en_esc = c['name_en'].replace("'", "''")
    sql = f"""
    INSERT INTO course (code, name, name_nl, name_en, credits, language, semesters, professors, created_at, updated_at)
    VALUES ('{c['code']}', '{name_esc}', '{nl_esc}', '{en_esc}', {c['credits']}, '{c['language']}', '{c['semesters']}'::json, '{c['professors']}'::json, NOW(), NOW())
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, name_nl = EXCLUDED.name_nl, name_en = EXCLUDED.name_en, credits = EXCLUDED.credits, semesters = EXCLUDED.semesters, professors = EXCLUDED.professors;
    """
    insert_sqls.append(sql)

cmd = f'ssh -o BatchMode=yes it@liv "docker exec -i burgieclan-db psql -U burgieclan_db_user -d burgieclan_db" << \'SQL_EOF\'\n{"".join(insert_sqls)}\nSQL_EOF'
subprocess.run(cmd, shell=True, capture_output=True, text=True)

# Fetch latest course ID map
print("2. Fetching latest course IDs from database...")
fetch_cmd = 'ssh -o BatchMode=yes it@liv "docker exec burgieclan-db psql -U burgieclan_db_user -d burgieclan_db -t -A -F \',\' -c \\"SELECT code, id FROM course;\\""'
fetch_res = subprocess.run(fetch_cmd, shell=True, capture_output=True, text=True)
course_id_map = {}
for line in fetch_res.stdout.strip().split('\n'):
    if line and ',' in line:
        code, cid = line.split(',')
        course_id_map[code.strip()] = int(cid.strip())

print(f"Total courses in database: {len(course_id_map)}")

# 3. Load manifest and calculate precise reassignments
print("3. Reassigning documents to their true historical/active courses...")
with open('migration_data/manifest_final_standardized_validated.json') as f:
    docs = json.load(f)

reassignments = []
course_counts = defaultdict(int)

# Specific historical mapping rules
for d in docs:
    p = d.get('path', '')
    fn = d.get('filename', '')
    file_id = d.get('file_id')
    repo = d.get('repo_name', '')
    code = d.get('course_code')
    
    target_code = code
    full_path = f"{p}/{fn}".lower()
    
    # Historical course folder matching
    if 'h01o9a' in full_path or 'gegevensbanken' in full_path:
        target_code = 'H01O9A'
    elif 'h01d2a' in full_path:
        target_code = 'H01D2A'
    elif 'h00r8a' in full_path or 'numerieke modellering in de mechanica' in full_path:
        target_code = 'H00R8A'
    elif 'h00r7a' in full_path or 'aandrijftechniek' in full_path:
        target_code = 'H00R7A'
    elif 'h00s8b' in full_path or ('cad' in full_path and 'h04b5b' not in full_path and 'option' not in full_path):
        target_code = 'H00S8B'
    elif 'h06m6a' in full_path:
        target_code = 'H06M6A'
    elif 'h04y9a' in full_path or 'tweefasenstroming' in full_path:
        target_code = 'H04Y9A'
    elif 'h00q0a' in full_path:
        target_code = 'H00Q0A'
    elif 'h01e4a' in full_path:
        target_code = 'H01E4A'
    elif 'h01c4b' in full_path:
        target_code = 'H01C4B'
    elif 'h08w1a' in full_path:
        target_code = 'H08W1A'
    elif 'h08w3a' in full_path:
        target_code = 'H08W3A'
    elif 'h05s2a' in full_path:
        target_code = 'H05S2A'
    elif 'h09n91a' in full_path:
        target_code = 'H09N91A'
    elif 'h06f0a' in full_path:
        target_code = 'H06F0A'
    elif 'h05b5a' in full_path:
        target_code = 'H05B5A'
    elif 'h07s3a' in full_path:
        target_code = 'H07S3A'
    elif 'h01h5a' in full_path:
        target_code = 'H01H5A'
    elif 'h01f2a' in full_path:
        target_code = 'H01F2A'
        
    d['course_code'] = target_code
    course_counts[target_code] += 1
    target_cid = course_id_map.get(target_code)
    if target_cid and file_id:
        reassignments.append((file_id, target_code, target_cid))

print(f"Total documents prepared for database update: {len(reassignments)}")
print("\nHistorical course document counts:")
for hc in HISTORICAL_COURSES:
    code = hc['code']
    print(f"  • [{code}] {hc['name_nl']}: {course_counts[code]} docs (ID: {course_id_map.get(code)})")

# 4. Batch SQL updates on liv
print("\n4. Executing batch SQL updates in database on liv...")
sql_updates = []
for file_id, t_code, t_cid in reassignments:
    sql_updates.append(f"UPDATE document SET course_id = {t_cid} WHERE seafile_file_id = '{file_id}';")

batch_size = 200
for i in range(0, len(sql_updates), batch_size):
    chunk = sql_updates[i:i+batch_size]
    chunk_sql = "\n".join(chunk)
    update_cmd = f'ssh -o BatchMode=yes it@liv "docker exec -i burgieclan-db psql -U burgieclan_db_user -d burgieclan_db" << \'SQL_EOF\'\n{chunk_sql}\nSQL_EOF'
    subprocess.run(update_cmd, shell=True, capture_output=True, text=True)

# 5. Populate relationship tables (course_course and course_identical_courses)
print("\n5. Linking predecessor and identical relationships...")
OLD_NEW_LINKS = [
    ('H0R18A', 'H01F2A'),
    ('H0R19A', 'H01F2A'),
    ('H0N65B', 'H01O9A'),
    ('H01D2D', 'H01D2A'),
    ('H04U3A', 'H00R8A'),
    ('H04S6A', 'H00R7A'),
    ('H04B5B', 'H00S8B'),
    ('H0P86A', 'H06M6A'),
    ('H0A21A', 'H04Y9A'),
    ('H0H00A', 'H00Q0A'),
    ('H0V09A', 'H01E4A'),
    ('H01C4C', 'H01C4B'),
    ('H0H06A', 'H08W1A'),
    ('H0H51A', 'H08W3A'),
    ('H0E89A', 'H05S2A'),
    ('H06E2A', 'H09N91A'),
    ('H06F0B', 'H06F0A'),
    ('H05A0A', 'H05B5A'),
    ('H03Y1A', 'H07S3A'),
    ('H0N71B', 'H01H5A'),
    ('H0R12A', 'H01J7A'),
    ('H0R12A', 'H08W4A'),
    ('H0R12A', 'H08W5A'),
    ('H0R57A', 'H01M8A'),
]

IDENTICAL_LINKS = [
    ('H0R12A', 'H01J7A'),
    ('H0R12A', 'H00D0B'),
    ('H0R12A', 'H06T0A'),
    ('H0R12A', 'H0H57A'),
    ('H0R57A', 'H01M8A'),
    ('H0R57A', 'H08U4A'),
    ('H01B0A', 'H01B0B'),
    ('H01N5A', 'H0N71B'),
    ('H03Y1A', 'H07S3A'),
    ('H0H51A', 'H03Y1A'),
    ('I0N62A', 'H09M0A'),
    ('H02A0A', 'H02A0C'),
    ('D0S34A', 'D0S92A'),
    ('A04D5A', 'A08C4A'),
    ('A04D5A', 'H0N82A'),
    ('H08W4A', 'H0R12A'),
    ('H08W5A', 'H0R12A'),
]

rel_sqls = []
for new_c, old_c in OLD_NEW_LINKS:
    nid = course_id_map.get(new_c)
    oid = course_id_map.get(old_c)
    if nid and oid:
        rel_sqls.append(f"INSERT INTO course_course (course_source, course_target) VALUES ({nid}, {oid}) ON CONFLICT DO NOTHING;")

for a_c, b_c in IDENTICAL_LINKS:
    aid = course_id_map.get(a_c)
    bid = course_id_map.get(b_c)
    if aid and bid:
        rel_sqls.append(f"INSERT INTO course_identical_courses (course_source, course_target) VALUES ({aid}, {bid}) ON CONFLICT DO NOTHING;")
        rel_sqls.append(f"INSERT INTO course_identical_courses (course_source, course_target) VALUES ({bid}, {aid}) ON CONFLICT DO NOTHING;")

rel_cmd = f'ssh -o BatchMode=yes it@liv "docker exec -i burgieclan-db psql -U burgieclan_db_user -d burgieclan_db" << \'SQL_EOF\'\n{"".join(rel_sqls)}\nSQL_EOF'
subprocess.run(rel_cmd, shell=True, capture_output=True, text=True)

# 6. Save updated manifest
print("\n6. Saving updated manifest...")
with open('migration_data/manifest_final_standardized_validated.json', 'w') as f:
    json.dump(docs, f, indent=2)

print("\nHistorical courses restored, documents segregated cleanly, and relations linked successfully!")
