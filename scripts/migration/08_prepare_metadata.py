#!/usr/bin/env python3
"""
08_prepare_metadata.py
Enriches the final migration manifest with accurate academic years, rich non-redundant tags,
student authors, clean display titles, and verified category mapping.
"""

import json
import os
import re
from datetime import datetime
from collections import Counter, defaultdict
import csv

# Regex for academic year ranges: 2023-2024, 2023_2024, 2023/2024, 2023 - 2024
YEAR_RANGE_4DIGIT = re.compile(r'\b(19\d\d|20\d\d)\s*[-_/]\s*(19\d\d|20\d\d)\b')
# Short year ranges: 23-24, '23-'24, 23_24
YEAR_RANGE_2DIGIT = re.compile(r'(?<!\d)(?:\'?([0-2]\d))\s*[-_/]\s*(?:\'?([0-2]\d))(?!\d)')
# Single year with date: 2021-06-15, 2021_01_24, 15-06-2021
DATE_ISO_REGEX = re.compile(r'\b(19\d\d|20\d\d)[-_](\d{1,2})[-_](\d{1,2})\b')
DATE_EU_REGEX = re.compile(r'\b(\d{1,2})[-_](\d{1,2})[-_](19\d\d|20\d\d)\b')
# Standalone 4-digit year: 1990 - 2026
STANDALONE_YEAR = re.compile(r'(?<!\d)(19[89]\d|20[0-2]\d)(?!\d)')

# Author extraction regexes
AUTHOR_PATTERNS = [
    # (Firstname Lastname) or (Firstname Van/De/Der Lastname)
    re.compile(r'\(([A-Z][a-z]+(?:\s+(?:de\s+|van\s+|van\s+der\s+|van\s+de\s+|le\s+|d\'\s+)?[A-Z][a-z]+)?)\)'),
    # (ALLCAPS NAME) e.g. (STUDENT 063), (STUDENT 116)
    re.compile(r'\(([A-Z]{2,}(?:\s+(?:DE\s+|VAN\s+|VAN\s+DER\s+|VAN\s+DE\s+)?[A-Z]{2,})+)\)'),
    # by Firstname Lastname or door Firstname Lastname
    re.compile(r'\b(?:by|door|auteur)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b', re.IGNORECASE),
    # NN_Firstname Lastname.pdf (e.g. 29_Daan Van Cauteren.pdf)
    re.compile(r'^\d+[\s_-]+([A-Z][a-z]+\s+[A-Z][a-z]+)'),
]

STOP_WORDS_AUTHOR = {
    'oplossing', 'opgaven', 'opgave', 'deel 1', 'deel 2', 'deel 3', 'deel i', 'deel ii',
    'examen', 'theorie', 'oefeningen', 'summary', 'slides', 'notities', 'extra', 'blanco',
    'antwoorden', 'verslag', 'project', 'paper', 'reconstructie', 'questions', 'vragen',
    'ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06', 'ch07', 'ch08', 'ch09', 'ch10',
    'exam', 'exams', 'pdf', 'docx', 'januari', 'juni', 'augustus', 'september', 'modeloplossing',
    'formularium', 'cheatsheet', 'theorievragen', 'oefening', 'oplossingen', 'samenvatting',
    'vrijstelling', 'mondeling', 'schriftelijk', 'herkansing', 'midterm', 'tussentijds',
    'old professor', 'prof', 'assistent', 'all', 'elektrotechniek', 'dutch', 'english',
    'legacy', 'wiki', 'materiaalkunde', 'bouwkunde', 'werktuigkunde', 'chemie', 'fysica',
    'wiskunde', 'analyse', 'algebra', 'mechanica', 'thermodynamica', 'bestanden', 'map'
}

def parse_embedded_compact_date(filename):
    """Parses dates formatted like 190617 (YYMMDD), 20150813 (YYYYMMDD), 121129 (YYMMDD)."""
    tokens = re.split(r'[^a-zA-Z0-9]', filename)
    for t in tokens:
        m = re.match(r'^(19[9]\d|20[0-2]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$', t)
        if m:
            y, month = int(m.group(1)), int(m.group(2))
            return y, month, "token_yyyymmdd"
        m = re.match(r'^([0-2]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$', t)
        if m:
            y, month = int(m.group(1)) + 2000, int(m.group(2))
            return y, month, "token_yymmdd"

    m = re.search(r'(?:^|[^0-9])([0-2]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?=[a-zA-Z_])', filename)
    if m:
        y, month = int(m.group(1)) + 2000, int(m.group(2))
        return y, month, "prefix_yymmdd"

    return None


