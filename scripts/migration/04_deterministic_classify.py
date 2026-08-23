#!/usr/bin/env python3
"""
04_deterministic_classify.py
Performs deterministic course matching, category mapping, academic year extraction,
and title normalization on the cleaned manifest.
"""

import json
import os
import re
from datetime import datetime

# Regex for KU Leuven course codes (e.g., H01A0B, H01A4B, H03E3A, B-KUL-H01A0B, G0B23A)
COURSE_CODE_REGEX = re.compile(r'\b(?:B-KUL-)?([A-Z0-9]{6})\b', re.IGNORECASE)

# Academic year patterns
YEAR_RANGE_REGEX = re.compile(r'\b(19\d\d|20\d\d)[-_/](19\d\d|20\d\d)\b')
SHORT_YEAR_RANGE_REGEX = re.compile(r'\b\'?([0-2]\d)[-_/]\'?([0-2]\d)\b')
SINGLE_YEAR_REGEX = re.compile(r'\b(19\d\d|20\d\d)\b')

def extract_year(filename, path, mtime):
    # 1. Search in filename first (highest priority)
    m = YEAR_RANGE_REGEX.search(filename)
    if m:
        y1, y2 = int(m.group(1)), int(m.group(2))
        if y2 == y1 + 1 or y2 == y1:
            return f"{y1} - {y1+1}"
            
    m = SHORT_YEAR_RANGE_REGEX.search(filename)
    if m:
        y1, y2 = int(m.group(1)), int(m.group(2))
        y1 += 2000 if y1 < 50 else 1900
        y2 += 2000 if y2 < 50 else 1900
        if y2 == y1 + 1:
            return f"{y1} - {y2}"

    # 2. Search in path
    m = YEAR_RANGE_REGEX.search(path)
    if m:
        y1, y2 = int(m.group(1)), int(m.group(2))
        if y2 == y1 + 1 or y2 == y1:
            return f"{y1} - {y1+1}"

    # 3. Single year in filename (e.g. "Examen 2021 Blanco.pdf")
    m = SINGLE_YEAR_REGEX.search(filename)
    if m:
        y = int(m.group(1))
        if 1990 <= y <= 2026:
            # Check if there's a month in filename (e.g. 2021-01-24)
            date_m = re.search(r'\b(20\d\d)[-_](\d{2})[-_](\d{2})\b', filename)
            if date_m:
                month = int(date_m.group(2))
                if month >= 9:
                    return f"{y} - {y+1}"
                else:
                    return f"{y-1} - {y}"
            return f"{y-1} - {y}"

    # 4. Fallback to file mtime
    if mtime and mtime > 0:
        dt = datetime.fromtimestamp(mtime)
        y = dt.year
        month = dt.month
        if 1995 <= y <= 2026:
            if month >= 9:
                return f"{y} - {y+1}"
            else:
                return f"{y-1} - {y}"

    return "2024 - 2025"


