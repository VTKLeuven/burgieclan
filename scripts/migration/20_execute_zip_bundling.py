#!/usr/bin/env python3
"""
20_execute_zip_bundling.py
1. Zips the 18 identified directory clusters on `liv`.
2. Uploads the 18 unified ZIPs directly to Hetzner Object Storage (burgieclan-vtk) via rclone.
3. Inserts 18 clean Document rows into PostgreSQL `document` on `liv`.
4. Deletes the ~1,500 loose fragmented document records from PostgreSQL `document` on `liv`.
5. Updates the local manifest `manifest_final_standardized_validated.json`.
"""

import os
import sys
import json
import subprocess
from collections import defaultdict

BUNDLES = [
    # Fox & McDonald Chapters (Fluïdummechanica - H08W4A, category 4 = Oefenzittingen)
    ("Ba - Werktuigkunde/3de bach/H08W4A - Fluïdummechanica/Legacy/Solutions Fox&McDonald (9 ed.)/ch01", "H08W4A", 4, "Fox & McDonald (9th Ed) - Chapter 01 Solutions", "fox-mcdonald-9th-ed-chapter-01-solutions.zip"),
    ("Ba - Werktuigkunde/3de bach/H08W4A - Fluïdummechanica/Legacy/Solutions Fox&McDonald (9 ed.)/ch02", "H08W4A", 4, "Fox & McDonald (9th Ed) - Chapter 02 Solutions", "fox-mcdonald-9th-ed-chapter-02-solutions.zip"),
    ("Ba - Werktuigkunde/3de bach/H08W4A - Fluïdummechanica/Legacy/Solutions Fox&McDonald (9 ed.)/ch03", "H08W4A", 4, "Fox & McDonald (9th Ed) - Chapter 03 Solutions", "fox-mcdonald-9th-ed-chapter-03-solutions.zip"),
    ("Ba - Werktuigkunde/3de bach/H08W4A - Fluïdummechanica/Legacy/Solutions Fox&McDonald (9 ed.)/ch04", "H08W4A", 4, "Fox & McDonald (9th Ed) - Chapter 04 Solutions", "fox-mcdonald-9th-ed-chapter-04-solutions.zip"),
    ("Ba - Werktuigkunde/3de bach/H08W4A - Fluïdummechanica/Legacy/Solutions Fox&McDonald (9 ed.)/ch05", "H08W4A", 4, "Fox & McDonald (9th Ed) - Chapter 05 Solutions", "fox-mcdonald-9th-ed-chapter-05-solutions.zip"),
    ("Ba - Werktuigkunde/3de bach/H08W4A - Fluïdummechanica/Legacy/Solutions Fox&McDonald (9 ed.)/ch06", "H08W4A", 4, "Fox & McDonald (9th Ed) - Chapter 06 Solutions", "fox-mcdonald-9th-ed-chapter-06-solutions.zip"),
    ("Ba - Werktuigkunde/3de bach/H08W4A - Fluïdummechanica/Legacy/Solutions Fox&McDonald (9 ed.)/ch07", "H08W4A", 4, "Fox & McDonald (9th Ed) - Chapter 07 Solutions", "fox-mcdonald-9th-ed-chapter-07-solutions.zip"),
    ("Ba - Werktuigkunde/3de bach/H08W4A - Fluïdummechanica/Legacy/Solutions Fox&McDonald (9 ed.)/ch08", "H08W4A", 4, "Fox & McDonald (9th Ed) - Chapter 08 Solutions", "fox-mcdonald-9th-ed-chapter-08-solutions.zip"),
    ("Ba - Werktuigkunde/3de bach/H08W4A - Fluïdummechanica/Legacy/Solutions Fox&McDonald (9 ed.)/ch09", "H08W4A", 4, "Fox & McDonald (9th Ed) - Chapter 09 Solutions", "fox-mcdonald-9th-ed-chapter-09-solutions.zip"),
    ("Ba - Werktuigkunde/3de bach/H08W4A - Fluïdummechanica/Legacy/Solutions Fox&McDonald (9 ed.)/ch10", "H08W4A", 4, "Fox & McDonald (9th Ed) - Chapter 10 Solutions", "fox-mcdonald-9th-ed-chapter-10-solutions.zip"),
    ("Ba - Werktuigkunde/3de bach/H08W4A - Fluïdummechanica/Legacy/Solutions Fox&McDonald (9 ed.)/ch11", "H08W4A", 4, "Fox & McDonald (9th Ed) - Chapter 11 Solutions", "fox-mcdonald-9th-ed-chapter-11-solutions.zip"),
    
    # MATLAB DAC Toolbox (category 7 = Labo & Code)
    ("Ba - Elektrotechniek/3de bach/H01L4A - Digitale en Analoge Communicatie/Legacy/MATLAB", "H01L4A", 7, "MATLAB Toolbox & Datasets", "matlab-toolbox-datasets-h01l4a.zip"),
    
    # Mindstorms Control (category 7 = Labo & Code)
    ("Ma - Mechanical Engineering/Core courses - Kernopleiding/H04X3B - Systems & Control Theory (H00S4A - Systeemanalyse & Regeltechniek)/H04X3A - Control Theory (H00S3A - Regeltechniek)/Labs/Kalman2WD_stud/RWTHMindstormsNXT", "H04X3B", 7, "RWTH Mindstorms NXT Kalman Toolbox", "rwth-mindstorms-nxt-kalman-toolbox.zip"),
    
    # Computationeel Ontwerpen Scripts (category 7 = Labo & Code)
    ("Ba - Architectuur/2 BIRA/computationeel ontwerpen/oplossingen oefenzittingen 2021", "H01U3C", 7, "Oefenzittingen Python Scripts (2021)", "oefenzittingen-python-scripts-2021.zip"),
    ("Ba - Architectuur/2 BIRA/computationeel ontwerpen/oefenzittingen", "H01U3C", 7, "Oefenzittingen Python Opgaven", "oefenzittingen-python-opgaven.zip"),
    
    # Maple Worksheets (category 4 = Oefenzittingen)
    ("Ba - Algemene gemeenschappelijke basis/Semester 2/H01A2B - Analyse II/Voor 2019/Maple oplossingen/Maple - oefenzittingen (H9)", "H01A2B", 4, "Maple Oefenzittingen H9 Worksheets", "maple-oefenzittingen-h9-worksheets.zip"),
    
    # Java Project (category 7 = Labo & Code)
    ("Ba - Algemene gemeenschappelijke basis/Semester 2/H01B6B - Methodiek van de Informatica/pre-python/Algoritmes (Student 115)", "H01B6B", 7, "Algoritmes Java Project (Student 115)", "algoritmes-java-project-student-115.zip"),
    
    # Extra Vragen (category 4 = Oefenzittingen)
    ("Schakel - Algemeen/Elektriciteit, magnetisme & golven/ANTWOORDEN_STUDENTEN_OP_VRAGEN_VECTOREN_MAGNETISME_GOLVEN_KRISTALLOGRAFIE2007/oplossing68xtravrgn", "H0M72A", 4, "Studentenantwoorden Oefeningen & Vragen", "studentenantwoorden-oefeningen-vragen.zip"),
]

