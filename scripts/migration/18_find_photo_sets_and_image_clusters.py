#!/usr/bin/env python3
"""
18_find_photo_sets_and_image_clusters.py
Scans for folders in the archive where multiple images (jpg, png, heic, jpeg)
belong to the same logical photo set (e.g. exam photos, blackboard photos, scanned pages).
"""

import json
from collections import defaultdict

with open('migration_data/manifest_final_standardized_validated.json') as f:
    docs = json.load(f)

# Group files by their immediate parent directory
folders_with_images = defaultdict(list)
image_extensions = {'jpg', 'jpeg', 'png', 'heic', 'tif', 'tiff', 'webp', 'bmp'}

for d in docs:
    p = d.get('path', '')
    ext = (d.get('extension') or '').lower()
    fn = d.get('filename', '')
    repo = d.get('repo_name', '')
    cc = d.get('course_code', '')
    
    # Check if image
    if ext in image_extensions:
        parent = '/'.join(p.strip('/').split('/')[:-1])
        key = (repo, cc, parent)
        folders_with_images[key].append(d)

print(f"Total folders containing loose images: {len(folders_with_images)}")

# Filter to folders that have multiple images (e.g. >= 3 images in one folder)
multi_image_clusters = {k: v for k, v in folders_with_images.items() if len(v) >= 3}
print(f"Total photo sets / image clusters (>= 3 images in 1 folder): {len(multi_image_clusters)}\n")

total_cluster_images = sum(len(v) for v in multi_image_clusters.values())
print(f"Total individual images trapped in multi-image folders: {total_cluster_images}\n")

# Sort clusters by number of images descending
for (repo, cc, folder), items in sorted(multi_image_clusters.items(), key=lambda x: -len(x[1])):
    exts = set(i.get('extension') for i in items)
    sample_names = [i.get('filename') for i in items[:4]]
    years = sorted(list(set(i.get('year') for i in items if i.get('year'))))
    year_str = ", ".join(years) if years else "Undated"
    print(f"📁 [{cc}] {repo}")
    print(f"   Folder: /{folder}")
    print(f"   Images: {len(items)} files ({', '.join(exts)}) | Year: {year_str}")
    print(f"   Sample filenames: {sample_names}")
    print()
