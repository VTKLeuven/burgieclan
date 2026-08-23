#!/usr/bin/env python3
"""
06_generate_review_sheet.py
Merges all classified manifests, computes detailed audit metrics,
and exports human-readable review spreadsheets:
- mapping_summary.csv (Course-level aggregation)
- category_proposals.json (Breakdown of standard & proposed categories)
- unmapped_warnings.csv (Residue and quarantined files)
"""

import json
import csv
import os

def main():
    print("=== Step 6: Review, Merge & Approval Gate ===")
    
    # 1. Load Deterministic matches
    deterministic = []
    with open('migration_data/classified_deterministic.jsonl', 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                deterministic.append(json.loads(line))
                
    # 2. Load Semantic AI matches
    semantic = []
    with open('migration_data/classified_ai_residue.jsonl', 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                semantic.append(json.loads(line))

    # 3. Load Deep KU Leuven API Recovered matches
    recovered = []
    if os.path.exists('migration_data/recovered_entries.jsonl'):
        import re
        with open('migration_data/recovered_entries.jsonl', 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    code = item.get('course_code', '')
                    if re.match(r'^[HDGB][0-9A-Z]{5}$', code):
                        recovered.append(item)
                
    # 4. Load True Unresolved Residue
    true_unresolved = []
    if os.path.exists('migration_data/true_unresolved.json'):
        with open('migration_data/true_unresolved.json', 'r', encoding='utf-8') as f:
            true_unresolved = json.load(f)
        
    all_classified = deterministic + semantic + recovered
    print(f"Total Approved & Classified Files: {len(all_classified):,} (from {len(deterministic):,} det + {len(semantic):,} sem + {len(recovered):,} KU Leuven API recovered)")
    print(f"True Unresolved Residue Files:    {len(true_unresolved):,}")
    
    # 4. Write consolidated final manifest
    output_final_manifest = 'migration_data/manifest_classified_final.jsonl'
    with open(output_final_manifest, 'w', encoding='utf-8') as f:
        for item in all_classified:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
            
    # 5. Generate mapping_summary.csv (Aggregated by Course & Category)
    course_groups = {}
    total_classified_bytes = 0
    
    for item in all_classified:
        c_code = item['course_code']
        c_name = item['course_name']
        cat_nl = item['category_name_nl']
        cat_prop = item.get('category_proposal') or cat_nl
        size = item.get('size_bytes', 0)
        total_classified_bytes += size
        
        key = (c_code, c_name, cat_nl, cat_prop)
        if key not in course_groups:
            course_groups[key] = {
                'course_code': c_code,
                'course_name': c_name,
                'category_default': cat_nl,
                'category_proposal': cat_prop.replace('PROPOSAL: ', ''),
                'file_count': 0,
                'total_bytes': 0,
                'sample_files': [],
                'sample_years': set(),
                'sample_repos': set(),
            }
        course_groups[key]['file_count'] += 1
        course_groups[key]['total_bytes'] += size
        if len(course_groups[key]['sample_files']) < 3:
            course_groups[key]['sample_files'].append(item['title'])
        course_groups[key]['sample_years'].add(item['year'])
        course_groups[key]['sample_repos'].add(item['repo_name'])

    summary_csv_path = 'migration_data/mapping_summary.csv'
    with open(summary_csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'Course Code',
            'Course Name',
            'Default Category',
            'Proposed Specific Category',
            'File Count',
            'Total Size (MB)',
            'Degree Programs',
            'Academic Years',
            'Sample Document Titles'
        ])
        
        # Sort by course code, then category
        sorted_groups = sorted(course_groups.values(), key=lambda x: (x['course_code'], x['category_default']))
        for g in sorted_groups:
            writer.writerow([
                g['course_code'],
                g['course_name'],
                g['category_default'],
                g['category_proposal'],
                g['file_count'],
                round(g['total_bytes'] / (1024**2), 2),
                ', '.join(sorted(g['sample_repos'])),
                ', '.join(sorted(g['sample_years'])[:5]),
                '; '.join(g['sample_files'])
            ])
            
    print(f"  ✓ Saved course summary mapping to {summary_csv_path} ({len(sorted_groups)} course-category groups)")

    # 6. Generate category_proposals.json
    cat_summary = {}
    for item in all_classified:
        prop = item.get('category_proposal') or item['category_name_nl']
        prop_clean = prop.replace('PROPOSAL: ', '')
        if prop_clean not in cat_summary:
            cat_summary[prop_clean] = {'file_count': 0, 'total_mb': 0}
        cat_summary[prop_clean]['file_count'] += 1
        cat_summary[prop_clean]['total_mb'] += item.get('size_bytes', 0) / (1024**2)
        
    for k in cat_summary:
        cat_summary[k]['total_mb'] = round(cat_summary[k]['total_mb'], 2)

    with open('migration_data/category_proposals.json', 'w', encoding='utf-8') as f:
        json.dump(cat_summary, f, indent=2)
        
    # 7. Generate unmapped_warnings.csv
    warnings_csv_path = 'migration_data/unmapped_warnings.csv'
    with open(warnings_csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Degree Library', 'Path', 'Filename', 'Size (KB)', 'Extension'])
        for item in true_unresolved:
            writer.writerow([
                item['repo_name'],
                item['path'],
                item['filename'],
                round(item.get('size_bytes', 0) / 1024, 1),
                item.get('extension', '')
            ])
            
    print(f"  ✓ Saved unmapped residue warnings to {warnings_csv_path}")

    # 8. Print Executive Summary
    print("\n" + "="*60)
    print("       PREPROCESSING & CLASSIFICATION AUDIT REPORT")
    print("="*60)
    print(f"Total Raw Seafile Files:        19,604 (57.02 GB)")
    print(f"Quarantined Junk Files:            431 (OS shadow files, 0-byte, temp)")
    print(f"Valid Source File Instances:    19,173 (57.02 GB)")
    print(f"Unique Deduplicated Content:    17,553 (53.59 GB)")
    print(f"-"*60)
    print(f"CLASSIFIED & READY TO INGEST:   {len(all_classified):,} files ({total_classified_bytes / (1024**3):.2f} GB)")
    print(f"  - Deterministic Matches:      {len(deterministic):,} files")
    print(f"  - Semantic Matches:           {len(semantic):,} files")
    print(f"  - KU Leuven API Recovered:    {len(recovered):,} files")
    print(f"Unmapped Residue / Discontinued: {len(true_unresolved):,} files ({sum(u.get('size_bytes',0) for u in true_unresolved)/(1024**3):.2f} GB)")
    print(f"Overall Classification Hit Rate: {len(all_classified) / 19173 * 100:.1f}%")
    print("="*60)
    print("\nCategory Taxonomy Distribution:")
    for cat_name, info in sorted(cat_summary.items(), key=lambda x: -x[1]['file_count']):
        print(f"  • {cat_name: <25}: {info['file_count']: >6,} files ({info['total_mb']: >8.1f} MB)")
    print("="*60)


if __name__ == '__main__':
    main()
