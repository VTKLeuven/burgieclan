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

# Load the tag vocabulary. This file is the single source of truth: the literal tag
# names, the aliases that map legacy/regex-era names onto them, and the per-category
# redundancy rules all live there, not in this module.
VOCAB_FILE = "migration_data/tag_vocabulary.json"
ALLOWED_TAGS = set()
TAG_PATTERNS = []
TAG_ALIASES = {}
REDUNDANT_IN_CATEGORY = {}

if os.path.exists(VOCAB_FILE):
    with open(VOCAB_FILE, "r", encoding="utf-8") as f:
        v_data = json.load(f)

    for tags in v_data.get("groups", {}).values():
        ALLOWED_TAGS.update(tags)

    for spec in v_data.get("patterns", {}).values():
        TAG_PATTERNS.append(re.compile(spec["regex"]))

    TAG_ALIASES = dict(v_data.get("aliases", {}))
    REDUNDANT_IN_CATEGORY = {
        int(cat_id): set(tags)
        for cat_id, tags in v_data.get("redundant_in_category", {}).items()
    }


def canonicalize_tag(tag):
    """
    Maps a raw tag onto its canonical vocabulary name, or None if it is not in the
    vocabulary at all.

    Aliases are resolved BEFORE the vocabulary check, so a rename in
    tag_vocabulary.json never silently discards tags already written by an earlier
    pipeline stage - it migrates them.
    """
    t = " ".join(str(tag).strip().split())
    if not t:
        return None

    t = TAG_ALIASES.get(t, t)

    if t in ALLOWED_TAGS:
        return t
    if any(p.match(t) for p in TAG_PATTERNS):
        return t
    return None

CURRENT_MAX_YEAR = 2025

def sanitize_dedup_suffixes(text):
    """Strips duplicate markers like (1), (2), _copy, etc."""
    text = re.sub(r'\s*\(\d+\)\s*$', '', text)
    text = re.sub(r'_\(\d+\)$', '', text)
    text = re.sub(r'_copy\d*$', '', text, flags=re.IGNORECASE)
    return text.strip()

P_VANAF_FULL = re.compile(r'\b(?:vanaf|sinds|from|post[-_]?)\s*(\d{4})\s*[-_/]\s*(\d{2,4})\b', re.IGNORECASE)
P_VANAF_SINGLE = re.compile(r'\b(?:vanaf|sinds|from|post[-_]?)\s*(\d{4})\b', re.IGNORECASE)
P_TOT_FULL = re.compile(r'\b(?:tot|tot\s*en\s*met|t/m|until|through)\s*(\d{4})\s*[-_/]\s*(\d{2,4})\b', re.IGNORECASE)
P_TOT_SINGLE = re.compile(r'\b(?:tot|tot\s*en\s*met|t/m|until|through)\s*(\d{4})\b', re.IGNORECASE)
P_VOOR_FULL = re.compile(r'\b(?:voor|pre[-_]?|before)\s*(\d{4})\s*[-_/]\s*(\d{2,4})\b', re.IGNORECASE)
P_VOOR_SINGLE = re.compile(r'\b(?:voor|pre[-_]?|before)\s*(\d{4})\b', re.IGNORECASE)


CURRICULUM_ERA_MAP = {
    'analyse (met boek pearson)': '2008 - 2009',
}


def extract_boundary_year(text):
    """Extracts boundary academic year from phrases like 'vanaf 2018-2019', 'pre 2018', 'tot 2017'."""
    text_lower = text.lower()
    
    # Check curriculum era mappings (excluding timeless book solution manuals)
    for era_key, era_year in CURRICULUM_ERA_MAP.items():
        if era_key in text_lower and 'oplossingen boek' not in text_lower:
            return era_year
            
    m = P_VANAF_FULL.search(text)
    if m:
        y1 = int(m.group(1))
        return f"{y1} - {y1+1}"
    m = P_VANAF_SINGLE.search(text)
    if m:
        y1 = int(m.group(1))
        return f"{y1} - {y1+1}"
    m = P_TOT_FULL.search(text)
    if m:
        y1 = int(m.group(1))
        return f"{y1} - {y1+1}"
    m = P_VOOR_FULL.search(text)
    if m:
        y1 = int(m.group(1))
        return f"{y1-1} - {y1}"
    m = P_VOOR_SINGLE.search(text)
    if m:
        y1 = int(m.group(1))
        return f"{y1-1} - {y1}"
    return None


