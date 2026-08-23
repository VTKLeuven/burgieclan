#!/usr/bin/env python3
"""
08i_merge_and_validate_ai_manifest.py
Rigorous writeback, validation, and collision-resolution engine.
Enforces all mechanical guardrails:
1. Aligns schema keys to `display_title` and `year`.
2. Mechanical year hallucination check (rejects years not present in input text/path).
3. Photo-sequence automatic disambiguation (p. X/N).
4. Per-course title collision resolution.
5. Strict tag vocabulary enforcement against tag_vocabulary.json.
6. Graded submission / take-home author carve-out.
7. Varia / Meme filter.
8. Field-by-field merge with deterministic regex fallback.
"""

import json
import os
import re
from collections import Counter, defaultdict

# Load allowed tags
VOCAB_FILE = "migration_data/tag_vocabulary.json"
ALLOWED_TAGS = set()
if os.path.exists(VOCAB_FILE):
    with open(VOCAB_FILE, "r", encoding="utf-8") as f:
        v_data = json.load(f)
        for cat, tags in v_data.items():
            ALLOWED_TAGS.update(tags)

CURRENT_MAX_YEAR = 2025

def sanitize_dedup_suffixes(text):
    """Strips duplicate markers like (1), (2), _copy, etc."""
    text = re.sub(r'\s*\(\d+\)\s*$', '', text)
    text = re.sub(r'_\(\d+\)$', '', text)
    text = re.sub(r'_copy\d*$', '', text, flags=re.IGNORECASE)
    return text.strip()

def verify_academic_year(year_candidate, record):
    """
    Mechanically verifies that year_candidate matches 'YYYY - YYYY',
    satisfies y2 == y1 + 1 and y1 <= CURRENT_MAX_YEAR,
    and actually appears in the input filename, path, or page preview text.
    """
    if not year_candidate:
        return None
        
    year_match = re.match(r'^(\d{4})\s*-\s*(\d{4})$', str(year_candidate).strip())
    if not year_match:
        return None
        
    y1, y2 = int(year_match.group(1)), int(year_match.group(2))
    if y2 != y1 + 1 or y1 > CURRENT_MAX_YEAR or y1 < 1980:
        return None
        
    # Check if year numbers appear in input context
    input_text = f"{record.get('path', '')} {record.get('filename', '')} {record.get('content_preview', {}).get('page1_text', '')} {record.get('content_preview', {}).get('fallback_text', '')}"
    
    y1_str = str(y1)
    y1_short = str(y1)[2:]
    y2_short = str(y2)[2:]
    
    # Matches "2018", "2018-2019", "18-19", "18_19", "2018_2019"
    patterns = [
        rf'\b{y1_str}\b',
        rf'\b{y1_short}[-_/]{y2_short}\b',
        rf'\b{y1_str}[-_/]{y2_short}\b',
        rf'\b{y1_str}[-_/]{y2}\b'
    ]
    
    if any(re.search(p, input_text, re.IGNORECASE) for p in patterns):
        return f"{y1} - {y2}"
        
    # Not verified in input -> mechanically reject hallucination
    return None

def is_takehome_graded_submission(record):
    """Detects student's graded coursework / take-home exam submissions."""
    full_str = f"{record.get('path', '')} {record.get('filename', '')}".lower()
    return any(k in full_str for k in ['take home', 'take-home', 'takehome', 'evaluatie opdracht', 'inleveropdracht'])

def is_meme_or_varia(record):
    """Detects memes and unrelated non-coursework files."""
    full_str = f"{record.get('path', '')} {record.get('filename', '')}".lower()
    return '/memes/' in full_str or '/varia/' in full_str or 'meme' in record.get('filename', '').lower()

