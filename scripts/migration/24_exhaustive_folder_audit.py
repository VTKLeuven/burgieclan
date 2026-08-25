#!/usr/bin/env python3
"""
24_exhaustive_folder_audit.py
Exhaustively audits EVERY folder in the archive with >= 3 files
to find all instances where an original Seafile folder became multiple flat documents.
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

print(f"Total parent folders in database: {len(folder_groups)}")

# Classify all folders with >= 3 files
classified_folders = {
    'author_summary_folders': [],     # Specific student's multi-chapter summary / notes
    'numbered_chapter_series': [],    # Hoofdstuk 1..N / Chapter 1..N series
    'exercise_session_folders': [],   # Single exercise session with multiple files
    'exam_session_folders': [],       # Single exam with multiple attachments / parts
    'slide_deck_folders': [],         # Multi-part slide dumps
    'code_project_folders': [],       # Code / simulation / lab folders
    'other_multi_file_folders': []
}

CODE_EXTS = {'m', 'py', 'c', 'cpp', 'java', 'mw', 'nb', 'vhd', 'vhdl', 'r', 'ipynb', 'asm', 's', 'tex', 'class', 'h', 'mat'}

for (cc, repo, parent), items in folder_groups.items():
    count = len(items)
    if count < 3:
        continue
        
    filenames = [i.get('filename', '') for i in items]
    exts = [(i.get('extension') or '').lower() for i in items]
    ext_counts = defaultdict(int)
    for e in exts:
        ext_counts[e] += 1
        
    parent_lower = parent.lower()
    
    # 1. Author summary / notes folder
    if any(k in parent_lower for k in ['samenvatting', 'summary', 'notities', 'notes']) and re.search(r'\([a-z\s\-]+\)', parent, re.I):
        classified_folders['author_summary_folders'].append(((cc, repo, parent), items, ext_counts))
        continue
        
    # 2. Numbered chapters / parts series
    numbered_count = sum(1 for fn in filenames if re.search(r'(ch|chapter|h|hoofdstuk|deel|part|les|lesson)\s*[-_]?\s*\d+', fn, re.I))
    if numbered_count >= 3 and (numbered_count / count) >= 0.6:
        if 'slide' in parent_lower or 'presentaties' in parent_lower or 'les' in parent_lower:
            classified_folders['slide_deck_folders'].append(((cc, repo, parent), items, ext_counts))
        else:
            classified_folders['numbered_chapter_series'].append(((cc, repo, parent), items, ext_counts))
        continue
        
    # 3. Code / simulation / lab
    code_count = sum(ext_counts[e] for e in CODE_EXTS)
    if code_count >= 3:
        classified_folders['code_project_folders'].append(((cc, repo, parent), items, ext_counts))
        continue
        
    # 4. Single exercise session (e.g. Oefenzitting 1, Session 3)
    if re.search(r'(oefenzitting|sessie|session|seminar|practicum|labo)\s*[-_]?\s*\d+', parent, re.I):
        classified_folders['exercise_session_folders'].append(((cc, repo, parent), items, ext_counts))
        continue
        
    # 5. Single exam session (e.g. Examen 2019, Examen juni 2021)
    if 'examen' in parent_lower or 'exam' in parent_lower:
        classified_folders['exam_session_folders'].append(((cc, repo, parent), items, ext_counts))
        continue
        
    # 6. Slide decks
    if 'slide' in parent_lower or 'presentatie' in parent_lower or 'slides' in parent_lower:
        classified_folders['slide_deck_folders'].append(((cc, repo, parent), items, ext_counts))
        continue
        
    classified_folders['other_multi_file_folders'].append(((cc, repo, parent), items, ext_counts))

print("="*80)
print("EXHAUSTIVE CLASSIFICATION OF ALL MULTI-FILE FOLDERS")
print("="*80)
for k, v in classified_folders.items():
    total_docs = sum(len(it) for _, it, _ in v)
    print(f"• {k.replace('_', ' ').title()}: {len(v)} folders ({total_docs} files)")

print("\n" + "="*80)
print("1. AUTHOR SUMMARY & NOTE FOLDERS (ORIGINALLY 1 STUDENT UPLOAD)")
print("="*80)
for (cc, repo, parent), items, ext_counts in sorted(classified_folders['author_summary_folders'], key=lambda x: -len(x[1])):
    ext_str = ", ".join(f"{k}: {v}" for k, v in sorted(ext_counts.items(), key=lambda x: -x[1]))
    all_pdf = ext_counts['pdf'] == len(items)
    merge_type = "MERGE PDF" if all_pdf else "BUNDLE ZIP"
    print(f"[{merge_type}] [{cc}] {repo} | /{parent}")
    print(f"   Files: {len(items)} ({ext_str})")
    print(f"   Samples: {[i.get('filename') for i in items[:3]]}")
    print()

print("="*80)
print("2. NUMBERED CHAPTER / PART SERIES")
print("="*80)
for (cc, repo, parent), items, ext_counts in sorted(classified_folders['numbered_chapter_series'], key=lambda x: -len(x[1]))[:15]:
    ext_str = ", ".join(f"{k}: {v}" for k, v in sorted(ext_counts.items(), key=lambda x: -x[1]))
    all_pdf = ext_counts['pdf'] == len(items)
    merge_type = "MERGE PDF" if all_pdf else "BUNDLE ZIP"
    print(f"[{merge_type}] [{cc}] {repo} | /{parent}")
    print(f"   Files: {len(items)} ({ext_str})")
    print(f"   Samples: {[i.get('filename') for i in items[:3]]}")
    print()

print("="*80)
print("3. EXERCISE SESSION FOLDERS (SINGLE OZ WITH MULTIPLE ATTACHMENTS)")
print("="*80)
for (cc, repo, parent), items, ext_counts in sorted(classified_folders['exercise_session_folders'], key=lambda x: -len(x[1]))[:15]:
    ext_str = ", ".join(f"{k}: {v}" for k, v in sorted(ext_counts.items(), key=lambda x: -x[1]))
    print(f"📝 [{cc}] {repo} | /{parent}")
    print(f"   Files: {len(items)} ({ext_str})")
    print(f"   Samples: {[i.get('filename') for i in items[:3]]}")
    print()
