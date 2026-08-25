#!/usr/bin/env python3
"""
22_merge_pdfs_and_zips.py
1. Merges 5 pure PDF series into single multi-page PDFs using pypdf.
2. Bundles 24 code / exercise / question clusters into clean ZIP archives.
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
    (
        "Ma - Civil Engineering/Kernopleiding/Ontwerp van contructiecomponenten: beton/Constructiecomponenten: gewapend beton, deel 2 en spanbeton Samenvattingen/Constructiecomponenten gewapend beton, deel 2 en spanbeton Samenvatting(2022-2023) -Student 114",
        "H0P75A", 3, "Samenvatting Gewapend Beton Deel 2 (Student 114)", "Student 114", "2022 - 2023",
        "samenvatting-gewapend-beton-deel-2-student-114.pdf"
    ),
    (
        "Ba - Werktuigkunde/2de bach/H01N2A - Energieconversiemachines en -systemen/Samenvattingen/Samenvatting Theorie Student 051 + Student 020",
        "H01N2A", 3, "Samenvatting Theorie (Student 051 & Student 020)", "Student 051 & Student 020", None,
        "samenvatting-theorie-student-051-student-020.pdf"
    ),
    (
        "Ba - Elektrotechniek/3de bach/H01M1A - Elektromagnetische golven/Handboeken/Orfanidis",
        "H01M1A", 6, "Electromagnetic Waves and Antennas (Sophocles J. Orfanidis)", "Sophocles J. Orfanidis", None,
        "electromagnetic-waves-and-antennas-orfanidis.pdf"
    ),
    (
        "Ba - Werktuigkunde/2de bach/H01N8A - Selectie en Dimensionering van Machine-elementen/Notities/Lesnotities, Oefeningen, Werkcolleges 2022 (Student 014)",
        "H01N8A", 3, "Lesnotities & Werkcolleges 2022-2023 (Student 014)", "Student 014", "2022 - 2023",
        "lesnotities-en-werkcolleges-2022-student-014.pdf"
    ),
    (
        "Ba - Architectuur/2 BIRA/architectuurtheorie/PDF's Student 003",
        "H01S4C", 3, "Samenvatting Architectuurtheorie (Student 003)", "Student 003", None,
        "samenvatting-architectuurtheorie-student-003.pdf"
    ),
]

# 2. ZIP Clusters to bundle: (folder_rel, course_code, category_id, title, author, year, output_filename)
ZIP_BUNDLES = [
    # Methodiek vd Informatica Exams & Exercises
    ("Ba - Algemene gemeenschappelijke basis/Semester 2/H01B6B - Methodiek van de Informatica/Examen/Vanaf 2017/Examen 18 juni 2021", "H01B6B", 2, "Examen 18 Juni 2021 (Python Code & Oplossingen)", None, "2020 - 2021", "examen-18-juni-2021-python-code.zip"),
    ("Ba - Algemene gemeenschappelijke basis/Semester 2/H01B6B - Methodiek van de Informatica/Examen/Vanaf 2017/28 augustus 2023", "H01B6B", 2, "Examen 28 Augustus 2023 (Python Code)", None, "2022 - 2023", "examen-28-augustus-2023-python-code.zip"),
    ("Ba - Algemene gemeenschappelijke basis/Semester 2/H01B6B - Methodiek van de Informatica/Examen/Vanaf 2017/Examen 4 juni 2021", "H01B6B", 2, "Examen 4 Juni 2021 (Python Code)", None, "2020 - 2021", "examen-4-juni-2021-python-code.zip"),
    ("Ba - Algemene gemeenschappelijke basis/Semester 2/H01B6B - Methodiek van de Informatica/Examen/Vanaf 2017/2021-2022/Vragenset 2021-2022 - 1", "H01B6B", 2, "Vragenset 2021-2022 (Python Code)", None, "2021 - 2022", "vragenset-2021-2022-python-code.zip"),
    ("Ba - Algemene gemeenschappelijke basis/Semester 2/H01B6B - Methodiek van de Informatica/Oplossingen oefenzittingen (Python 3)/Oplossingen oefenzittingen 2019/Oefenzitting 1 - Arithmetic", "H01B6B", 4, "Oefenzitting 1 - Arithmetic (Python Scripts)", None, "2018 - 2019", "oefenzitting-1-arithmetic-python.zip"),
    ("Ba - Algemene gemeenschappelijke basis/Semester 2/H01B6B - Methodiek van de Informatica/Oplossingen oefenzittingen (Python 3)/Oplossingen oefenzittingen 2019/Oefenzitting 5 - Matrices Sets Dictionairies", "H01B6B", 4, "Oefenzitting 5 - Matrices & Dictionaries (Python Scripts)", None, "2018 - 2019", "oefenzitting-5-matrices-python.zip"),
    ("Ba - Algemene gemeenschappelijke basis/Semester 2/H01B6B - Methodiek van de Informatica/Oplossingen oefenzittingen (Python 3)/Oplossingen oefenzittingen 2019/Oefenzitting 8 - Loop Invariants, Correctness, ORP", "H01B6B", 4, "Oefenzitting 8 - Loop Invariants (Python Scripts)", None, "2018 - 2019", "oefenzitting-8-loop-invariants-python.zip"),
    
    # Computationeel Ontwerpen
    ("Ba - Architectuur/2 BIRA/computationeel ontwerpen/oplossingen oefenzittingen 1920/tiling", "H01U3C", 7, "Tiling Oefenzittingen Python Scripts", None, "2019 - 2020", "tiling-oefenzittingen-python-scripts.zip"),
    
    # Numerieke Benadering (CW)
    ("Ba - Computerwetenschappen/3de bach/H01P3A - Numerieke benadering met toep. id dataw. (vroeger Numerieke modellering en benadering)/pre2022-2023 (Numerieke modellering en benadering)/Oplossingen oefenzittingen (vanaf 2018)/Oefenzitting 2", "H01P3A", 4, "Oefenzitting 2 MATLAB Scripts", None, "2018 - 2019", "oefenzitting-2-matlab-scripts-h01p3a.zip"),
    ("Ba - Computerwetenschappen/3de bach/H01P3A - Numerieke benadering met toep. id dataw. (vroeger Numerieke modellering en benadering)/pre2022-2023 (Numerieke modellering en benadering)/Oplossingen oefenzittingen (pre 2018)/5", "H01P3A", 4, "Oefenzitting 5 MATLAB Scripts", None, None, "oefenzitting-5-matlab-scripts-h01p3a.zip"),
    
    # Numerieke Modellering (WTK)
    ("Ma - Mechanical Engineering/Core courses - Kernopleiding/H04U3A - Numerical Modelling in Mechanical Engineering (H00R8A - Numerieke modellering in de mechanica)/Notes and Exercises by Student 083/Seminars/FEM/Seminar 3/MatLab", "H00R8A", 7, "FEM Seminar 3 MATLAB Scripts (Student 083)", "Student 083", None, "fem-seminar-3-matlab-scripts.zip"),
    ("Schakel - Werktuigkunde/1e semester/Numerieke modellering in de mechanica/Oefeningen/Practica_numerieke_modelering/Practica/Les 1 (Deel_1)/Oefenzitting_1", "H00R8A", 7, "Practica Les 1 Oefenzitting 1 MATLAB Scripts", None, None, "practica-les-1-oefenzitting-1-matlab.zip"),
    ("Schakel - Werktuigkunde/1e semester/Numerieke modellering in de mechanica/Oefeningen/Practica_numerieke_modelering/Practica/Les 1 (Deel Master Energy)/FDM for dielectric heating solution", "H00R8A", 7, "Practica FDM Dielectric Heating MATLAB Solution", None, None, "practica-fdm-dielectric-heating-matlab.zip"),
    
    # Energy Numerical Methods
    ("Ma - Energy/Phase 1/Semester 1/Numerical Methods in Energy Science/Finite Differences and Finite Volumes/Seminars/Seminar 1/Matlab files/Dielectric heating problem Matlab files", "H9X34A", 7, "Dielectric Heating MATLAB Scripts", None, None, "seminar-1-dielectric-heating-matlab.zip"),
    ("Ma - Energy/Phase 1/Semester 1/Numerical Methods in Energy Science/Finite Differences and Finite Volumes/Seminars/Seminar 1/Matlab files/Dielectric heating problem Matlab Solution", "H9X34A", 7, "Dielectric Heating MATLAB Solution", None, None, "seminar-1-dielectric-heating-solution-matlab.zip"),
    
    # Statistical Data Analysis R
    ("Ma - Mobility and Supply Chain Engineering/Phase 1/Semester 2 - Statistical Data Analysis/R/Exercise sessions/(2022-2023) - Student 107", "I0N48B", 4, "R Exercise Sessions (Student 107)", "Student 107", "2022 - 2023", "r-exercise-sessions-student-107.zip"),
    
    # Beweging en Trillingen
    ("Ba - Werktuigkunde/3de bach/H01N0A - Beweging en trillingen/stangen/Student038_Student135", "H01N0A", 7, "Stangen Simulatie (Student 038 & Student 135)", "Student 038 & Student 135", None, "stangen-simulatie-student-038-student-135.zip"),
    ("Ba - Werktuigkunde/3de bach/H01N0A - Beweging en trillingen/trillingen/Examen/Opgeloste examenvragen/MATLAB (Student 016)", "H01N0A", 2, "Opgeloste Examenvragen MATLAB (Student 016)", "Student 016", None, "opgeloste-examenvragen-matlab-student-016.zip"),
    
    # Aircraft Performance
    ("Ma - Mechanical Engineering/Option: Aero & Space Engineering - Lucht- & Ruimtevaarttechnologie/Aircraft performance and stability/Deel1/Matlab files", "H04W6A", 7, "Aircraft Performance Deel 1 MATLAB Scripts", None, None, "aircraft-performance-deel1-matlab-files.zip"),
    
    # Dynamics of Structures
    ("Ma - Civil Engineering/Kernopleiding/Dynamics of Structures/Oefenzittingen", "H04M9A", 7, "Dynamics of Structures Oefenzittingen MATLAB Scripts", None, None, "dynamics-of-structures-oefenzittingen-matlab.zip"),
    
    # Analyse 1 Maple
    ("Ba - Algemene gemeenschappelijke basis/Semester 1/H01A0B - Analyse I/Oefenzittingen/Modeloplossingen Oefenzittingen/2011-2012/Oefenzitting 2", "H01A0B", 4, "Maple Oefenzitting 2 Worksheets (2011-2012)", None, "2011 - 2012", "maple-oefenzitting-2-worksheets-2011.zip"),
    
    # AI Algoritmes
    ("Ba - Computerwetenschappen/3de bach/H06U1A - Artificiële intelligentie/Algoritmes", "H06U1A", 3, "Artificiële Intelligentie Algoritmes Samenvattingen (LaTeX)", None, None, "ai-algoritmes-samenvattingen-latex.zip"),
    
    # Word Question Bundles
    ("Ma - Civil Engineering/Kernopleiding/Bouwrecht/Vragen en oplossingen 2017-2018", "C00M1A", 2, "Bouwrecht - Examenvragen & Oplossingen 2017-2018", None, "2017 - 2018", "bouwrecht-examenvragen-oplossingen-2017-2018.zip"),
    ("Ma - Civil Engineering/Kernopleiding/Funderingstechniek/Vragen fundering", "H0P79A", 2, "Funderingstechniek - Examenvragen Bundel", None, None, "funderingstechniek-examenvragen-bundel.zip"),
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

# Create remote runner script on liv
remote_script_path = '/tmp/remote_bundle_worker.py'
payload_path = '/tmp/bundle_payload.json'

with open('/tmp/bundle_payload.json', 'w') as f:
    json.dump({'pdf_merges': PDF_MERGES, 'zip_bundles': ZIP_BUNDLES}, f)

# Copy payload to liv
subprocess.run(['scp', '-o', 'BatchMode=yes', '/tmp/bundle_payload.json', 'it@liv:/tmp/bundle_payload.json'], check=True)

worker_code = """
import os, sys, json, zipfile, subprocess, re
from pypdf import PdfWriter, PdfReader

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\\d+)', s)]

staging_base = '/mnt/immich/burgieclan-staging'
with open('/tmp/bundle_payload.json') as f:
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

with open('/tmp/remote_bundle_worker.py', 'w') as f:
    f.write(worker_code)

subprocess.run(['scp', '-o', 'BatchMode=yes', '/tmp/remote_bundle_worker.py', 'it@liv:/tmp/remote_bundle_worker.py'], check=True)

print("2. Merging PDFs and zipping scripts on liv and uploading to Hetzner S3...")
run_cmd = "ssh -o BatchMode=yes it@liv 'python3 /tmp/remote_bundle_worker.py'"
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