# Fetch course ID map from liv
print("1. Fetching course ID map from database on liv...")
fetch_cmd = 'ssh -o BatchMode=yes it@liv "docker exec burgieclan-db psql -U burgieclan_db_user -d burgieclan_db -t -A -F \',\' -c \\"SELECT code, id FROM course;\\""'
fetch_res = subprocess.run(fetch_cmd, shell=True, capture_output=True, text=True)
course_id_map = {}
for line in fetch_res.stdout.strip().split('\n'):
    if line and ',' in line:
        code, cid = line.split(',')
        course_id_map[code.strip()] = int(cid.strip())

print(f"Total courses loaded: {len(course_id_map)}")

# Create remote bundling script on liv
remote_script = """
import os, sys, json, zipfile, subprocess

staging_base = '/mnt/immich/burgieclan-staging'
bundles = %s
results = []

for folder_rel, cc, cat_id, title, fname in bundles:
    src_dir = os.path.join(staging_base, folder_rel)
    if not os.path.exists(src_dir):
        print(f"Directory not found: {src_dir}")
        continue
        
    out_zip = os.path.join('/tmp', fname)
    with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(src_dir):
            for file in files:
                full_p = os.path.join(root, file)
                rel_p = os.path.relpath(full_p, src_dir)
                zf.write(full_p, rel_p)
                
    file_size = os.path.getsize(out_zip)
    s3_target = f":s3:burgieclan-vtk/documents/{fname}"
    
    # Upload via rclone
    cmd = [
        "rclone", "copyto", out_zip, s3_target,
        "--s3-provider=Other",
        "--s3-region=nbg1",
        "--s3-endpoint=https://nbg1.your-objectstorage.com",
        "--s3-access-key-id=UT1UM2KCMQP920Z1RVF1",
        "--s3-secret-access-key=SO2eAne4eirNYlZDTAAQKGfQeTS5ZQlKrGUle4gU"
    ]
    sub_res = subprocess.run(cmd, capture_output=True, text=True)
    if sub_res.returncode != 0:
        print(f"Failed to upload {fname}: {sub_res.stderr}")
        continue
        
    # Clean /tmp
    os.remove(out_zip)
    
    results.append({
        'folder_rel': folder_rel,
        'course_code': cc,
        'category_id': cat_id,
        'title': title,
        'filename': fname,
        'file_size': file_size
    })
    print(f"Bundled & Uploaded to S3: {fname} ({file_size} bytes)")

print("ALL_DONE_RESULTS:" + json.dumps(results))
""" % json.dumps(BUNDLES)

