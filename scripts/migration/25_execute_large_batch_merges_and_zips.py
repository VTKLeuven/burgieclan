#!/usr/bin/env python3
"""
25_execute_large_batch_merges_and_zips.py
1. Merges 15 pure PDF series into single multi-page PDFs using pypdf.
2. Bundles 18 code / exercise / office clusters into clean ZIP archives.
3. Uploads all unified assets to Hetzner Object Storage (burgieclan-vtk).
4. Inserts new clean Document records into PostgreSQL on `liv`.
5. Deletes loose fragmented records from PostgreSQL on `liv`.
6. Updates local manifest.
"""

import os
import sys
import json
import subprocess

# 1. PDF Series to merge: (folder_rel, course_code, category_id, title, author, year, output_filename)
PDF_MERGES = [
    # Batch 1 PDFs
    ("Ba - Elektrotechniek/3de bach/H01L6A - Digitale Signaalverwerking/Oefenzittingen/2022 - 2023", "H01L6A", 4, "Oefenzittingen Modeloplossingen (2022 - 2023)", None, "2022 - 2023", "oefenzittingen-modeloplossingen-2022-2023-h01l6a.pdf"),
    ("Ma - Civil Engineering/Kernopleiding/Funderingstechniek/Summary_Student_114", "H0P79A", 3, "Samenvatting Funderingstechniek (Student 114)", "Student 114", "2022 - 2023", "samenvatting-funderingstechniek-student-114.pdf"),
    ("Ba - Algemene gemeenschappelijke basis/Semester 2/H01B2B - Algemene Natuurkunde/Samenvattingen/Algemene Natuurkunde Samenvatting(2019-2020) -Student 114", "H01B2B", 3, "Samenvatting Algemene Natuurkunde (Student 114)", "Student 114", "2019 - 2020", "samenvatting-algemene-natuurkunde-student-114.pdf"),
    ("Ba - Algemene gemeenschappelijke basis/Semester 1/H01A4B - Toegepaste Algebra/Samenvattingen/Samenvatting Student 102", "H01A4B", 3, "Samenvatting Toegepaste Algebra (Student 102)", "Student 102", None, "samenvatting-toegepaste-algebra-student-102.pdf"),
    ("Ba - Algemene gemeenschappelijke basis/Semester 1/H01A0B - Analyse I/Samenvattingen/Samenvatting Student 102", "H01A0B", 3, "Samenvatting Analyse 1 (Student 102)", "Student 102", None, "samenvatting-analyse-1-student-102.pdf"),
    
    # Batch 2 PDFs
    ("Ba - Bouwkunde/2de bach/H01H3B - Bouwfysica/Bouwfysica Samenvattingen/Bouwfysica Samenvatting(2020-2021) -Student 114", "H01H3B", 3, "Samenvatting Bouwfysica (Student 114)", "Student 114", "2020 - 2021", "samenvatting-bouwfysica-student-114.pdf"),
    ("Ma - Civil Engineering/Kernopleiding/Finite Elements/Finite Elements Summarries/Finite elements Samenvatting(2022-2023) -Student 114", "H04M0B", 3, "Finite Elements Summary (Student 114)", "Student 114", "2022 - 2023", "finite-elements-summary-student-114.pdf"),
    ("Ba - Algemene gemeenschappelijke basis/Semester 5/H01F2A - Bedrijfskunde & entrepreneurship/Samenvattingen/Bedrijfskunde & entrepreneurship Samenvatting(2021-2022) -Student 114", "H01F2A", 3, "Samenvatting Bedrijfskunde & Entrepreneurship (Student 114)", "Student 114", "2021 - 2022", "samenvatting-bedrijfskunde-student-114.pdf"),
    ("Ba - Werktuigkunde/3de bach/H01O1A - Productietechnieken en -systemen/Notes and Exercises by Student 083", "H01O1A", 3, "Lesnotities Productietechnieken (Student 083)", "Student 083", None, "lesnotities-productietechnieken-student-083.pdf"),
    ("Ba - Werktuigkunde/3de bach/H01L8A - Elektrische energie en aandrijvingen/H01L8A - Elektrische energie en aandrijvingen (Elektrotechniek)/Notes and Exercises by Student 083/Slides EEA", "H01L8A", 6, "Lesnotities & Slides EEA (Student 083)", "Student 083", None, "lesnotities-slides-eea-student-083.pdf"),
    ("Ba - Algemene gemeenschappelijke basis/Semester 5/H01F2A - Bedrijfskunde & entrepreneurship/Notes and Exercises by Student 083/Slides B&E", "H01F2A", 6, "Lesnotities & Slides Bedrijfskunde (Student 083)", "Student 083", None, "lesnotities-slides-bedrijfskunde-student-083.pdf"),
    ("Ma - Mechanical Engineering/Core courses - Kernopleiding/H03Y1A - Theory of Elasticity & Plasticity (H07S3A - Elasticiteit & Plasticiteit)/E&P - Slides Video Lectures 2022-2023", "H07S3A", 6, "Elasticiteit & Plasticiteit Video Lectures Slides (2022-2023)", None, "2022 - 2023", "elasticiteit-plasticiteit-video-lectures-slides.pdf"),
    ("Ba - Werktuigkunde/2de bach/H01N8A - Selectie en Dimensionering van Machine-elementen/Slides/Lessen (Thomas de wolf)", "H01N8A", 6, "Lessen & Opgaves Machine-elementen (Student 116)", "Student 116", None, "lessen-opgaves-machine-elementen-student-116.pdf"),
    ("Ma - Energy/Phase 1/Semester 1/Power System Calculations/oplossingen oefeningen boek", "H04A9A", 4, "Power System Calculations Book Solutions (Ch 1-16)", None, None, "power-system-calculations-book-solutions.pdf"),
    ("Ma - Electrical Engineering/Cryptography and Network Security/Additional Course Documents C&NS/10 - Extra/Handbook of Applied Cryptology", "H05E1B", 6, "Handbook of Applied Cryptology (Menezes, Oorschot, Vanstone)", "A. Menezes, P. van Oorschot, S. Vanstone", None, "handbook-of-applied-cryptology.pdf"),
]