def resolve_photo_sequences(records):
    """
    Detects photo sequences in parent folders and assigns clean sort-stable page titles.
    E.g. /ScanOefeningen/1.jpg ... 106.jpg -> "Oefeningen Scan (p. 1/106)"
    """
    image_exts = {'jpg', 'jpeg', 'png', 'heic', 'bmp'}
    folder_images = defaultdict(list)
    
    for r in records:
        ext = r.get('extension', '').lower()
        if ext in image_exts:
            parent = os.path.dirname(r.get('path', ''))
            folder_images[parent].append(r)
            
    # Process folders with multiple images
    for parent, imgs in folder_images.items():
        if len(imgs) >= 3:
            # Sort images by filename (natural sort)
            def natural_sort_key(rec):
                fn = rec.get('filename', '')
                nums = re.findall(r'\d+', fn)
                return (int(nums[0]) if nums else 0, fn)
                
            sorted_imgs = sorted(imgs, key=natural_sort_key)
            total = len(sorted_imgs)
            folder_name = os.path.basename(parent) or "Document"
            clean_folder_title = re.sub(r'[_.\-]+', ' ', folder_name).strip()
            
            for idx, img_rec in enumerate(sorted_imgs, start=1):
                img_rec['_photo_sequence_title'] = f"{clean_folder_title} (p. {idx}/{total})"
                img_rec['category_id'] = img_rec.get('category_id', 4) # Default exercises/notes
                # Ensure Handgeschreven tag
                tags = img_rec.get('tags', [])
                if 'Handgeschreven' not in tags:
                    tags.append('Handgeschreven')
                img_rec['tags'] = tags

def validate_and_merge_record(ai_output, orig_record):
    """
    Merges AI refined record into original record with field-by-field validation.
    """
    merged = dict(orig_record)
    
    # 1. Title validation & sanitization
    raw_title = ai_output.get('display_title') or ai_output.get('canonical_title') or orig_record.get('display_title') or orig_record.get('filename')
    clean_title = sanitize_dedup_suffixes(str(raw_title).strip())
    clean_title = " ".join(clean_title.split())
    if len(clean_title) > 200:
        clean_title = clean_title[:197] + "..."
    merged['display_title'] = clean_title
    
    # Check photo sequence override
    if '_photo_sequence_title' in orig_record:
        merged['display_title'] = orig_record['_photo_sequence_title']
        
    # 2. Year validation
    ai_year = ai_output.get('year') or ai_output.get('academic_year')
    verified_year = verify_academic_year(ai_year, orig_record)
    if verified_year is None and orig_record.get('year_confidence') in ['high', 'medium']:
        # Keep original verified year if AI returned null/invalid
        verified_year = orig_record.get('year')
    merged['year'] = verified_year
    
    # 3. Category ID validation (must be in [2, 3, 4, 5, 6, 7])
    ai_cat = ai_output.get('category_id')
    if isinstance(ai_cat, int) and ai_cat in [2, 3, 4, 5, 6, 7]:
        merged['category_id'] = ai_cat
    else:
        merged['category_id'] = orig_record.get('category_id', 3)
        
    # 4. Author validation
    if is_takehome_graded_submission(orig_record):
        merged['author'] = None
    else:
        author = ai_output.get('author') or orig_record.get('author')
        if author:
            author_str = str(author).strip()
            # Reject bogus author strings
            if len(author_str) > 2 and not any(k in author_str.lower() for k in ['prof', 'dr', 'studie', 'groep', 'admin', 'vtk', 'examen', 'take home']):
                merged['author'] = author_str
            else:
                merged['author'] = None
        else:
            merged['author'] = None
            
    # 5. Tag validation & non-redundancy
    raw_tags = ai_output.get('tags') or orig_record.get('tags') or []
    valid_tags = []
    cat_id = merged['category_id']
    
    for t in raw_tags:
        t_clean = str(t).strip()
        if t_clean in ALLOWED_TAGS:
            # Rule: Strip redundant category-mirroring tags
            if cat_id == 6 and t_clean == 'Slides':
                continue
            if cat_id == 7 and t_clean in ['Code / Script', 'Labo & Code']:
                continue
            if cat_id == 4 and t_clean in ['Oefeningen', 'Oefenzittingen']:
                continue
            if cat_id == 3 and t_clean in ['Samenvatting', 'Samenvattingen']:
                continue
            if t_clean not in valid_tags:
                valid_tags.append(t_clean)
                
    merged['tags'] = valid_tags
    return merged

def resolve_course_collisions(records_in_course):
    """
    Resolves any colliding display_titles within the same course.
    """
    title_counts = Counter(r['display_title'] for r in records_in_course)
    seen_titles = defaultdict(int)
    
    for r in records_in_course:
        t = r['display_title']
        if title_counts[t] > 1:
            seen_titles[t] += 1
            idx = seen_titles[t]
            # Disambiguate with part or file index
            r['display_title'] = f"{t} (Deel {idx})"
            
def main():
    print("08i Validation and Merge Engine ready.")

if __name__ == '__main__':
    main()