def detect_category(path, filename, ext=''):
    full_str = f"{path}/{filename}".lower()
    ext = ext.lower() if ext else os.path.splitext(filename)[1].lstrip('.').lower()
    
    # Priority 1: TTT's
    if any(k in full_str for k in ['/ttt/', '/ttt', 'ttt_', 'ttt-', 'tussentijdse toets', 'proefexamen', 'midterm']):
        return 5, "TTT's", "TTT's", "TTT's"
        
    # Priority 2: Exams
    if any(k in full_str for k in ['/examen', '/examens', 'examen ', 'examen_', 'examen-', 'examens', 'tentamen', 'herkansing', '/exam/', '/exams/', '/exam ', '/exams ', 'exam_', 'exams_', 'examenvragen']) or re.search(r'\b(exam|exams|examen|examens|tentamen|herkansing|examenvragen)\b', full_str):
        return 2, "Examens", "Exams", "Examens"
        
    # Priority 3: Labo & Code / Toolboxes
    if ext in ['m', 'hs', 'pl', 'py', 'c', 'cpp', 'java', 'r', 'mat', 'class', 'ctxt', 'idp'] or any(k in full_str for k in ['/help/', '/doc/', '/tools/', '/typedetails/', '/rwthmindstormsnxt/']):
        return 4, "Oefenzittingen", "Exercise Sessions", "Labo & Code"

    # Priority 4: Reports & Projects / Research Papers
    if any(k in full_str for k in ['/verslagen', '/rapporten', '/p&o', '/project', 'verslag', 'laboverslag', 'report', '/papers', 'paper', 'breeam']) or re.search(r'\b(verslag|verslagen|rapport|rapporten|p&o|project|projecten|paper|papers)\b', full_str):
        return 4, "Oefenzittingen", "Exercise Sessions", "Verslagen & Projecten"

    # Priority 5: Slides & Presentations / Lecture packs
    if any(k in full_str for k in ['/transparanten', '/slides', '/lesmateriaal', '/hoorcollege', 'slides', 'transparanten', 'presentatie', 'presentaties', 'lecture', 'lectures', 'gastcollege', 'dia']) or ext in ['ppt', 'pptx'] or re.search(r'\b(slides|transparanten|slide|hoorcollege|seminarie|presentatie|lecture|ch0\d|ch1\d|dia\d)\b', full_str):
        return 3, "Samenvattingen", "Summaries", "Slides / Lesmateriaal"

    # Priority 6: Exercise Sessions / Solutions / Tasks
    if any(k in full_str for k in ['/oefenzitting', '/oefenzittingen', '/oefeningen', '/werkcollege', '/exercises', 'oefenzitting', 'werkcollege', '/solutions', 'solutions/', '/oplossingen', 'oplossing', 'opgaven', 'practicum', 'homework', 'assignment', 'vragen']) or re.search(r'\b(oefening|oefeningen|oefenzitting|exercise|exercises|solution|solutions|oplossing|oplossingen|taak|taken|opgave|opgaven|practicum|vragen)\b', full_str):
        return 4, "Oefenzittingen", "Exercise Sessions", "Oefenzittingen"

    # Priority 7: Summaries / Class Notes / Formularia / Wikis / Flashcards
    if any(k in full_str for k in ['/samenvatting', '/samenvattingen', 'samenvatting', 'summary', 'notities', 'cheatsheet', 'formularium', 'formuleblad', 'handboek', 'cursus', 'class notes', 'notes', 'nota', 'wiki', 'afleiding', 'schema', 'flashcards', 'leerstof', 'inleiding', 'opmerkingen']) or re.search(r'\b(summary|samenvatting|notities|notes|nota|formularium|formuleblad|cheatsheet|handboek|guide|cursus|tekst|wiki|wikis|afleiding|schema|flashcard|anki|opmerking|opmerkingen)\b', full_str) or ext == 'apkg':
        return 3, "Samenvattingen", "Summaries", "Samenvattingen"

    # Fallback: Overig / Other
    return 3, "Samenvattingen", "Summaries", "Overig / Other"


def extract_tags(filename, path):
    tags = []
    f_lower = f"{filename} {path}".lower()
    
    if any(k in f_lower for k in ['oplossing', 'oplossingen', 'solution', 'solutions', 'antwoorden', 'opl', 'answers', 'solved']):
        tags.append('Oplossing')
    if any(k in f_lower for k in ['theorie', 'theory']):
        tags.append('Theorie')
    if any(k in f_lower for k in ['oefening', 'oefeningen', 'exercises', 'problem', 'problems']):
        tags.append('Oefeningen')
    if any(k in f_lower for k in ['proefexamen', 'mock', 'sample exam']):
        tags.append('Proefexamen')
    if any(k in f_lower for k in ['formularium', 'formuleblad', 'cheatsheet', 'formula']):
        tags.append('Formularium')
        
    return tags


def clean_title(filename):
    name_no_ext = os.path.splitext(filename)[0]
    # Replace underscores, hyphens, and dots with spaces
    cleaned = re.sub(r'[_.\-]+', ' ', name_no_ext)
    # Remove excessive whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    # Title Case
    return ' '.join(word.capitalize() for word in cleaned.split())


def match_course(path, repo_name, catalog):
    courses_by_code = catalog['courses_by_code']
    
    # 1. Search for 6-char KU Leuven course code in path segments
    segments = [s.strip() for s in path.split('/') if s.strip()]
    
    for seg in segments:
        codes = COURSE_CODE_REGEX.findall(seg)
        for code in codes:
            code_upper = code.upper()
            if code_upper in courses_by_code:
                return courses_by_code[code_upper], "exact_code_match", code_upper
                
    # 2. Fuzzy / Name matching against course catalog
    # Normalize segment names
    for seg in segments:
        seg_clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', seg).lower().strip()
        if len(seg_clean) < 4:
            continue
        if seg_clean in ['semester 1', 'semester 2', 'semester 3', 'semester 4', 'semester 5', 'semester 6', '2de bach', '3de bach', '1ste master', '2de master', 'varia', 'random']:
            continue
            
        for c in catalog['courses']:
            c_name_clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', c['name_nl']).lower().strip()
            if seg_clean == c_name_clean or (len(seg_clean) > 8 and seg_clean in c_name_clean):
                return c, "exact_name_match", c['code']

    return None, "unmatched", None


