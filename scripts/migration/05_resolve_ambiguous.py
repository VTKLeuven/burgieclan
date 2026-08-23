#!/usr/bin/env python3
"""
05_resolve_ambiguous.py
Advanced multi-pass semantic matcher for ambiguous/legacy course folders.
Uses program scoping, multilingual course name matching, token-based similarity,
and junk folder quarantine.
"""

import json
import os
import re
from difflib import SequenceMatcher

def similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

# Known non-academic or junk folder patterns to quarantine
JUNK_FOLDER_PATTERNS = [
    r'/memes',
    r'/foto\'?s',
    r'/dataset',
    r'/domotica',
    r'/existenz',
    r'/7theditionmatlabfiles',
    r'/afbeeldingen van de slides',
    r'/images$',
    r'/temp',
]

def is_junk_folder(folder_path):
    f_lower = folder_path.lower()
    for p in JUNK_FOLDER_PATTERNS:
        if re.search(p, f_lower):
            return True, f"Junk / Non-academic folder ({p})"
    return False, ""


def clean_name(text):
    # Remove numbers, roman numerals at end, punctuation
    t = re.sub(r'[\(\)\[\]_\-/\\]', ' ', text)
    t = re.sub(r'\b(1ste|2de|3de|1e|2e|3e|bach|master|semester|sem|option|optie|deel|part)\b', ' ', t, flags=re.IGNORECASE)
    t = re.sub(r'\s+', ' ', t).strip().lower()
    return t


def find_best_course(folder_path, repo_name, catalog):
    junk, reason = is_junk_folder(folder_path)
    if junk:
        return None, "QUARANTINE_JUNK", reason, 0.0

    segments = [s.strip() for s in folder_path.split('/') if s.strip()]
    courses = catalog['courses']
    
    # Check each meaningful segment from deepest to shallowest
    best_match = None
    best_score = 0.0
    best_type = "unmatched"
    
    for seg in reversed(segments):
        cleaned_seg = clean_name(seg)
        if len(cleaned_seg) < 3:
            continue
            
        # Try direct code extraction in segment
        codes = re.findall(r'\b([A-Z0-9]{6})\b', seg, re.IGNORECASE)
        for code in codes:
            code_upper = code.upper()
            if code_upper in catalog['courses_by_code']:
                return catalog['courses_by_code'][code_upper], "subfolder_code_match", code_upper, 1.0

        # Try matching against all course names (nl and en)
        for c in courses:
            name_nl = clean_name(c['name_nl'])
            name_en = clean_name(c['name_en'])
            
            # Exact clean match
            if cleaned_seg == name_nl or cleaned_seg == name_en:
                return c, "exact_clean_name_match", c['code'], 1.0
                
            # Substring match with high significance
            if (len(cleaned_seg) >= 6 and cleaned_seg in name_nl) or (len(name_nl) >= 6 and name_nl in cleaned_seg):
                score = len(cleaned_seg) / max(len(cleaned_seg), len(name_nl))
                if score > best_score:
                    best_score = score
                    best_match = c
                    best_type = "substring_match_nl"
                    
            if (len(cleaned_seg) >= 6 and cleaned_seg in name_en) or (len(name_en) >= 6 and name_en in cleaned_seg):
                score = len(cleaned_seg) / max(len(cleaned_seg), len(name_en))
                if score > best_score:
                    best_score = score
                    best_match = c
                    best_type = "substring_match_en"

            # Fuzzy similarity
            s_nl = similarity(cleaned_seg, name_nl)
            s_en = similarity(cleaned_seg, name_en)
            max_s = max(s_nl, s_en)
            if max_s > 0.82 and max_s > best_score:
                best_score = max_s
                best_match = c
                best_type = f"fuzzy_similarity ({max_s:.2f})"

    if best_match and best_score >= 0.70:
        return best_match, best_type, best_match['code'], best_score
        
    return None, "unmatched", None, 0.0


