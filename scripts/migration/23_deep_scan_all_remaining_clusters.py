#!/usr/bin/env python3
"""
23_deep_scan_all_remaining_clusters.py
Exhaustively scans all 2,500+ folders in the manifest for:
1. Multi-part PDF summary / lecture series (mergeable with pypdf)
2. Micro-question / multi-file exercise sessions (bundleable into ZIP)
3. MATLAB / Python / C / VHDL / Maple code dumps (bundleable into ZIP)
4. Office assignment sets (.docx / .xlsx / .pptx)
"""

import json
import re
from collections import defaultdict

with open('migration_data/manifest_final_standardized_validated.json') as f:
    docs = json.load(f)

folder_groups = defaultdict(list)
for d in docs:
    p = d.get('path', '')
    parent = '/'.join(p.strip('/').split('/')[:-1])
    repo = d.get('repo_name', '')
    cc = d.get('course_code', '')
    folder_groups[(cc, repo, parent)].append(d)

mergeable_pdf_series = []
bundleable_code_zips = []
bundleable_question_zips = []
bundleable_office_sets = []

CODE_EXTS = {'m', 'py', 'c', 'cpp', 'java', 'mw', 'nb', 'vhd', 'vhdl', 'r', 'ipynb', 'asm', 's', 'tex', 'class', 'h', 'mat'}

for (cc, repo, parent), items in folder_groups.items():
    count = len(items)
    if count < 3:
        continue # Need at least 3 files in the folder
        
    filenames = [i.get('filename', '') for i in items]
    exts = [(i.get('extension') or '').lower() for i in items]
    ext_counts = defaultdict(int)
    for e in exts:
        ext_counts[e] += 1
        
    # Check 1: Pure PDF Series with chapter / part / lesson numbering
    if ext_counts['pdf'] == count and count >= 3:
        # Check if filenames have systematic chapter / lesson / part numbering
        numbered_files = sum(1 for fn in filenames if re.search(r'(ch|chapter|h|hoofdstuk|les|lesson|lecture|deel|part|zitting|session|w)\s*[-_]?\s*\d+', fn, re.I))
        if numbered_files >= 3 and (numbered_files / count) >= 0.7:
            mergeable_pdf_series.append(((cc, repo, parent), items, ext_counts))
            continue
            
    # Check 2: Code & Project Clusters
    code_count = sum(ext_counts[e] for e in CODE_EXTS)
    if code_count >= 3:
        bundleable_code_zips.append(((cc, repo, parent), items, ext_counts))
        continue
        
    # Check 3: Fragmented Question / Exercise sets (mostly docx / doc / pdf question slices)
    question_files = sum(1 for fn in filenames if re.search(r'(vraag|oef|prob|taak|opgave|oefening|question|exercise)\s*[-_]?\s*\d+', fn, re.I))
    if question_files >= 3 and count >= 4:
        bundleable_question_zips.append(((cc, repo, parent), items, ext_counts))
        continue
        
    # Check 4: Office dumps (.docx / .xlsx / .pptx)
    office_count = ext_counts['docx'] + ext_counts['doc'] + ext_counts['xlsx'] + ext_counts['xls'] + ext_counts['pptx'] + ext_counts['ppt']
    if office_count >= 3 and (office_count / count) >= 0.7:
        bundleable_office_sets.append(((cc, repo, parent), items, ext_counts))

print("="*80)
print(f"DEEP SCAN RESULTS ACROSS ALL REMAINING {len(docs)} DOCUMENTS")
print("="*80)
print(f"1. Mergeable PDF Series (Chapters/Lessons): {len(mergeable_pdf_series)} folders ({sum(len(it) for _, it, _ in mergeable_pdf_series)} PDFs)")
print(f"2. Code & Script Clusters: {len(bundleable_code_zips)} folders ({sum(len(it) for _, it, _ in bundleable_code_zips)} files)")
print(f"3. Fragmented Question / Exercise Sets: {len(bundleable_question_zips)} folders ({sum(len(it) for _, it, _ in bundleable_question_zips)} files)")
print(f"4. Office / Assignment Dumps: {len(bundleable_office_sets)} folders ({sum(len(it) for _, it, _ in bundleable_office_sets)} files)")

print("\n" + "="*80)
print("TOP MERGEABLE PDF SERIES (CAN BE MERGED INTO 1 MULTI-PAGE PDF)")
print("="*80)
for (cc, repo, parent), items, ext_counts in sorted(mergeable_pdf_series, key=lambda x: -len(x[1]))[:15]:
    print(f"📄 [{cc}] {repo} | /{parent} ({len(items)} PDFs)")
    print(f"   Samples: {[i.get('filename') for i in items[:3]]}")
    print()

print("="*80)
print("TOP CODE & SCRIPT CLUSTERS (CAN BE BUNDLED INTO 1 ZIP)")
print("="*80)
for (cc, repo, parent), items, ext_counts in sorted(bundleable_code_zips, key=lambda x: -len(x[1]))[:15]:
    ext_str = ", ".join(f"{k}: {v}" for k, v in sorted(ext_counts.items(), key=lambda x: -x[1]))
    print(f"💻 [{cc}] {repo} | /{parent} ({len(items)} files, {ext_str})")
    print(f"   Samples: {[i.get('filename') for i in items[:3]]}")
    print()

print("="*80)
print("TOP QUESTION & EXERCISE FRAGMENT CLUSTERS")
print("="*80)
for (cc, repo, parent), items, ext_counts in sorted(bundleable_question_zips, key=lambda x: -len(x[1]))[:10]:
    ext_str = ", ".join(f"{k}: {v}" for k, v in sorted(ext_counts.items(), key=lambda x: -x[1]))
    print(f"📝 [{cc}] {repo} | /{parent} ({len(items)} files, {ext_str})")
    print(f"   Samples: {[i.get('filename') for i in items[:3]]}")
    print()

print("="*80)
print("TOP OFFICE ASSIGNMENT SETS")
print("="*80)
for (cc, repo, parent), items, ext_counts in sorted(bundleable_office_sets, key=lambda x: -len(x[1]))[:10]:
    ext_str = ", ".join(f"{k}: {v}" for k, v in sorted(ext_counts.items(), key=lambda x: -x[1]))
    print(f"📊 [{cc}] {repo} | /{parent} ({len(items)} files, {ext_str})")
    print(f"   Samples: {[i.get('filename') for i in items[:3]]}")
    print()
