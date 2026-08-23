#!/usr/bin/env python3
"""
03_filter_and_dedup.py
Filters OS junk, temporary lock files, and zero-byte files,
then performs deduplication by Seafile file ID / content hash.
"""

import json
import os
import re

JUNK_PATTERNS = [
    r'^\.DS_Store$',
    r'^Thumbs\.db$',
    r'^desktop\.ini$',
    r'^\._',
    r'^~\$',
    r'\.tmp$',
    r'\.crdownload$',
    r'\.part$',
]

JUNK_PATH_PATTERNS = [
    r'/__MACOSX/',
    r'/\.Spotlight-V100/',
    r'/\.Trashes/',
    r'/\.git/',
    r'/node_modules/',
    r'/__pycache__/',
]

def is_junk(item):
    filename = item.get('filename', '')
    path = item.get('path', '')
    size = item.get('size_bytes', 0)
    
    # 0-byte file check
    if size == 0:
        return True, "zero_byte"
        
    for p in JUNK_PATTERNS:
        if re.search(p, filename, re.IGNORECASE):
            return True, f"junk_filename ({p})"
            
    for p in JUNK_PATH_PATTERNS:
        if re.search(p, path, re.IGNORECASE):
            return True, f"junk_path ({p})"
            
    return False, ""


def main():
    print("=== Step 3: Junk Filtering & Content Deduplication ===")
    
    input_path = 'migration_data/manifest_raw.jsonl'
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Missing {input_path}")
        
    raw_records = []
    with open(input_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                raw_records.append(json.loads(line))
                
    print(f"Loaded {len(raw_records):,} raw records from {input_path}")
    
    # 1. Filter Junk
    clean_records = []
    quarantined = []
    junk_reasons = {}
    
    for item in raw_records:
        junk, reason = is_junk(item)
        if junk:
            quarantined.append(item)
            junk_reasons[reason] = junk_reasons.get(reason, 0) + 1
        else:
            clean_records.append(item)
            
    print(f"\nQuarantined {len(quarantined):,} junk / empty files:")
    for reason, count in sorted(junk_reasons.items(), key=lambda x: -x[1]):
        print(f"  - {reason}: {count:,}")
        
    print(f"Remaining valid files: {len(clean_records):,}")
    
    # 2. Content Deduplication Analysis
    # Group by file_id (Seafile object hash)
    by_file_id = {}
    for item in clean_records:
        f_id = item.get('file_id')
        if not f_id:
            # Fallback to (filename, size_bytes)
            f_id = f"{item['filename']}::{item['size_bytes']}"
            
        if f_id not in by_file_id:
            by_file_id[f_id] = []
        by_file_id[f_id].append(item)
        
    unique_file_count = len(by_file_id)
    duplicate_instances = len(clean_records) - unique_file_count
    
    # Calculate unique size
    unique_bytes = sum(instances[0]['size_bytes'] for instances in by_file_id.values())
    total_clean_bytes = sum(item['size_bytes'] for item in clean_records)
    
    print(f"\n=== Deduplication Metrics ===")
    print(f"Total valid file instances: {len(clean_records):,} ({total_clean_bytes / (1024**3):.2f} GB)")
    print(f"Unique content objects:     {unique_file_count:,} ({unique_bytes / (1024**3):.2f} GB)")
    print(f"Duplicate instances:        {duplicate_instances:,} (saving {(total_clean_bytes - unique_bytes) / (1024**3):.2f} GB)")
    
    # Tag each item in clean_records with dedup info
    for f_id, instances in by_file_id.items():
        # First instance is canonical
        instances[0]['is_canonical'] = True
        instances[0]['duplicate_count'] = len(instances) - 1
        instances[0]['alt_paths'] = [inst['path'] for inst in instances[1:]]
        
        for inst in instances[1:]:
            inst['is_canonical'] = False
            inst['duplicate_count'] = len(instances) - 1
            inst['canonical_path'] = instances[0]['path']
            inst['canonical_repo'] = instances[0]['repo_name']
            
    # 3. Write clean manifest
    output_clean = 'migration_data/manifest_clean.jsonl'
    with open(output_clean, 'w', encoding='utf-8') as f:
        for item in clean_records:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
            
    # 4. Write report
    report = {
        'total_raw_files': len(raw_records),
        'quarantined_junk_count': len(quarantined),
        'junk_reasons': junk_reasons,
        'valid_files_count': len(clean_records),
        'unique_content_count': unique_file_count,
        'duplicate_instances': duplicate_instances,
        'total_clean_gb': round(total_clean_bytes / (1024**3), 2),
        'unique_content_gb': round(unique_bytes / (1024**3), 2),
        'saved_gb': round((total_clean_bytes - unique_bytes) / (1024**3), 2)
    }
    
    with open('migration_data/dedup_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
        
    print(f"\n=== Step 3 Complete: Clean manifest saved to {output_clean} ===")


if __name__ == '__main__':
    main()