def extract_academic_year(filename, path, mtime):
    """Extracts academic year in 'YYYY - YYYY' format."""
    m = YEAR_RANGE_4DIGIT.search(filename)
    if m:
        y1, y2 = int(m.group(1)), int(m.group(2))
        if y2 == y1 + 1:
            return f"{y1} - {y2}", "high", "filename_range_4digit"
        if y1 == y2:
            return f"{y1} - {y1+1}", "medium", "filename_range_identical"

    m = YEAR_RANGE_4DIGIT.search(path)
    if m:
        y1, y2 = int(m.group(1)), int(m.group(2))
        if y2 == y1 + 1:
            return f"{y1} - {y2}", "high", "path_range_4digit"

    m = DATE_ISO_REGEX.search(filename)
    if m:
        y, month = int(m.group(1)), int(m.group(2))
        if 1990 <= y <= 2026 and 1 <= month <= 12:
            return (f"{y} - {y+1}" if month >= 9 else f"{y-1} - {y}"), "high", "filename_iso_date"

    m = DATE_EU_REGEX.search(filename)
    if m:
        month, y = int(m.group(2)), int(m.group(3))
        if 1990 <= y <= 2026 and 1 <= month <= 12:
            return (f"{y} - {y+1}" if month >= 9 else f"{y-1} - {y}"), "high", "filename_eu_date"

    compact_date = parse_embedded_compact_date(filename)
    if compact_date:
        y, month, src = compact_date
        if 1990 <= y <= 2026:
            return (f"{y} - {y+1}" if month >= 9 else f"{y-1} - {y}"), "high", f"filename_{src}"

    m = YEAR_RANGE_2DIGIT.search(filename)
    if m:
        y1 = int(m.group(1)) + (2000 if int(m.group(1)) < 50 else 1900)
        y2 = int(m.group(2)) + (2000 if int(m.group(2)) < 50 else 1900)
        if y2 == y1 + 1:
            return f"{y1} - {y2}", "high", "filename_range_2digit"

    m = YEAR_RANGE_2DIGIT.search(path)
    if m:
        y1 = int(m.group(1)) + (2000 if int(m.group(1)) < 50 else 1900)
        y2 = int(m.group(2)) + (2000 if int(m.group(2)) < 50 else 1900)
        if y2 == y1 + 1:
            return f"{y1} - {y2}", "medium", "path_range_2digit"

    m = STANDALONE_YEAR.search(filename)
    if m:
        y = int(m.group(1))
        if 1990 <= y <= 2026:
            f_lower = filename.lower()
            if any(k in f_lower for k in ['jan', 'feb', 'jun', '1e zit', '1ste zit', 'eerste zit', '2e zit', '2de zit', 'tweede zit', 'herkansing', 'aug', 'sep']):
                return f"{y-1} - {y}", "high", "filename_year_with_session"
            elif any(k in f_lower for k in ['okt', 'nov', 'dec', 'najaar', 'fall']):
                return f"{y} - {y+1}", "medium", "filename_year_fall"
            else:
                return f"{y-1} - {y}", "medium", "filename_single_year"

    m = STANDALONE_YEAR.search(path)
    if m:
        y = int(m.group(1))
        if 1990 <= y <= 2026:
            return f"{y-1} - {y}", "low", "path_single_year"

    if mtime and mtime > 0:
        dt = datetime.fromtimestamp(mtime)
        y, month = dt.year, dt.month
        if 1995 <= y <= 2025:
            return (f"{y} - {y+1}" if month >= 9 else f"{y-1} - {y}"), "fallback", "mtime"

    return "2024 - 2025", "default", "default"


