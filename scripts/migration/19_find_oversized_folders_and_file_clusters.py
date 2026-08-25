#!/usr/bin/env python3
"""
19_find_oversized_folders_and_file_clusters.py
Finds folders where many individual documents exist that might belong together
(e.g., photo sets, multi-page image dumps, split exercise sheets, fragmented slide decks, zip bundles).
"""

import json
from collections import defaultdict

with open('migration_data/manifest_final_standardized_validated.json') as f:
    docs = json.load(f)

# Group all documents by their immediate parent directory
folder_groups = defaultdict(list)

for d in docs:
    p = d.get('path', '')
    parent = '/'.join(p.strip('/').split('/')[:-1])
    repo = d.get('repo_name', '')
    cc = d.get('course_code', '')
    folder_groups[(repo, cc, parent)].append(d)

print(f"Total parent folders: {len(folder_groups)}")

# 1. Folders with >= 10 documents
large_folders = {k: v for k, v in folder_groups.items() if len(v) >= 10}
print(f"Total folders with >= 10 documents: {len(large_folders)}")

# 2. Check for image-heavy folders (photo sets)
image_clusters = []
for (repo, cc, parent), items in folder_groups.items():
    images = [i for i in items if (i.get('extension') or '').lower() in ['jpg', 'jpeg', 'png', 'heic', 'webp', 'bmp']]
    if len(images) >= 2:
        image_clusters.append(((repo, cc, parent), images))

print(f"Folders with >= 2 loose images: {len(image_clusters)}")

# 3. Check for code/script dumps (e.g. 15 .m files or .py files in one folder)
code_clusters = []
for (repo, cc, parent), items in folder_groups.items():
    code_files = [i for i in items if (i.get('extension') or '').lower() in ['m', 'py', 'c', 'cpp', 'java', 'vhd', 'vhdl', 'ipynb']]
    if len(code_files) >= 5:
        code_clusters.append(((repo, cc, parent), code_files))

print(f"Folders with >= 5 code/script files: {len(code_clusters)}")

# 4. Check for zip bundles in database (already bundled photo sets / exercise packs)
zip_docs = [d for d in docs if (d.get('extension') or '').lower() == 'zip']
print(f"Total pre-bundled ZIP archives in database: {len(zip_docs)}")

print("\n" + "="*80)
print("TOP 15 LARGEST FOLDER CLUSTERS IN THE ARCHIVE")
print("="*80)

for (repo, cc, parent), items in sorted(large_folders.items(), key=lambda x: -len(x[1]))[:15]:
    exts = defaultdict(int)
    for it in items:
        exts[(it.get('extension') or 'unknown').lower()] += 1
    ext_str = ", ".join(f"{k}: {v}" for k, v in sorted(exts.items(), key=lambda x: -x[1]))
    sample_files = [it.get('filename') for it in items[:3]]
    print(f"📁 [{cc}] {repo}")
    print(f"   Path: /{parent}")
    print(f"   Files: {len(items)} documents ({ext_str})")
    print(f"   Samples: {sample_files}")
    print()

print("="*80)
print("CODE / SCRIPT CLUSTERS (POTENTIAL BUNDLES)")
print("="*80)
for (repo, cc, parent), items in sorted(code_clusters, key=lambda x: -len(x[1]))[:10]:
    exts = set((it.get('extension') or '').lower() for it in items)
    print(f"💻 [{cc}] {repo} | Path: /{parent} ({len(items)} files, {', '.join(exts)})")
    print(f"   Samples: {[it.get('filename') for it in items[:3]]}")
    print()

print("="*80)
print("LOOSE PHOTO / IMAGE CLUSTERS")
print("="*80)
if image_clusters:
    for (repo, cc, parent), items in image_clusters:
        print(f"🖼️ [{cc}] {repo} | Path: /{parent} ({len(items)} images)")
        print(f"   Samples: {[it.get('filename') for it in items]}")
        print()
else:
    print("No loose multi-image photo clusters found — all previous multi-image photo folders were already bundled into unified ZIP / PDF sets!")