def verify_academic_year(year_candidate, record):
    """
    Mechanically verifies that year_candidate matches 'YYYY - YYYY',
    satisfies y2 == y1 + 1 and y1 <= CURRENT_MAX_YEAR,
    and actually appears in the input filename, path, or page preview text.
    Fallback: extracts boundary years from folder paths (e.g. 'pre 2018' -> '2017 - 2018').
    """
    input_text = f"{record.get('path', '')} {record.get('filename', '')} {record.get('content_preview', {}).get('page1_text', '')} {record.get('content_preview', {}).get('fallback_text', '')}"

    if not year_candidate:
        return extract_boundary_year(input_text)
        
    year_match = re.match(r'^(\d{4})\s*-\s*(\d{4})$', str(year_candidate).strip())
    if not year_match:
        return extract_boundary_year(input_text)
        
    y1, y2 = int(year_match.group(1)), int(year_match.group(2))
    if y2 != y1 + 1 or y1 > CURRENT_MAX_YEAR or y1 < 1980:
        return extract_boundary_year(input_text)
        
    y1_str = str(y1)
    y2_str = str(y2)
    y1_short = str(y1)[2:]
    y2_short = str(y2)[2:]
    
    # Matches "2018", "2019", "2018-2019", "18-19", "18_19", "2018_2019", "pre 2019", "voor 2019"
    patterns = [
        rf'\b{y1_str}\b',
        rf'\b{y2_str}\b',
        rf'\b{y1_short}[-_/]{y2_short}\b',
        rf'\b{y1_str}[-_/]{y2_short}\b',
        rf'\b{y1_str}[-_/]{y2}\b',
        rf'\b(?:pre|voor)\s*{y2_str}\b',
        rf'\b(?:tot)\s*{y1_str}\b',
        rf'\b(?:vanaf)\s*{y1_str}\b'
    ]
    
    if any(re.search(p, input_text, re.IGNORECASE) for p in patterns):
        return f"{y1} - {y2}"
        
    return extract_boundary_year(input_text)

HANDWRITING_EVIDENCE = re.compile(
    r'\b(handgeschreven|handwritten|manueel|hand-geschreven|eigen\s+notities|eigen\s+nota)\b',
    re.IGNORECASE,
)


def has_handwriting_evidence(record):
    """
    True only when something positively indicates genuine student handwriting.
    Excludes exam open-book instructions mentioning 'zelfgeschreven nota's'.
    """
    fn_path = f"{record.get('path', '')} {record.get('filename', '')}"
    if HANDWRITING_EVIDENCE.search(fn_path):
        return True
        
    preview = record.get('content_preview') or {}
    p1 = preview.get('page1_text', '')
    if HANDWRITING_EVIDENCE.search(p1):
        # Guard against open-book exam instructions mentioning 'open boek: ... zelfgeschreven nota's'
        if 'open boek' in p1.lower() or 'rekenmachine' in p1.lower() or 'examen duurt' in p1.lower():
            return False
        return True
        
    return False


# Parenthesised tokens that look like an author slot but are not names. Filenames use
# "(...)" for both credit ("(Kato Kenis)") and status ("NPV Table (Empty).pdf"), so the
# status words have to be rejected explicitly.
NON_AUTHOR_TOKENS = {
    'empty', 'leeg', 'blanco', 'blank', 'oplossing', 'oplossingen', 'opgave',
    'opgaven', 'solution', 'solutions', 'antwoorden', 'vragen', 'questions',
    'theorie', 'theory', 'copy', 'kopie', 'final', 'nieuw', 'new', 'oud', 'old',
    'herexamen', 'examen', 'exam', 'deel', 'part', 'nl', 'en', 'eng', 'engels',
    'english', 'dutch', 'scan', 'handgeschreven', 'slides', 'code', 'script',
    'onbekend', 'unknown', 'student', 'anoniem', 'anonymous', 'praktisch',
    'samenvatting', 'formularium', 'verslag', 'notities',
}