def detect_refined_category(path, filename, ext):
    """Assigns category: 2: Examens, 3: Samenvattingen, 4: Oefenzittingen, 5: TTT's."""
    full_str = f"{path}/{filename}".lower()
    ext = ext.lower() if ext else os.path.splitext(filename)[1].lstrip('.').lower()

    if any(k in full_str for k in ['/ttt/', '/ttt', 'ttt_', 'ttt-', 'tussentijdse toets', 'proefexamen', 'midterm']):
        return 5, "TTT's", "TTT's"

    if any(k in full_str for k in ['/examen', '/examens', 'examen ', 'examen_', 'examen-', 'examens', 'tentamen', 'herkansing', '/exam/', '/exams/', '/exam ', '/exams ', 'exam_', 'exams_', 'examenvragen']) or re.search(r'\b(exam|exams|examen|examens|tentamen|herkansing|examenvragen)\b', full_str):
        return 2, "Examens", "Exams"

    if any(k in full_str for k in ['/solutions', 'solutions/', '/oplossingen', 'oplossing', 'oefenzitting', 'oefeningen', 'werkcollege', 'exercises', 'problem', 'practicum', 'homework', 'assignment', 'taak', 'taken', 'labo', 'lab ', 'matlab', 'verslag', 'rapport', 'project', 'p&o']) or re.search(r'\b(solution|solutions|oplossing|oplossingen|oefening|oefeningen|exercise|exercises|werkcollege|practicum|labo|project|p&o|verslag)\b', full_str) or ext in ['m', 'hs', 'pl', 'py', 'c', 'cpp', 'java', 'r', 'mat', 'class']:
        return 4, "Oefenzittingen", "Exercise Sessions"

    return 3, "Samenvattingen", "Summaries"


def extract_creator(filename, path):
    """Extracts real student creator name from filename/path."""
    for pat in AUTHOR_PATTERNS:
        for m in pat.findall(filename):
            clean_m = m.strip().title()
            if clean_m.lower() not in STOP_WORDS_AUTHOR and len(clean_m) > 2 and not clean_m.isdigit():
                return clean_m
    for pat in AUTHOR_PATTERNS:
        for m in pat.findall(path):
            clean_m = m.strip().title()
            if clean_m.lower() not in STOP_WORDS_AUTHOR and len(clean_m) > 2 and not clean_m.isdigit():
                return clean_m
    return None


def extract_orthogonal_tags(filename, path, ext, cat_name):
    """Extracts non-redundant, orthogonal tags per category."""
    tags = set()
    full_lower = f"{path} {filename}".lower()
    fname = filename.lower()
    
    # 1. Format / Medium (Orthogonal across all)
    if ext in ['jpg', 'jpeg', 'png'] or any(k in full_lower for k in ['scan', 'camscanner', 'foto', 'handgeschreven', 'geschreven', 'wp_201', 'img_201']):
        tags.add('Handgeschreven')
    if ext in ['m', 'py', 'c', 'cpp', 'java', 'hs', 'pl', 'r', 'mat', 'mw']:
        tags.add('Code / Script')
    if ext in ['ppt', 'pptx'] or any(k in full_lower for k in ['slides', 'transparanten', 'presentatie', 'powerpoint']):
        tags.add('Slides')

    # 2. Solution Status
    has_sol = bool(re.search(r'\b(oplossing|oplossingen|solution|solutions|antwoorden|answers|solved|uitgewerkt|opl)\b', full_lower))
    has_opg = bool(re.search(r'\b(opgave|opgaven|blanco|vragen|questions|zonder oplossing)\b', full_lower))
    if re.search(r'\b(modeloplossing|modeloplossingen|modelopl)\b', full_lower):
        tags.add('Modeloplossing')
    elif has_sol:
        tags.add('Oplossing')
    elif has_opg:
        tags.add('Opgave (Blanco)')

    # 3. Category Specifics
    if cat_name == 'Examens':
        if re.search(r'\b(januari|january)\b', full_lower) or re.search(r'[-_ ]jan[-_ .]', fname):
            tags.add('Januari')
        if re.search(r'\b(juni|june)\b', full_lower) or re.search(r'[-_ ]jun[-_ .]', fname):
            tags.add('Juni')
        if re.search(r'\b(augustus|august|september|2e zit|2de zit|tweede zit|herkansing|resit)\b', full_lower) or re.search(r'[-_ ](aug|sep)[-_ .]', fname):
            tags.add('Augustus / September (2de zit)')
        if re.search(r'\b(theorie|theory)\b', full_lower):
            tags.add('Theorie')
        if re.search(r'\b(oefening|oefeningen|exercises|oef)\b', full_lower):
            tags.add('Oefeningen (Examen)')
        if re.search(r'\b(examenvragen|reconstructie|voorbeeldvragen)\b', full_lower):
            tags.add('Reconstructie / Vragen')
        if re.search(r'\b(meerkeuze|multiple choice)\b', full_lower):
            tags.add('Meerkeuze')
        if re.search(r'\b(mondeling|oral)\b', full_lower):
            tags.add('Mondeling')

    elif cat_name == 'Samenvattingen':
        if re.search(r'\b(formularium|formuleblad|formules|cheatsheet)\b', full_lower):
            tags.add('Formularium')
        if re.search(r'\b(notities|lesnotities|class notes|lecture notes|aantekeningen|bordnotities)\b', full_lower):
            tags.add('Lesnotities')
        if re.search(r'\b(theorie|theory)\b', full_lower):
            tags.add('Theorie')

    elif cat_name == 'Oefenzittingen':
        if re.search(r'\b(verslag|verslagen|rapport|rapporten|project|projecten|p&o|paper)\b', full_lower):
            tags.add('Verslag / Project')
        if re.search(r'\b(theorie|theory)\b', full_lower):
            tags.add('Theorie')

    # 4. Scope divisions
    if re.search(r'\b(deel\s*1|part\s*1|sem\s*1|semester\s*1)\b', full_lower):
        tags.add('Deel 1')
    if re.search(r'\b(deel\s*2|part\s*2|sem\s*2|semester\s*2)\b', full_lower):
        tags.add('Deel 2')
    if re.search(r'\b(deel\s*3|part\s*3)\b', full_lower):
        tags.add('Deel 3')

    return sorted(list(tags))