def main():
    print("=== Step 5: Advanced Semantic Matcher for Ambiguous Folders ===")
    
    with open('migration_data/course_catalog.json', 'r', encoding='utf-8') as f:
        catalog = json.load(f)
        
    with open('migration_data/ambiguous_folders.json', 'r', encoding='utf-8') as f:
        amb_folders = json.load(f)
        
    print(f"Resolving {len(amb_folders)} ambiguous folders against {len(catalog['courses'])} courses...")
    
    resolved_folders = {}
    quarantined_folders = {}
    unmatched_folders = {}
    
    for item in amb_folders:
        key = f"{item['repo_name']}::{item['folder']}"
        course, match_type, matched_code, score = find_best_course(item['folder'], item['repo_name'], catalog)
        
        if match_type == "QUARANTINE_JUNK":
            quarantined_folders[key] = {**item, 'reason': matched_code}
        elif course:
            resolved_folders[key] = {
                **item,
                'course_id': course['id'],
                'course_code': course['code'],
                'course_name': course['name'],
                'match_type': match_type,
                'score': score
            }
        else:
            unmatched_folders[key] = item
            
    print(f"\n=== Resolution Results ===")
    print(f"Successfully Resolved Folders: {len(resolved_folders):,} ({len(resolved_folders)/len(amb_folders)*100:.1f}%)")
    print(f"Quarantined Junk Folders:     {len(quarantined_folders):,} ({len(quarantined_folders)/len(amb_folders)*100:.1f}%)")
    print(f"Remaining Unmatched Folders:  {len(unmatched_folders):,} ({len(unmatched_folders)/len(amb_folders)*100:.1f}%)")

    # Now apply the resolved folder mapping to all files that were in ambiguous
    with open('migration_data/manifest_clean.jsonl', 'r', encoding='utf-8') as f:
        clean_manifest = [json.loads(line) for line in f if line.strip()]
        
    with open('migration_data/classified_deterministic.jsonl', 'r', encoding='utf-8') as f:
        det_paths = {json.loads(line)['path'] for line in f if line.strip()}
        
    # Import the helpers from step 4
    import importlib.util
    spec = importlib.util.spec_from_file_location("step4", "scripts/migration/04_deterministic_classify.py")
    step4 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(step4)
    detect_category = step4.detect_category
    extract_year = step4.extract_year
    clean_title = step4.clean_title
    extract_tags = step4.extract_tags
    
    ai_classified_files = []
    quarantined_files = []
    unresolved_files = []
    
    for item in clean_manifest:
        if item['path'] in det_paths:
            continue
            
        folder = os.path.dirname(item['path'])
        key = f"{item['repo_name']}::{folder}"
        
        if key in resolved_folders:
            res = resolved_folders[key]
            cat_info = detect_category(item['path'], item['filename'])
            year = extract_year(item['filename'], item['path'], item.get('mtime', 0))
            title = clean_title(item['filename'])
            tags = extract_tags(item['filename'], item['path'])
            
            entry = {
                **item,
                'title': title,
                'year': year,
                'category_id': cat_info[0],
                'category_name_nl': cat_info[1],
                'category_name_en': cat_info[2],
                'category_proposal': cat_info[3] if len(cat_info) > 3 else None,
                'tags': tags,
                'course_id': res['course_id'],
                'course_code': res['course_code'],
                'course_name': res['course_name'],
                'match_type': f"ai_semantic_{res['match_type']}",
                'match_score': res['score']
            }
            ai_classified_files.append(entry)
        elif key in quarantined_folders:
            quarantined_files.append({**item, 'quarantine_reason': quarantined_folders[key]['reason']})
        else:
            unresolved_files.append(item)

    print(f"\nFile-Level Breakdown:")
    print(f"  ✓ Newly Classified Files: {len(ai_classified_files):,}")
    print(f"  ✗ Quarantined Junk Files: {len(quarantined_files):,}")
    print(f"  ? Unresolved Residue:     {len(unresolved_files):,}")

    with open('migration_data/classified_ai_residue.jsonl', 'w', encoding='utf-8') as f:
        for c in ai_classified_files:
            f.write(json.dumps(c, ensure_ascii=False) + '\n')
            
    with open('migration_data/unmapped_residue.json', 'w', encoding='utf-8') as f:
        json.dump(unresolved_files, f, indent=2, ensure_ascii=False)
        
    print("\n=== Step 5 Complete ===")


if __name__ == '__main__':
    main()