# 2. ZIP Clusters to bundle: (folder_rel, course_code, category_id, title, author, year, output_filename)
ZIP_BUNDLES = [
    # Word / Anki / Notes packs
    ("Ma - Biomedical Engineering/Elective courses/Introduction To Genetics/Summary - Introduction to genetics (Student 036)", "I0D35A", 3, "Introduction to Genetics Summary & Anki (Student 036)", "Student 036", "2025 - 2026", "introduction-to-genetics-summary-anki-student-036.zip"),
    ("Ma - Biomedical Engineering/Truncus Communis/Medical Equipment/Summary - Medical Equipment (Student 036)", "H03F6A", 3, "Medical Equipment Summary & Anki (Student 036)", "Student 036", "2024 - 2025", "medical-equipment-summary-anki-student-036.zip"),
    ("Ba - Architectuur/2 BIRA/architectuurgeschiedenis/samenvattingen/Samenvatting AG2_Student111", "H01S6B", 3, "Samenvatting AG2 (Student 111)", "Student 111", None, "samenvatting-ag2-student-111.zip"),
    ("Ba - Architectuur/2 BIRA/architectuurgeschiedenis/notities/2012-2013", "H01S6B", 3, "Lesnotities Architectuurgeschiedenis (2012-2013)", None, "2012 - 2013", "lesnotities-architectuurgeschiedenis-2012-2013.zip"),
    ("Ba - Architectuur/2 BIRA/architectuurgeschiedenis/notities/2019-2020", "H01S6B", 6, "Lespresentaties Architectuurgeschiedenis (2019-2020)", None, "2019 - 2020", "lespresentaties-architectuurgeschiedenis-2019-2020.zip"),
    ("Ba - Architectuur/3 BIRA/thud/samenvatting/julie", "H01B4B", 3, "Samenvatting THUD (Julie)", "Julie", None, "samenvatting-thud-julie.zip"),
    ("Ba - Architectuur/2 BIRA/architectuurtheorie/Samenvatting Student 003", "H01S4C", 3, "Samenvatting Architectuurtheorie (Student 003 - Docx)", "Student 003", None, "samenvatting-architectuurtheorie-student-003-docx.zip"),
    ("Ba - Architectuur en omgeving/H08U4A - Systeemtheorie/Rar-files unpacked/oefeningenbundel 2009 BOKU 2012/Oefeningenbundel, 11 Uitgewerkte oefeningen", "H08U4A", 4, "Oefeningenbundel Systeemtheorie (11 Opgaven)", None, None, "oefeningenbundel-systeemtheorie-11-opgaven.zip"),
    ("Ba - Computerwetenschappen/3de bach/H01O9A - Inleiding tot gegevensbanken/Voor 2021-2022/Afbeeldingen uit handboek", "H01O9A", 6, "Handboek Afbeeldingen & Diagrammen (Elmasri)", "R. Elmasri, S. Navathe", None, "handboek-afbeeldingen-diagrammen-elmasri.zip"),
    
    # Lab & Code Sessions
    ("Ma - Computer Science/Verplicht deel - Core programme/Modelling of Complex Systems/Exercise sessions [2020]/session6", "H0N05A", 4, "Modelling of Complex Systems - Session 6", None, "2020 - 2021", "modelling-complex-systems-session-6.zip"),
    ("Ma - Computer Science/Verplicht deel - Core programme/Modelling of Complex Systems/Exercise sessions [2020]/session4", "H0N05A", 4, "Modelling of Complex Systems - Session 4", None, "2020 - 2021", "modelling-complex-systems-session-4.zip"),
    ("Ma - Computer Science/Verplicht deel - Core programme/Modelling of Complex Systems/Exercise sessions [pre2020]/session 1+2", "H0N05A", 4, "Modelling of Complex Systems - Session 1 & 2", None, None, "modelling-complex-systems-session-1-2.zip"),
    ("Ba - Computerwetenschappen/2de bach/H01P5B - Computerarchitectuur en systeemsoftware/voor 2024/Oefenzittingen/vanaf 2019/Oplossingen/Oefenzitting 4", "H01P5B", 4, "Computerarchitectuur Oefenzitting 4 (MIPS Assembly)", None, "2019 - 2020", "computerarchitectuur-oefenzitting-4-mips.zip"),
    ("Ma - Computer Science/Options/AI  - Knowledge Representation/Exercise sessions (2021)/session 5/solutions", "H02C3A", 4, "Knowledge Representation Session 5 Solutions", None, "2021 - 2022", "kr-session-5-solutions.zip"),
    ("Ma - Computer Science/Options/AI  - Knowledge Representation/Exercise sessions (2021)/session 4/solutions", "H02C3A", 4, "Knowledge Representation Session 4 Solutions", None, "2021 - 2022", "kr-session-4-solutions.zip"),
    ("Ma - Energy/Phase 1/Semester 1/Power Electronics/Lab sessions/Labo 1 - Componenten en Snubber", "H04A2A", 7, "Power Electronics Labo 1 - Componenten & Snubber", None, None, "power-electronics-labo-1-componenten.zip"),
    ("Ma - Energy/Phase 1/Semester 1/Power Electronics/Lab sessions/Labo 3 - Buck Converter en Fly Converter/Componenten", "H04A2A", 7, "Power Electronics Labo 3 - Converter Componenten", None, None, "power-electronics-labo-3-componenten.zip"),
    ("Ba - Architectuur/1 BIRA/Informatica (met JAVA!)/Practicum 2011-2012/BIRA/javadoc", "H01T3C", 7, "Informatica Practicum JavaDoc Documentation (2011-2012)", None, "2011 - 2012", "bira-informatica-javadoc-practicum.zip"),
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

# Create payload
with open('/tmp/batch2_payload.json', 'w') as f:
    json.dump({'pdf_merges': PDF_MERGES, 'zip_bundles': ZIP_BUNDLES}, f)

subprocess.run(['scp', '-o', 'BatchMode=yes', '/tmp/batch2_payload.json', 'it@liv:/tmp/batch2_payload.json'], check=True)

worker_code = """
import os, sys, json, zipfile, subprocess, re
from pypdf import PdfWriter, PdfReader

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\\d+)', s)]

staging_base = '/mnt/immich/burgieclan-staging'
with open('/tmp/batch2_payload.json') as f:
    data = json.load(f)

pdf_merges = data['pdf_merges']
zip_bundles = data['zip_bundles']
results = []

# Process PDF Merges
print("Processing PDF Merges...")
for folder_rel, cc, cat_id, title, author, year, fname in pdf_merges:
    src_dir = os.path.join(staging_base, folder_rel)
    if not os.path.exists(src_dir):
        print(f"Directory not found: {src_dir}")
        continue
        
    pdf_files = [f for f in os.listdir(src_dir) if f.lower().endswith('.pdf')]
    pdf_files.sort(key=natural_sort_key)
    
    if not pdf_files:
        print(f"No PDFs found in: {src_dir}")
        continue
        
    writer = PdfWriter()
    for pf in pdf_files:
        pdf_path = os.path.join(src_dir, pf)
        try:
            reader = PdfReader(pdf_path)
            for page in reader.pages:
                writer.add_page(page)
        except Exception as e:
            print(f"Error reading {pdf_path}: {e}")
            
    out_pdf = os.path.join('/tmp', fname)
    with open(out_pdf, 'wb') as f:
        writer.write(f)
        
    file_size = os.path.getsize(out_pdf)
    s3_target = f":s3:burgieclan-vtk/documents/{fname}"
    
    cmd = [
        "rclone", "copyto", out_pdf, s3_target,
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
        
    os.remove(out_pdf)
    results.append({
        'type': 'pdf',
        'folder_rel': folder_rel,
        'course_code': cc,
        'category_id': cat_id,
        'title': title,
        'author': author,
        'year': year,
        'filename': fname,
        'file_size': file_size
    })
    print(f"Merged & Uploaded PDF: {fname} ({file_size} bytes)")

# Process ZIP Bundles
print("Processing ZIP Bundles...")
for folder_rel, cc, cat_id, title, author, year, fname in zip_bundles:
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
        
    os.remove(out_zip)
    results.append({
        'type': 'zip',
        'folder_rel': folder_rel,
        'course_code': cc,
        'category_id': cat_id,
        'title': title,
        'author': author,
        'year': year,
        'filename': fname,
        'file_size': file_size
    })
    print(f"Bundled & Uploaded ZIP: {fname} ({file_size} bytes)")

print("ALL_DONE_RESULTS:" + json.dumps(results))
"""

with open('/tmp/batch2_worker.py', 'w') as f:
    f.write(worker_code)

subprocess.run(['scp', '-o', 'BatchMode=yes', '/tmp/batch2_worker.py', 'it@liv:/tmp/batch2_worker.py'], check=True)

print("2. Merging PDFs and zipping scripts on liv and uploading to Hetzner S3...")
run_cmd = "ssh -o BatchMode=yes it@liv 'python3 /tmp/batch2_worker.py'"
res = subprocess.run(run_cmd, shell=True, capture_output=True, text=True)
print(res.stdout)
if res.stderr:
    print("STDERR:", res.stderr)

# Parse output from liv
results_json = None
for line in res.stdout.split('\n'):
    if line.startswith("ALL_DONE_RESULTS:"):
        results_json = json.loads(line.replace("ALL_DONE_RESULTS:", ""))

if not results_json:
    print("Failed to get results from liv!")
    sys.exit(1)

print(f"\n3. Successfully created and uploaded {len(results_json)} unified assets.")

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

# 4. Insert new unified records into PostgreSQL on liv
print("4. Inserting new unified records into PostgreSQL on liv...")
insert_sqls = []
for b in results_json:
    cid = course_id_map.get(b['course_code'])
    title_esc = b['title'].replace("'", "''")
    fname_esc = b['filename'].replace("'", "''")
    author_str = b.get('author')
    if author_str:
        escaped_author = author_str.replace("'", "''")
        author_val = f"'{escaped_author}'"
    else:
        author_val = "NULL"
    year_str = b.get('year')
    year_val = f"'{year_str}'" if year_str else "NULL"
    
    sql = f"""
    INSERT INTO document (name, file_name, file_size, course_id, category_id, author, year, anonymous, under_review, created_at, updated_at, seafile_file_id)
    VALUES ('{title_esc}', '{fname_esc}', {b['file_size']}, {cid}, {b['category_id']}, {author_val}, {year_val}, true, false, NOW(), NOW(), '{fname_esc}');
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
        'year': b.get('year'),
        'author': b.get('author'),
        'size_bytes': b['file_size'],
        'tags': ['old-burgieclan']
    })

with open('migration_data/manifest_final_standardized_validated.json', 'w') as f:
    json.dump(remaining_docs, f, indent=2)

print("\nPDF merging and ZIP bundling completed successfully!")