def clean_display_title(filename, course_code, course_name, author):
    """Cleans filename into a beautiful title and preserves author in parentheses."""
    base = os.path.splitext(filename)[0]
    
    if course_code:
        base = re.sub(rf'\b{re.escape(course_code)}\b', '', base, flags=re.IGNORECASE)
        base = re.sub(rf'\bB-KUL-{re.escape(course_code)}\b', '', base, flags=re.IGNORECASE)

    # Clean punctuation
    cleaned = re.sub(r'[_.\-]+', ' ', base)
    cleaned = re.sub(r'\(\s*\)', '', cleaned)
    cleaned = re.sub(r'\[\s*\]', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    if not cleaned:
        cleaned = course_name or "Document"
        
    words = cleaned.split()
    formatted = []
    for w in words:
        if w.isupper() and len(w) <= 4:
            formatted.append(w)
        else:
            formatted.append(w.capitalize())
            
    title = ' '.join(formatted)
    
    # If author is detected and not already in title, append (Author)
    if author and author.lower() not in title.lower():
        title = f"{title} ({author})"
        
    return title


def main():
    print("=== Step 8.1: Production Metadata, Year, Tag & Author Enrichment ===")
    
    manifest_in = 'migration_data/manifest_classified_final.jsonl'
    manifest_out = 'migration_data/manifest_prepared_for_import.json'
    manifest_out_jsonl = 'migration_data/manifest_prepared_for_import.jsonl'
    
    records = []
    years_counter = Counter()
    confidence_counter = Counter()
    tags_counter = Counter()
    categories_counter = Counter()
    courses_counter = Counter()
    authors_counter = Counter()
    
    with open(manifest_in, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            rec = json.loads(line)
            
            # 1. Year Extraction
            year_val, confidence, source = extract_academic_year(
                rec.get('filename', ''),
                rec.get('path', ''),
                rec.get('mtime', 0)
            )
            rec['year'] = year_val
            rec['year_confidence'] = confidence
            rec['year_source'] = source
            
            # 2. Refined Category
            cat_id, cat_nl, cat_en = detect_refined_category(
                rec.get('path', ''),
                rec.get('filename', ''),
                rec.get('extension', '')
            )
            rec['category_id'] = cat_id
            rec['category_name_nl'] = cat_nl
            rec['category_name_en'] = cat_en
            
            # 3. Creator Extraction
            author = extract_creator(rec.get('filename', ''), rec.get('path', ''))
            rec['author'] = author
            if author:
                authors_counter[author] += 1
            
            # 4. Orthogonal Tags Extraction
            tags = extract_orthogonal_tags(rec.get('filename', ''), rec.get('path', ''), rec.get('extension', ''), cat_nl)
            rec['tags'] = tags
            
            # 5. Clean Display Title
            clean_title = clean_display_title(
                rec.get('filename', ''),
                rec.get('course_code', ''),
                rec.get('course_name', ''),
                author
            )
            rec['display_title'] = clean_title
            
            records.append(rec)
            
            years_counter[year_val] += 1
            confidence_counter[confidence] += 1
            for t in tags:
                tags_counter[t] += 1
            categories_counter[cat_nl] += 1
            courses_counter[rec.get('course_code', 'Unknown')] += 1

    print(f"Writing {len(records):,} enriched records to {manifest_out}...")
    with open(manifest_out, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
        
    with open(manifest_out_jsonl, 'w', encoding='utf-8') as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')

    # Step 8.2: Generate Summary & Audit Inspection Files
    print("Generating audit and summary reports...")
    
    # 1. Years Summary
    years_summary = {
        "total_records": len(records),
        "confidence_breakdown": dict(confidence_counter),
        "year_distribution": dict(years_counter.most_common())
    }
    with open('migration_data/audit_years_summary.json', 'w', encoding='utf-8') as f:
        json.dump(years_summary, f, indent=2)

    # 2. Tags Summary
    tags_summary = {
        "total_unique_tags": len(tags_counter),
        "total_tagged_documents": sum(1 for r in records if r['tags']),
        "tag_coverage_percentage": round(sum(1 for r in records if r['tags']) / len(records) * 100, 2),
        "top_tags": dict(tags_counter.most_common())
    }
    with open('migration_data/audit_tags_summary.json', 'w', encoding='utf-8') as f:
        json.dump(tags_summary, f, indent=2)

    # 3. Authors Summary
    authors_summary = {
        "total_authors_identified": len(authors_counter),
        "total_authored_documents": sum(authors_counter.values()),
        "top_authors": dict(authors_counter.most_common(50))
    }
    with open('migration_data/audit_authors_summary.json', 'w', encoding='utf-8') as f:
        json.dump(authors_summary, f, indent=2)

    # 4. CSV Sample Inspection
    sample_items = []
    step = max(1, len(records) // 100)
    for i in range(0, len(records), step):
        if len(sample_items) < 100:
            r = records[i]
            sample_items.append({
                "course_code": r.get('course_code'),
                "course_name": r.get('course_name'),
                "category": r.get('category_name_nl'),
                "author": r.get('author') or "",
                "year": r.get('year'),
                "year_confidence": r.get('year_confidence'),
                "tags": ", ".join(r.get('tags', [])),
                "display_title": r.get('display_title'),
                "original_filename": r.get('filename')
            })

    with open('migration_data/audit_sample_inspection.csv', 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            "course_code", "course_name", "category", "author", "year", "year_confidence",
            "tags", "display_title", "original_filename"
        ])
        writer.writeheader()
        writer.writerows(sample_items)

    print("\n================================================================================")
    print("✓ Metadata Preparation Complete!")
    print(f"  - Total Documents: {len(records):,}")
    print(f"  - Unique Courses: {len(courses_counter):,}")
    print(f"  - Documents with Author: {sum(authors_counter.values()):,} across {len(authors_counter)} distinct creators")
    print(f"  - High/Medium Confidence Years: {confidence_counter['high'] + confidence_counter['medium']:,} ({(confidence_counter['high'] + confidence_counter['medium'])/len(records)*100:.1f}%)")
    print(f"  - Files with Non-Redundant Tags: {sum(1 for r in records if r['tags']):,} ({sum(1 for r in records if r['tags'])/len(records)*100:.1f}%)")
    print(f"  - Total Unique Tags: {len(tags_counter)}")
    print(f"  - Category Breakdown: {dict(categories_counter)}")
    print("================================================================================")

if __name__ == '__main__':
    main()