def is_plausible_author(name):
    """Rejects status markers and vocabulary words that occupy the author slot."""
    n = " ".join(str(name).strip().split())
    if len(n) <= 2:
        return False
    if n.lower() in NON_AUTHOR_TOKENS:
        return False
    # "Oplossing Caro" style: a status word glued to a name contributes no reliable
    # attribution, so drop the whole candidate rather than guess where it splits.
    if any(part.lower() in NON_AUTHOR_TOKENS for part in n.split()):
        return False
    if not any(ch.isalpha() for ch in n):
        return False
    return True


JUNK_EXTENSIONS = {'ini', 'lnk', 'download', 'exe', 'dll', 'bak', 'orig', 'cpgz'}

def is_junk_artifact(record):
    """Detects useless OS artifacts, partial downloads, and shortcuts."""
    ext = record.get('extension', '').lower()
    fn = record.get('filename', '').lower()
    if ext in JUNK_EXTENSIONS:
        return True
    if 'thumbs' in fn and ext == 'db':
        return True
    if fn.startswith('.') or fn in {'thumbs.db', 'desktop.ini', '.ds_store'}:
        return True
    return False

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
    E.g. /Oefeningen/R0deel1/001.jpg -> "Oefeningen - R0 Deel 1 (p. 1/10)"
    """
    image_exts = {'jpg', 'jpeg', 'png', 'heic', 'bmp'}
    folder_images = defaultdict(list)
    
    for r in records:
        ext = r.get('extension', '').lower()
        if ext in image_exts:
            # Keyed by repo + course as well as folder: the same folder path can
            # legitimately exist in two repositories, and a sequence must never be
            # numbered across a course boundary.
            parent = (
                r.get('repo_name', ''),
                r.get('course_id'),
                os.path.dirname(r.get('path', '')),
            )
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
            
            # Derive human-readable title incorporating parent folder context
            folder_path = parent[2].strip('/')
            path_parts = folder_path.split('/')
            
            if len(path_parts) >= 2:
                gp = path_parts[-2]
                p = path_parts[-1]
                gp_clean = re.sub(r'[_.\-]+', ' ', gp).strip()
                p_clean = re.sub(r'[_.\-]+', ' ', p).strip()
                p_clean = re.sub(r'deel\s*(\d+)', r'Deel \1', p_clean, flags=re.IGNORECASE)
                
                if gp_clean.lower() in {'examens', 'oefeningen', 'theorie', 'samenvattingen', 'slides', 'labo', 'midterms', 'ttt'}:
                    clean_folder_title = f"{gp_clean} - {p_clean}"
                else:
                    clean_folder_title = p_clean
            else:
                raw_name = os.path.basename(parent[2]) or "Document"
                clean_folder_title = re.sub(r'[_.\-]+', ' ', raw_name).strip()
            
            clean_folder_title = " ".join(clean_folder_title.split())
            
            for idx, img_rec in enumerate(sorted_imgs, start=1):
                img_rec['_photo_sequence_title'] = f"{clean_folder_title} (p. {idx}/{total})"
                img_rec['category_id'] = img_rec.get('category_id', 4) # Default exercises/notes
                # An image sequence is by definition a Scan (medium). It is only
                # Handgeschreven (content) if something actually says so - most of
                # these folders are photographed printed exams, not notes.
                tags = img_rec.get('tags', [])
                if 'Scan' not in tags:
                    tags.append('Scan')
                if has_handwriting_evidence(img_rec) and 'Handgeschreven' not in tags:
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
            author_str = " ".join(str(author).strip().split())
            institutional = ['prof', 'dr.', 'studie', 'groep', 'admin', 'vtk', 'take home']
            if is_plausible_author(author_str) and not any(k in author_str.lower() for k in institutional):
                merged['author'] = author_str
            else:
                merged['author'] = None
        else:
            merged['author'] = None
            
    # 5. Tag validation & non-redundancy
    raw_tags = ai_output.get('tags') or orig_record.get('tags') or []
    valid_tags = []
    cat_id = merged['category_id']
    
    redundant_here = REDUNDANT_IN_CATEGORY.get(cat_id, set())

    for t in raw_tags:
        # Aliases first, so legacy names are migrated rather than dropped.
        t_clean = canonicalize_tag(t)
        if t_clean is None:
            continue
        # A tag that only restates this category carries no information here, but may
        # still be informative in another category - hence the per-category check
        # rather than removing it from the vocabulary.
        if t_clean in redundant_here:
            continue
        if t_clean not in valid_tags:
            valid_tags.append(t_clean)

    # Legacy 'Handgeschreven / Scan' aliases to 'Scan' (the only part of it the
    # detector actually established). Re-add the handwriting claim where there is
    # independent evidence for it, so genuinely handwritten notes keep the tag.
    if has_handwriting_evidence(orig_record) and 'Handgeschreven' not in valid_tags:
        valid_tags.append('Handgeschreven')

    # Ensure every migrated document receives the provenance tag
    if 'old-burgieclan' not in valid_tags:
        valid_tags.append('old-burgieclan')

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
            # Deliberately NOT "(Deel N)": 'Deel' denotes a genuine numbered part of a
            # document (and is a tag in its own right), so reusing it as a collision
            # counter would invent parts that do not exist. A bare index reads as what
            # it is - an arbitrary tie-break - and leaves the first document untouched.
            if idx > 1:
                r['display_title'] = f"{t} ({idx})"
            
def run_pipeline(records, ai_by_file_id=None):
    """
    Runs the full validation pipeline over `records`.

    `ai_by_file_id` maps file_id -> the LLM's object for that file. Any record with
    no entry is merged against an empty dict, which exercises the deterministic
    fallback: the record keeps its regex-era title, category and tags, validated.

    Returns (output_records, stats).
    """
    ai_by_file_id = ai_by_file_id or {}
    stats = Counter()

    kept = [r for r in records if not is_meme_or_varia(r) and not is_junk_artifact(r)]
    stats['input'] = len(records)
    stats['filtered_meme_varia'] = len(records) - len(kept)

    resolve_photo_sequences(kept)
    stats['photo_sequenced'] = sum(1 for r in kept if '_photo_sequence_title' in r)

    merged = []
    for r in kept:
        ai_out = ai_by_file_id.get(r.get('file_id'), {})
        if ai_out:
            stats['ai_covered'] += 1
        else:
            stats['ai_fallback'] += 1
        merged.append(validate_and_merge_record(ai_out, r))

    by_course = defaultdict(list)
    for r in merged:
        by_course[r.get('course_id')].append(r)

    for course_records in by_course.values():
        before = Counter(r['display_title'] for r in course_records)
        stats['collisions_resolved'] += sum(n - 1 for n in before.values() if n > 1)
        resolve_course_collisions(course_records)

    for r in merged:
        r.pop('_photo_sequence_title', None)
        stats['year_set'] += 1 if r.get('year') else 0
        stats['author_set'] += 1 if r.get('author') else 0
        stats['tags_total'] += len(r.get('tags') or [])

    stats['courses'] = len(by_course)
    stats['output'] = len(merged)
    return merged, stats


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Merge and validate AI normalizer output.")
    parser.add_argument(
        "--input",
        default="migration_data/pilot_5_courses_input.json",
        help="Staged manifest to validate (JSON array).",
    )
    parser.add_argument(
        "--ai-output",
        default=None,
        help="LLM output (JSON array of objects with file_id). Omit to run the "
             "deterministic fallback path only.",
    )
    parser.add_argument(
        "--output",
        default="migration_data/pilot_5_courses_validated.json",
        help="Where to write the validated manifest.",
    )
    args = parser.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        records = json.load(f)
    if isinstance(records, dict) and "documents" in records:
        records = records["documents"]

    ai_by_file_id = {}
    if args.ai_output:
        with open(args.ai_output, "r", encoding="utf-8") as f:
            for obj in json.load(f):
                if obj.get("file_id"):
                    ai_by_file_id[obj["file_id"]] = obj

    merged, stats = run_pipeline(records, ai_by_file_id)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    print(f"input records            {stats['input']}")
    print(f"  filtered (meme/varia)  {stats['filtered_meme_varia']}")
    print(f"  photo-sequenced        {stats['photo_sequenced']}")
    print(f"  LLM-covered            {stats['ai_covered']}")
    print(f"  deterministic fallback {stats['ai_fallback']}")
    print(f"collisions resolved      {stats['collisions_resolved']}")
    print(f"years set                {stats['year_set']}")
    print(f"authors set              {stats['author_set']}")
    print(f"tag assignments          {stats['tags_total']}")
    print(f"courses                  {stats['courses']}")
    print(f"written to {args.output} ({stats['output']} records)")


if __name__ == '__main__':
    main()
