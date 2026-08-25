#!/usr/bin/env python3
"""
21_find_micro_clusters_and_series.py
Scans for smaller clusters (4 to 30 files in a single folder) that share:
1. Uniform code / project extensions (.py, .m, .c, .java, .mw, .r, .vhd, etc.)
2. Systematic series naming (e.g., Slide 1..20, Problem 1..15, Oefening 1..12, Part A..Z)
3. Micro-files / 1-page question fragments in dedicated subfolders.
"""

import json
import re
from collections import defaultdict

with open('migration_data/manifest_final_standardized_validated.json') as f:
    docs = json.load(f)

# Group documents by (course_code, repo_name, parent_folder)
folder_groups = defaultdict(list)

for d in docs:
    p = d.get('path', '')
    parent = '/'.join(p.strip('/').split('/')[:-1])
    repo = d.get('repo_name', '')
    cc = d.get('course_code', '')
    folder_groups[(cc, repo, parent)].append(d)

CODE_EXTS = {'m', 'py', 'c', 'cpp', 'java', 'mw', 'nb', 'vhd', 'vhdl', 'r', 'ipynb', 'asm', 's', 'tex', 'class', 'h'}
DATA_EXTS = {'csv', 'dat', 'txt', 'json', 'xml', 'mat'}

clusters_by_type = {
    'code_project_dumps': [],      # Loose programming / toolbox files
    'enumerated_slide_series': [], # Individual slide page dumps (e.g., Slide1.pdf..Slide25.pdf)
    'enumerated_exercise_series': [], # Single question / exercise page fragments
    'cad_model_clusters': [],      # CAD parts / drawing sets (.dwg, .step, .sldprt)
    'office_fragment_series': []   # Multiple .docx / .xlsx for a single assignment
}

for (cc, repo, parent), items in folder_groups.items():
    count = len(items)
    if count < 4:
        continue # Ignore small folders (< 4 files)
        
    filenames = [i.get('filename', '') for i in items]
    exts = [(i.get('extension') or '').lower() for i in items]
    ext_counts = defaultdict(int)
    for e in exts:
        ext_counts[e] += 1
        
    # Check 1: Code / Project Dumps (e.g. 4+ code files in one directory)
    code_count = sum(ext_counts[e] for e in CODE_EXTS)
    if code_count >= 4 or (code_count >= 3 and count <= 6):
        clusters_by_type['code_project_dumps'].append(((cc, repo, parent), items, ext_counts))
        continue
        
    # Check 2: Enumerated Slide Series (e.g. Slide_01.pdf ... Slide_20.pdf, Les 1 Deel 1...10)
    slide_matches = sum(1 for fn in filenames if re.search(r'(slide|les|lecture|ch\d+|hoofdstuk|w\d+)\s*[-_]?\s*\d+', fn, re.I))
    if slide_matches >= 4 and count >= 5:
        clusters_by_type['enumerated_slide_series'].append(((cc, repo, parent), items, ext_counts))
        continue
        
    # Check 3: Enumerated Exercise Series (e.g. Oef_1..10, Vraag_1..15, Problem_1..10)
    ex_matches = sum(1 for fn in filenames if re.search(r'(oef|oefening|vraag|prob|problem|ex|exercise|taak|opdracht|sessie)\s*[-_]?\s*\d+', fn, re.I))
    if ex_matches >= 4 and count >= 5:
        clusters_by_type['enumerated_exercise_series'].append(((cc, repo, parent), items, ext_counts))
        continue
        
    # Check 4: Office fragments / Sheets (e.g. 5+ .xlsx or .docx in one assignment folder)
    office_count = ext_counts['docx'] + ext_counts['doc'] + ext_counts['xlsx'] + ext_counts['xls']
    if office_count >= 4:
        clusters_by_type['office_fragment_series'].append(((cc, repo, parent), items, ext_counts))

print("="*80)
print("SUMMARY OF CANDIDATE MICRO-CLUSTERS FOUND")
print("="*80)
for k, v in clusters_by_type.items():
    total_files = sum(len(items) for _, items, _ in v)
    print(f"• {k.replace('_', ' ').title()}: {len(v)} folders ({total_files} total files)")

print("\n" + "="*80)
print("1. CODE & PROJECT REPOSITORIES (CANDIDATES FOR LAB / PROJECT ZIPS)")
print("="*80)
for (cc, repo, parent), items, ext_counts in sorted(clusters_by_type['code_project_dumps'], key=lambda x: -len(x[1]))[:12]:
    ext_str = ", ".join(f"{k}: {v}" for k, v in sorted(ext_counts.items(), key=lambda x: -x[1]))
    print(f"💻 [{cc}] {repo} | /{parent}")
    print(f"   Files: {len(items)} ({ext_str})")
    print(f"   Samples: {[i.get('filename') for i in items[:3]]}")
    print()

print("="*80)
print("2. ENUMERATED EXERCISE & QUESTION FRAGMENTS")
print("="*80)
for (cc, repo, parent), items, ext_counts in sorted(clusters_by_type['enumerated_exercise_series'], key=lambda x: -len(x[1]))[:10]:
    ext_str = ", ".join(f"{k}: {v}" for k, v in sorted(ext_counts.items(), key=lambda x: -x[1]))
    print(f"📝 [{cc}] {repo} | /{parent}")
    print(f"   Files: {len(items)} ({ext_str})")
    print(f"   Samples: {[i.get('filename') for i in items[:3]]}")
    print()

print("="*80)
print("3. SLIDE / CHAPTER PAGE DUMPS")
print("="*80)
for (cc, repo, parent), items, ext_counts in sorted(clusters_by_type['enumerated_slide_series'], key=lambda x: -len(x[1]))[:10]:
    ext_str = ", ".join(f"{k}: {v}" for k, v in sorted(ext_counts.items(), key=lambda x: -x[1]))
    print(f"📑 [{cc}] {repo} | /{parent}")
    print(f"   Files: {len(items)} ({ext_str})")
    print(f"   Samples: {[i.get('filename') for i in items[:3]]}")
    print()