print("2. Creating ZIP archives and streaming to Hetzner S3 on liv...")
run_cmd = f"ssh -o BatchMode=yes it@liv 'python3 -' << 'PY_EOF'\n{remote_script}\nPY_EOF"
res = subprocess.run(run_cmd, shell=True, capture_output=True, text=True)
print(res.stdout)

# Parse output from liv
results_json = None
for line in res.stdout.split('\n'):
    if line.startswith("ALL_DONE_RESULTS:"):
        results_json = json.loads(line.replace("ALL_DONE_RESULTS:", ""))

if not results_json:
    print("Failed to get bundle results from liv!")
    sys.exit(1)

print(f"\n3. Successfully created and uploaded {len(results_json)} ZIP bundles.")

# Load local manifest to find all loose documents that belong to these folders
with open('migration_data/manifest_final_standardized_validated.json') as f:
    docs = json.load(f)

loose_file_ids_to_delete = []
remaining_docs = []

bundle_folders = [b['folder_rel'].lower() for b in results_json]

for d in docs:
    p = d.get('path', '')
    repo = d.get('repo_name', '')
    fn = d.get('filename', '')
    full_path = f"{repo}{p}".lower()
    
    matched_bundle = False
    for bf in bundle_folders:
        if bf in full_path:
            loose_file_ids_to_delete.append(d.get('file_id'))
            matched_bundle = True
            break
            
    if not matched_bundle:
        remaining_docs.append(d)

print(f"Total fragmented loose documents being replaced: {len(loose_file_ids_to_delete)}")

# 4. Insert new bundled document records into PostgreSQL on liv
print("4. Inserting new bundled documents into PostgreSQL on liv...")
insert_sqls = []
for b in results_json:
    cid = course_id_map.get(b['course_code'])
    title_esc = b['title'].replace("'", "''")
    fname_esc = b['filename'].replace("'", "''")
    sql = f"""
    INSERT INTO document (name, file_name, file_size, course_id, category_id, anonymous, under_review, created_at, updated_at, seafile_file_id)
    VALUES ('{title_esc}', '{fname_esc}', {b['file_size']}, {cid}, {b['category_id']}, true, false, NOW(), NOW(), '{fname_esc}');
    """
    insert_sqls.append(sql)

cmd = f'ssh -o BatchMode=yes it@liv "docker exec -i burgieclan-db psql -U burgieclan_db_user -d burgieclan_db" << \'SQL_EOF\'\n{"".join(insert_sqls)}\nSQL_EOF'
subprocess.run(cmd, shell=True, capture_output=True, text=True)

# 5. Delete fragmented loose records from PostgreSQL on liv
print("5. Deleting fragmented loose records from PostgreSQL on liv...")
del_batches = [loose_file_ids_to_delete[i:i+200] for i in range(0, len(loose_file_ids_to_delete), 200)]
for batch in del_batches:
    id_list = ", ".join(f"'{fid}'" for fid in batch if fid)
    del_sql = f"DELETE FROM document WHERE seafile_file_id IN ({id_list});"
    cmd = f'ssh -o BatchMode=yes it@liv "docker exec -i burgieclan-db psql -U burgieclan_db_user -d burgieclan_db" << \'SQL_EOF\'\n{del_sql}\nSQL_EOF'
    subprocess.run(cmd, shell=True, capture_output=True, text=True)

# 6. Append new bundle records to manifest and save
for b in results_json:
    cid = course_id_map.get(b['course_code'])
    remaining_docs.append({
        'file_id': b['filename'],
        'course_id': cid,
        'course_code': b['course_code'],
        'filename': b['filename'],
        'path': f"/{b['folder_rel']}/{b['filename']}",
        'repo_name': b['folder_rel'].split('/')[0],
        'display_title': b['title'],
        'category_id': b['category_id'],
        'year': None,
        'author': None,
        'size_bytes': b['file_size'],
        'tags': ['Oefenzitting / Opgave', 'old-burgieclan']
    })

with open('migration_data/manifest_final_standardized_validated.json', 'w') as f:
    json.dump(remaining_docs, f, indent=2)

print("\nBundling operation completed successfully!")
