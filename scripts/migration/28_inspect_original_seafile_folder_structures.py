#!/usr/bin/env python3
"""
28_inspect_original_seafile_folder_structures.py
Audits the exact original Seafile paths for all flagged document clusters
to see if they were in those exact course folders in the original Burgieclan.
"""

import json
from collections import defaultdict

with open('migration_data/manifest_final_standardized_validated.json') as f:
    docs = json.load(f)

# Group documents by their original Seafile folder path vs their assigned course
clusters = [
    ("TM2 Sterkteleer", lambda d: 'sterkteleer' in d.get('path', '').lower() and 'h01c8b' in d.get('path', '').lower()),
    ("Materiaalkunde vs Electronics", lambda d: 'h01j6a' in d.get('path', '').lower() or 'h01j2b' in d.get('path', '').lower()),
    ("Beton in P&O 2 / Bouwkunde", lambda d: 'beton' in d.get('path', '').lower() and ('h01d4b' in d.get('path', '').lower() or 'bouwkunde' in d.get('repo_name', '').lower())),
    ("Hydraulica in Bouwkunde", lambda d: 'hydraulica' in d.get('path', '').lower()),
    ("Celbiologie in Biomedische", lambda d: 'celbiologie' in d.get('path', '').lower()),
]

for label, func in clusters:
    matched = [d for d in docs if func(d)]
    print("="*80)
    print(f"CLUSTER: {label} ({len(matched)} documents)")
    print("="*80)
    # Group by (repo_name, top_folder, course_code)
    groups = defaultdict(list)
    for d in matched:
        repo = d.get('repo_name', '')
        p = d.get('path', '')
        top_folder = '/'.join(p.strip('/').split('/')[:2])
        cc = d.get('course_code', '')
        groups[(repo, top_folder, cc)].append(d)
        
    for (repo, top_f, cc), items in sorted(groups.items(), key=lambda x: -len(x[1])):
        print(f"📁 Repo: [{repo}] | Folder: /{top_f} | Course Code: {cc} ({len(items)} files)")
        print(f"   Sample filenames: {[i.get('filename') for i in items[:3]]}")
        print(f"   Sample path: {items[0].get('path')}")
        print()

