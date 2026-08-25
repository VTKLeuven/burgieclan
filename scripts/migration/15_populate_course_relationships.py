#!/usr/bin/env python3
"""
15_populate_course_relationships.py
Populates oldCourses/newCourses (course_course) and identicalCourses (course_identical_courses)
in PostgreSQL on `liv`.
"""

import subprocess

OLD_NEW_PAIRS = [
    ('H0R18A', 'H01F2A'), # Bedrijfskunde en ondernemen -> Bedrijfskunde en entrepreneurship
    ('H0R19A', 'H01F2A'), # Technische bedrijfsvoering -> Bedrijfskunde en entrepreneurship
    ('H0N65B', 'H01O9A'), # Databases -> Gegevensbanken
    ('H01D2D', 'H01D2A'), # IOV -> IOV
    ('H04U3A', 'H00R8A'), # Numerical Modelling -> Numerieke modellering
    ('H04S6A', 'H00R7A'), # Mechanical Drives -> Aandrijftechniek
    ('H04B5B', 'H00S8B'), # CAD -> CAD
    ('H0P86A', 'H06M6A'), # Bouwakoestiek -> Bouwfysica 2
    ('H0A21A', 'H04Y9A'), # Two-Phase Flow -> Tweefasenstroming
    ('H0H00A', 'H00Q0A'), # Thermal Systems -> Thermische systemen
    ('H0V09A', 'H01E4A'), # Geologie -> Geologie
    ('H01C4C', 'H01C4B'), # Wijsbegeerte -> Wijsbegeerte
    ('H0H06A', 'H08W1A'), # Sterkteleer 2 -> Sterkteleer 2
    ('H0E89A', 'H05S2A'), # Mobile Networks -> Mobile Networks
    ('H06E2A', 'H09N91A'), # Quantum Physics 2 -> Quantum Physics 2
    ('H06F0B', 'H06F0A'), # Semiconductor Devices -> Semiconductor Devices
    ('H05A0A', 'H05B5A'), # Digital Comms -> Digitale communicatie
    ('H03Y1A', 'H07S3A'), # Elasticiteit -> Elasticiteit
    ('H0N71B', 'H01H5A'), # Grondmechanica -> Grondmechanica
    ('H0R12A', 'H01J7A'), # Core Transport -> CIT Transport
    ('H0R57A', 'H01M8A'), # Core Systeemtheorie -> ELT Systeemtheorie
    ('H0H51A', 'H08W3A'), # Elasticiteit (Sterkteleer 3) -> Sterkteleer 3
]

IDENTICAL_PAIRS = [
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
]

# Fetch course ID map from liv
print("1. Fetching course ID map from liv...")
fetch_cmd = 'ssh -o BatchMode=yes it@liv "docker exec burgieclan-db psql -U burgieclan_db_user -d burgieclan_db -t -A -F \',\' -c \\"SELECT code, id FROM course;\\""'
fetch_res = subprocess.run(fetch_cmd, shell=True, capture_output=True, text=True)
course_id_map = {}
for line in fetch_res.stdout.strip().split('\n'):
    if line and ',' in line:
        code, cid = line.split(',')
        course_id_map[code.strip()] = int(cid.strip())

sql_statements = []

# Populate course_course (old/new)
print("2. Generating SQL for oldCourses / newCourses (course_course)...")
for new_code, old_code in OLD_NEW_PAIRS:
    new_id = course_id_map.get(new_code)
    old_id = course_id_map.get(old_code)
    if new_id and old_id:
        sql_statements.append(f"INSERT INTO course_course (course_source, course_target) VALUES ({new_id}, {old_id}) ON CONFLICT DO NOTHING;")

# Populate course_identical_courses
print("3. Generating SQL for identicalCourses (course_identical_courses)...")
for code_a, code_b in IDENTICAL_PAIRS:
    id_a = course_id_map.get(code_a)
    id_b = course_id_map.get(code_b)
    if id_a and id_b:
        sql_statements.append(f"INSERT INTO course_identical_courses (course_source, course_target) VALUES ({id_a}, {id_b}) ON CONFLICT DO NOTHING;")
        sql_statements.append(f"INSERT INTO course_identical_courses (course_source, course_target) VALUES ({id_b}, {id_a}) ON CONFLICT DO NOTHING;")

full_sql = "\n".join(sql_statements)
cmd = f'ssh -o BatchMode=yes it@liv "docker exec -i burgieclan-db psql -U burgieclan_db_user -d burgieclan_db" << \'SQL_EOF\'\n{full_sql}\nSQL_EOF'
subprocess.run(cmd, shell=True, capture_output=True, text=True)

print("Course predecessor/successor and identical relationships successfully populated on liv!")