def main():
    print("=== Step 4: Deterministic Course & Category Classification ===")
    
    with open('migration_data/course_catalog.json', 'r', encoding='utf-8') as f:
        catalog = json.load(f)
        
    clean_manifest = []
    with open('migration_data/manifest_clean.jsonl', 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                clean_manifest.append(json.loads(line))
                
    print(f"Loaded {len(clean_manifest):,} clean records and {len(catalog['courses'])} courses.")
    
    classified = []
    ambiguous = []
    category_proposal_counts = {}
    
    for item in clean_manifest:
        path = item['path']
        filename = item['filename']
        mtime = item.get('mtime', 0)
        repo_name = item['repo_name']
        
        # 1. Course Match
        course, match_type, matched_code = match_course(path, repo_name, catalog)
        
        # 2. Category & Proposal
        cat_info = detect_category(path, filename)
        cat_id = cat_info[0]
        cat_name_nl = cat_info[1]
        cat_name_en = cat_info[2]
        proposal = cat_info[3] if len(cat_info) > 3 else None
        
        if proposal:
            category_proposal_counts[proposal] = category_proposal_counts.get(proposal, 0) + 1
            
        # 3. Year
        year = extract_year(filename, path, mtime)
        
        # 4. Title & Tags
        title = clean_title(filename)
        tags = extract_tags(filename, path)
        
        entry = {
            **item,
            'title': title,
            'year': year,
            'category_id': cat_id,
            'category_name_nl': cat_name_nl,
            'category_name_en': cat_name_en,
            'category_proposal': proposal,
            'tags': tags,
        }
        
        if course:
            entry['course_id'] = course['id']
            entry['course_code'] = course['code']
            entry['course_name'] = course['name']
            entry['match_type'] = match_type
            classified.append(entry)
        else:
            ambiguous.append(entry)
            
    match_rate = len(classified) / len(clean_manifest) * 100
    print(f"\n=== Classification Results ===")
    print(f"Total files processed:        {len(clean_manifest):,}")
    print(f"Deterministically Classified: {len(classified):,} ({match_rate:.1f}%)")
    print(f"Ambiguous / Unmatched Files:  {len(ambiguous):,} ({100 - match_rate:.1f}%)")
    
    print("\nCategory Distribution:")
    cat_counts = {}
    for c in classified:
        cat_counts[c['category_name_nl']] = cat_counts.get(c['category_name_nl'], 0) + 1
    for cat_name, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"  - {cat_name}: {count:,} files")
        
    print("\nCategory Taxonomy Proposals:")
    for prop, count in sorted(category_proposal_counts.items(), key=lambda x: -x[1]):
        print(f"  - {prop}: {count:,} candidate files")

    # Save outputs
    with open('migration_data/classified_deterministic.jsonl', 'w', encoding='utf-8') as f:
        for c in classified:
            f.write(json.dumps(c, ensure_ascii=False) + '\n')
            
    with open('migration_data/ambiguous_folders.json', 'w', encoding='utf-8') as f:
        # Group ambiguous files by distinct folder
        amb_folders = {}
        for a in ambiguous:
            folder = os.path.dirname(a['path'])
            key = f"{a['repo_name']}::{folder}"
            if key not in amb_folders:
                amb_folders[key] = {
                    'repo_name': a['repo_name'],
                    'folder': folder,
                    'file_count': 0,
                    'sample_files': [],
                    'total_size_bytes': 0
                }
            amb_folders[key]['file_count'] += 1
            amb_folders[key]['total_size_bytes'] += a['size_bytes']
            if len(amb_folders[key]['sample_files']) < 5:
                amb_folders[key]['sample_files'].append(a['filename'])
                
        json.dump(list(amb_folders.values()), f, indent=2, ensure_ascii=False)
        print(f"\nAmbiguous files grouped into {len(amb_folders)} distinct folders for Step 5 AI resolution.")
        
    print("\n=== Step 4 Complete ===")


if __name__ == '__main__':
    main()
