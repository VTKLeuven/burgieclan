#!/usr/bin/env python3
"""
scripts/migration/cluster_4_normalizer.py
High-intelligence normalizer for Cluster 4 (Computer Science & AI).
"""

import json
import os
import re
from collections import Counter, defaultdict

VOCAB_FILE = "migration_data/tag_vocabulary.json"

with open(VOCAB_FILE, "r", encoding="utf-8") as f:
    VOCAB_DATA = json.load(f)

ALLOWED_TAGS = set()
for tags in VOCAB_DATA.get("groups", {}).values():
    ALLOWED_TAGS.update(tags)

TAG_PATTERNS = [re.compile(spec["regex"]) for spec in VOCAB_DATA.get("patterns", {}).values()]
TAG_ALIASES = dict(VOCAB_DATA.get("aliases", {}))
REDUNDANT_IN_CATEGORY = {
    int(cat_id): set(tags)
    for cat_id, tags in VOCAB_DATA.get("redundant_in_category", {}).items()
}

KNOWN_PROFESSORS_AND_ORGS = {
    'bart preneel', 'preneel', 'vincent rijmen', 'rijmen', 'tim beyne', 'nigel smart', 'smart',
    'ilia iliashenko', 'danny weyns', 'weyns', 'luc de raedt', 'de raedt', 'maurice bruynooghe',
    'bruynooghe', 'bart demoen', 'demoen', 'gerda janssens', 'janssens', 'yolande berbers',
    'berbers', 'tom holvoet', 'holvoet', 'wouter joosen', 'joosen', 'frank piessens', 'piessens',
    'marie-francine moens', 'moens', 'hendrik blockeel', 'blockeel', 'jesse davis', 'davis',
    'tinne tuytelaars', 'tuytelaars', 'luc van gool', 'van gool', 'marc van barel', 'van barel',
    'raf vandebril', 'vandebril', 'dirk roose', 'roose', 'stefan vandewalle', 'vandewalle',
    'georges gielen', 'gielen', 'willy sansen', 'sansen', 'marian verhelst', 'verhelst',
    'ingrid verbauwhede', 'verbauwhede', 'lieven de lathauwer', 'de lathauwer', 'karl meerbergen',
    'meerbergen', 'joos vandewalle', 'adrian ranga', 'ranga', 'hans van oosterwyck', 'van oosterwyck',
    'peter j. ashenden', 'ashenden', 'ludo froyen', 'froyen', 'jean-pierre celis', 'celis',
    'albert van bockstal', 'van bockstal', 'johan suyckens', 'suykens', 'moritz diehl', 'diehl',
    'jan van den bussche', 'van den bussche', 'dirk van gucht', 'van gucht', 'laurens decan',
    'decan', 'geert adriaens', 'adriaens', 'sven charleer', 'charleer', 'jeroen boydens',
    'boydens', 'stijn goeminne', 'goeminne', 'bart goethals', 'goethals', 'yves van rompaey',
    'van rompaey', 'gregory s. hornby', 'hornby', 'andrei vladimirescu', 'vladimirescu',
    'claude shannon', 'shannon', 'george boole', 'boole', 'elsevier', 'elsevier science',
    'springer', 'wiley', 'ieee', 'acm', 'mit press', 'pearson', 'addison-wesley', 'cambridge',
    'vtk', 'vtk it', 'vtk onderwijs', 'admin', 'studiebegeleiding', 'monitoraat'
}

NON_AUTHOR_TOKENS = {
    'empty', 'leeg', 'blanco', 'blank', 'oplossing', 'oplossingen', 'opgave', 'opgaven',
    'solution', 'solutions', 'antwoorden', 'vragen', 'questions', 'theorie', 'theory',
    'copy', 'kopie', 'final', 'nieuw', 'new', 'oud', 'old', 'herexamen', 'examen',
    'exam', 'deel', 'part', 'nl', 'en', 'eng', 'engels', 'english', 'dutch', 'scan',
    'handgeschreven', 'slides', 'code', 'script', 'onbekend', 'unknown', 'student',
    'anoniem', 'anonymous', 'praktisch', 'samenvatting', 'formularium', 'verslag',
    'notities', 'black&white', 'zwart-wit', 'geannoteerd', 'annotated', 'upload',
    'extra', 'oefening', 'oefeningen', 'oefenzitting', 'sessie', 'session', 'labo',
    'lab', 'project', 'taak', 'assignment', 'huiswerk', 'homework', 'summary', 'cursus',
    'les', 'lesnotities', 'soms fout', 'compleet', 'complete', 'bundel', 'reconstructie',
    'toledo', 'voorbeelden', 'voorbeeldenexamen', 'voorbeeldexamen', 'proefexamen',
    'feedback', 'grades', 'evaluatie', 'instructies', 'instructions'
}

KNOWN_STUDENT_AUTHORS = {
    'student 064': 'Student 064',
    'student 083': 'Student 083',
    'student 053': 'Student 053',
    'student 047': 'Student 047',
    'student 096': 'Student 096',
    'student 049': 'Student 049',
    'student 101': 'Student 101',
    'student 077': 'Student 077',
    'student 126': 'Student 126',
    'student 058': 'Student 058',
    'student 024': 'Student 024',
    'student 036': 'Student 036',
    'student 107': 'Student 107',
    'student 015': 'Student 015',
    'student 021': 'Student 021',
    'student 021': 'Student 021',
    'student 031': 'Student 031',
    'student 130': 'Student 130',
    'student 072': 'Student 072',
    'student 011': 'Student 011',
    'student 057': 'Student 057',
    'student 034': 'Student 034',
    'student 061': 'Student 061',
    'student 018': 'Student 018',
    'student 100': 'Student 100',
    'student 137': 'Student 137',
    'student 032': 'Student 032',
    'student 032': 'Student 032',
    'student 062': 'Student 062',
    'student062': 'Student 062',
    'student 027': 'Student 027',
    'student 004': 'Student 004',
    'student 046': 'Student 046',
    'student 105': 'Student 105',
    'student 023': 'Student 023',
    'student 023': 'Student 023',
    'dani¨el slenders': 'Student 023',
    'student 136': 'Student 136',
    'student 121': 'Student 121',
    'student 040': 'Student 040',
    'student040': 'Student 040',
    'student 030': 'Student 030',
    'student 093': 'Student 093',
    'raphaël six': 'Student 093',
    'student 074': 'Student 074',
    'maarten h.': 'Maarten H.',
    'k. segers': 'K. Segers',
    'k segers': 'K. Segers',
    'gladines': 'Gladines',
    'jeroen': 'Jeroen',
    'bjorn': 'Bjorn',
    'emil': 'Emil'
}

MONTH_MAP = {
    'jan': 'Januari', 'januari': 'Januari', 'january': 'Januari',
    'feb': 'Februari', 'februari': 'Februari', 'february': 'Februari',
    'mrt': 'Maart', 'maart': 'Maart', 'march': 'Maart',
    'apr': 'April', 'april': 'April',
    'mei': 'Mei', 'may': 'Mei',
    'jun': 'Juni', 'juni': 'Juni', 'june': 'Juni',
    'jul': 'Juli', 'juli': 'Juli', 'july': 'Juli',
    'aug': 'Augustus', 'augustus': 'Augustus', 'august': 'Augustus',
    'sep': 'September', 'september': 'September', 'sept': 'September',
    'okt': 'Oktober', 'oktober': 'Oktober', 'oct': 'Oktober', 'october': 'Oktober',
    'nov': 'November', 'november': 'November',
    'dec': 'December', 'december': 'December'
}

def canonicalize_tag(tag):
    t = " ".join(str(tag).strip().split())
    if not t:
        return None
    t = TAG_ALIASES.get(t, t)
    if t in ALLOWED_TAGS:
        return t
    if any(p.match(t) for p in TAG_PATTERNS):
        return t
    return None

def is_takehome_submission(doc):
    full_str = f"{doc.get('path', '')} {doc.get('filename', '')}".lower()
    return any(k in full_str for k in ['take home', 'take-home', 'takehome', 'evaluatie opdracht', 'inleveropdracht', 'peer feedback'])

def extract_student_author(doc):
    if is_takehome_submission(doc):
        return None
    fn = doc.get("filename", "")
    path = doc.get("path", "")
    preview = doc.get("content_preview") or {}
    p1 = preview.get("page1_text", "")
    full_text = f"{path} {fn} {p1[:250]}"
    full_lower = full_text.lower()
    
    # Check known student author dictionary first
    for k_low, k_name in KNOWN_STUDENT_AUTHORS.items():
        if re.search(r'\b' + re.escape(k_low) + r'\b', full_lower):
            return k_name

    # Check parenthetical expressions e.g. "(Author Name)"
    cand_matches = re.findall(r'\(([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\)', fn)
    for cand in cand_matches:
        cand_clean = " ".join(cand.strip().split())
        cand_low = cand_clean.lower()
        if cand_low not in NON_AUTHOR_TOKENS and cand_low not in KNOWN_PROFESSORS_AND_ORGS:
            if not any(p in NON_AUTHOR_TOKENS for p in cand_low.split()):
                if not any(k in cand_low for k in ['prof', 'dr.', 'groep', 'admin', 'vtk', 'studie', 'submission']):
                    return cand_clean

    # Check "door [Name]" or "by [Name]"
    m = re.search(r'\b(?:door|by|gemaakt door)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', f"{fn} {p1[:150]}")
    if m:
        cand = m.group(1).strip()
        cand_low = cand.lower()
        if cand_low not in NON_AUTHOR_TOKENS and cand_low not in KNOWN_PROFESSORS_AND_ORGS:
            if not any(p in NON_AUTHOR_TOKENS for p in cand_low.split()):
                return cand

    return None

def extract_academic_year(doc):
    path = doc.get("path", "")
    fn = doc.get("filename", "")
    preview = doc.get("content_preview") or {}
    p1 = preview.get("page1_text", "")
    full_str = f"{path} {fn} {p1[:250]}"
    
    # 1. 4-digit academic year range (e.g. 2018-2019, 2018_2019, 2018 - 2019, 2018/2019)
    m = re.search(r'\b(19\d{2}|20\d{2})\s*[-_/]\s*(19\d{2}|20\d{2})\b', full_str)
    if m:
        y1, y2 = int(m.group(1)), int(m.group(2))
        if y2 == y1 + 1 and 1980 <= y1 <= 2025:
            return f"{y1} - {y2}"
        if y2 == (y1 % 100) + 1:
            return f"{y1} - {y1+1}"

    # 2. 4-digit + 2-digit range (e.g. 2018-19, 2018_19)
    m = re.search(r'\b(20\d{2})\s*[-_/]\s*(\d{2})\b', full_str)
    if m:
        y1 = int(m.group(1))
        y2_short = int(m.group(2))
        if y2_short == (y1 + 1) % 100 and 1980 <= y1 <= 2025:
            return f"{y1} - {y1+1}"

    # 3. 2-digit range (e.g. 18-19, 1920, 22-23, 23-24, /1920/)
    m = re.search(r'\b(\d{2})\s*[-_]\s*(\d{2})\b', full_str)
    if m:
        y1_short, y2_short = int(m.group(1)), int(m.group(2))
        if y2_short == y1_short + 1 and 10 <= y1_short <= 25:
            return f"20{y1_short} - 20{y2_short}"
            
    m = re.search(r'\b(1[0-9]|2[0-5])(1[1-9]|2[0-6])\b', full_str)
    if m:
        s = m.group(0)
        y1_short = int(s[:2])
        y2_short = int(s[2:])
        if y2_short == y1_short + 1 and 10 <= y1_short <= 25:
            return f"20{y1_short} - 20{y2_short}"

    # 4. Dates with explicit months
    m = re.search(r'\b(?:januari|jan|01)[-_/\s\.]*(\d{1,2})?[-_/\s\.]*\'?(20\d{2}|\d{2})\b', full_str, re.IGNORECASE)
    if m:
        raw_yr = m.group(2)
        yr = int(raw_yr) if len(raw_yr) == 4 else 2000 + int(raw_yr)
        if 1980 <= yr <= 2026:
            return f"{yr-1} - {yr}"

    m = re.search(r'\b(?:juni|jun|06)[-_/\s\.]*(\d{1,2})?[-_/\s\.]*\'?(20\d{2}|\d{2})\b', full_str, re.IGNORECASE)
    if m:
        raw_yr = m.group(2)
        yr = int(raw_yr) if len(raw_yr) == 4 else 2000 + int(raw_yr)
        if 1980 <= yr <= 2026:
            return f"{yr-1} - {yr}"

    m = re.search(r'\b(?:augustus|aug|september|sep|08|09|2de\s*zit|herexamen)[-_/\s\.]*(\d{1,2})?[-_/\s\.]*\'?(20\d{2}|\d{2})\b', full_str, re.IGNORECASE)
    if m:
        raw_yr = m.group(2)
        if raw_yr:
            yr = int(raw_yr) if len(raw_yr) == 4 else 2000 + int(raw_yr)
            if 1980 <= yr <= 2026:
                return f"{yr-1} - {yr}"

    m = re.search(r'\b(?:oktober|okt|november|nov|december|dec|10|11|12)[-_/\s\.]*(\d{1,2})?[-_/\s\.]*\'?(20\d{2}|\d{2})\b', full_str, re.IGNORECASE)
    if m:
        raw_yr = m.group(2)
        yr = int(raw_yr) if len(raw_yr) == 4 else 2000 + int(raw_yr)
        if 1980 <= yr <= 2025:
            return f"{yr} - {yr+1}"

    # 5. Boundary expressions in folder paths
    m = re.search(r'\b(?:vanaf|sinds|from|post[-_]?)\s*(\d{4})(?:\s*[-_/]\s*(\d{2,4}))?\b', full_str, re.IGNORECASE)
    if m:
        y1 = int(m.group(1))
        if 1980 <= y1 <= 2025:
            return f"{y1} - {y1+1}"

    m = re.search(r'\b(?:voor|pre[-_]?|before|vóór)\s*(\d{4})(?:\s*[-_/]\s*(\d{2,4}))?\b', full_str, re.IGNORECASE)
    if m:
        y1 = int(m.group(1))
        if 1980 <= y1 <= 2026:
            return f"{y1-1} - {y1}"

    m = re.search(r'\b(?:tot|tot\s*en\s*met|t/m|until|through)\s*(\d{4})\b', full_str, re.IGNORECASE)
    if m:
        y1 = int(m.group(1))
        if 1980 <= y1 <= 2025:
            return f"{y1} - {y1+1}"

    # Fallback to existing valid record year
    orig_year = doc.get("year")
    if orig_year and re.match(r'^\d{4}\s*-\s*\d{4}$', str(orig_year)):
        y1, y2 = [int(x) for x in orig_year.split('-')]
        if y2 == y1 + 1 and 1980 <= y1 <= 2025:
            return f"{y1} - {y2}"

    return None

def has_true_handwriting(doc):
    fn_path = f"{doc.get('path', '')} {doc.get('filename', '')}".lower()
    if any(k in fn_path for k in ['handgeschreven', 'handwritten', 'manueel', 'eigen notities', 'eigen nota']):
        return True
    preview = doc.get('content_preview') or {}
    p1 = (preview.get('page1_text') or '').lower()
    if any(k in p1 for k in ['handgeschreven', 'handwritten', 'manueel', 'eigen notities', 'eigen nota']):
        if not any(k in p1 for k in ['open boek', 'rekenmachine', 'examen duurt', 'toegestaan']):
            return True
    return False

def determine_category_id(doc):
    ext = doc.get("extension", "").lower()
    fn = doc.get("filename", "").lower()
    path = doc.get("path", "").lower()
    preview = doc.get("content_preview") or {}
    p1 = (preview.get("page1_text") or "").lower()
    full_peek = f"{path} {fn} {p1[:200]}"
    
    # 7. Code & Lab files
    if ext in ["py", "java", "c", "cpp", "h", "hpp", "m", "asm", "mips", "tcl", "bluej", "ctxt", "class", "iml", "ipynb", "sh"]:
        return 7
    if any(k in full_peek for k in ["/labo", "labo ", "lab session", "practicum"]):
        return 7

    # 5. TTT / Midterms
    if any(k in full_peek for k in ["tussentijdse toets", "ttt", "midterm", "partieel examen", "proeftoets"]):
        return 5

    # 2. Exams
    if any(k in fn for k in ["samenvatting", "summary", "cursus", "notities", "handboek", "book"]):
        pass
    elif any(k in full_peek for k in ["examen", "exam", "tentamen", "examenvraag", "examenvragen", "reconstructie", "proefexamen", "voorbeeldexamen", "feedback_januari", "januari2021a", "exampleexam"]):
        # Special case: slides that have exam topic
        if "/slides/" in path or "/slides " in path:
            return 6
        return 2

    # 6. Slides
    if ext in ["pptx", "ppt", "odp"]:
        return 6
    if "/slides" in path or "slides" in fn or "hoorcollege" in fn:
        if not any(k in fn for k in ["samenvatting", "summary", "oefening", "examen"]):
            return 6

    # 4. Exercise Sessions / Homework / Projects
    if any(k in full_peek for k in ["oefenzitting", "oefening", "exercise", "problem set", "assignment", "huiswerk", "homework", "huistaak", "opdracht", "p&o", "project", "feedback_hw", "feedback_graded"]):
        return 4

    # 3. Summaries / Notes / Literature
    if any(k in full_peek for k in ["samenvatting", "summary", "lesnotities", "lesnota", "notities", "notas", "notes", "cheatsheet", "formularium", "formuleblad", "begrippen", "overzicht", "cursustekst", "theorie", "handboek"]):
        return 3

    orig_cat = doc.get("category_id")
    if orig_cat in [2, 3, 4, 5, 6, 7]:
        return orig_cat
    return 3

def generate_canonical_title(doc, course_code, course_name, cat_id, author, year):
    fn = doc.get("filename", "")
    path = doc.get("path", "")
    ext = doc.get("extension", "").lower()
    
    # Base title from filename
    title = re.sub(r'\.[a-zA-Z0-9_\s\(\)]+$', '', fn).strip()
    
    # Strip course code prefixes
    title = re.sub(rf'^{course_code}\s*[-_:]\s*', '', title, flags=re.IGNORECASE)
    
    # Strip author from raw title to re-attach cleanly
    if author:
        title = re.sub(rf'\s*\(\s*(?:door\s+)?{re.escape(author)}\s*\)', '', title, flags=re.IGNORECASE)
        title = re.sub(rf'\s*-\s*{re.escape(author)}\s*$', '', title, flags=re.IGNORECASE)
        title = re.sub(rf'\s*by\s+{re.escape(author)}\s*$', '', title, flags=re.IGNORECASE)
        title = re.sub(rf'\s*door\s+{re.escape(author)}\s*$', '', title, flags=re.IGNORECASE)

    # Normalize underscores and special characters
    title = re.sub(r'[_\-]+', ' ', title).strip()
    title = " ".join(title.split())
    
    # Date normalizations in title
    for m_short, m_long in MONTH_MAP.items():
        title = re.sub(rf'\b{m_short}\b', m_long, title, flags=re.IGNORECASE)
        title = re.sub(rf'(\d{{1,2}})\s*({m_long})', r'\1 \2', title, flags=re.IGNORECASE)
        title = re.sub(rf'({m_long})\s*(\d{{4}})', r'\1 \2', title, flags=re.IGNORECASE)
        title = re.sub(rf'(\d{{1,2}})[-_/](\d{{1,2}})[-_/](\d{{2,4}})', r'\1-\2-\3', title)

    # Solution normalizations
    is_solution = False
    is_model = False
    if re.search(r'\b(?:modeloplossing|model\s+solution)\b', title, re.IGNORECASE):
        is_model = True
        title = re.sub(r'\b(?:modeloplossing|model\s+solution)\b', '', title, flags=re.IGNORECASE).strip()
    elif re.search(r'\b(?:oplossing|oplossingen|solution|solutions|antwoorden)\b', title, re.IGNORECASE):
        is_solution = True
        title = re.sub(r'\b(?:oplossing|oplossingen|solution|solutions|antwoorden)\b', '', title, flags=re.IGNORECASE).strip()
        
    is_opgave = False
    if re.search(r'\b(?:opgave|opgaven|blanco|blank)\b', title, re.IGNORECASE):
        is_opgave = True
        title = re.sub(r'\b(?:opgave|opgaven|blanco|blank)\b', '', title, flags=re.IGNORECASE).strip()

    title = " ".join(title.split())

    # Fallback for empty or very generic titles
    if len(title) <= 2 or title.lower() in ["oplossing", "opgave", "oefening", "examen", "samenvatting", "slides", "1", "2", "3", "03", "05"]:
        parent_folder = os.path.basename(os.path.dirname(path))
        clean_parent = re.sub(r'[_.\-]+', ' ', parent_folder).strip()
        clean_parent = re.sub(rf'^{course_code}\s*[-_:]\s*', '', clean_parent, flags=re.IGNORECASE)
        if len(clean_parent) > 2 and clean_parent.lower() not in ["documenten", "files", "extra", "examens", "samenvattingen", "oefeningen", "slides"]:
            if title and title.isdigit():
                title = f"{clean_parent} Deel {title}"
            else:
                title = clean_parent
        else:
            title = course_name

    # Format by category template
    if cat_id == 2: # Examens
        if re.search(r'\b(?:vragen|examenvragen|reconstructie)\b', title, re.IGNORECASE) and not title.lower().startswith("examen"):
            if not title.lower().startswith("examenvragen") and not title.lower().startswith("examen reconstructie"):
                title = f"Examenvragen {title}"
        elif not title.lower().startswith("examen"):
            title = f"Examen {title}"
            
        if is_model and "(Modeloplossing)" not in title:
            title = f"{title} (Modeloplossing)"
        elif is_solution and "(Oplossing)" not in title:
            title = f"{title} (Oplossing)"
        elif is_opgave and "(Opgave)" not in title:
            title = f"{title} (Opgave)"

    elif cat_id == 4: # Oefenzittingen
        if not any(title.lower().startswith(p) for p in ["oefenzitting", "oefening", "huiswerk", "huistaak", "assignment", "opdracht", "p&o", "project", "feedback", "bundel"]):
            title = f"Oefenzitting - {title}"
        if is_model and "(Modeloplossing)" not in title:
            title = f"{title} (Modeloplossing)"
        elif is_solution and "(Oplossing)" not in title:
            title = f"{title} (Oplossing)"
        elif is_opgave and "(Opgave)" not in title:
            title = f"{title} (Opgave)"

    elif cat_id == 5: # TTT's
        if not title.lower().startswith("ttt"):
            title = f"TTT - {title}"
        if is_model and "(Modeloplossing)" not in title:
            title = f"{title} (Modeloplossing)"
        elif is_solution and "(Oplossing)" not in title:
            title = f"{title} (Oplossing)"
        elif is_opgave and "(Opgave)" not in title:
            title = f"{title} (Opgave)"

    elif cat_id == 6: # Slides
        if not title.lower().startswith("slides"):
            title = f"Slides - {title}"

    elif cat_id == 7: # Labo & Code
        if not title.lower().startswith("labo") and not title.lower().startswith("script") and not title.lower().startswith("code"):
            if ext in ["py", "java", "c", "cpp", "m", "ipynb"]:
                title = f"Labo Code - {title}"
            else:
                title = f"Labo - {title}"

    elif cat_id == 3: # Samenvattingen
        if not any(title.lower().startswith(p) for p in ["samenvatting", "lesnotities", "formularium", "overzicht", "cursus", "handboek", "paper", "literatuur", "begrippen"]):
            if "formularium" in title.lower() or "formule" in title.lower():
                title = f"Formularium - {title}"
            elif "notities" in title.lower() or "nota" in title.lower():
                title = f"Lesnotities - {title}"
            else:
                title = f"Samenvatting - {title}"

    # Clean double prefixes e.g. "Examen Examenvragen" -> "Examenvragen"
    title = re.sub(r'^Examen\s+Examenvragen', 'Examenvragen', title, flags=re.IGNORECASE)
    title = re.sub(r'^Examen\s+Examen\b', 'Examen', title, flags=re.IGNORECASE)
    title = re.sub(r'^Slides\s+-\s+Slides\b', 'Slides -', title, flags=re.IGNORECASE)
    title = re.sub(r'^Samenvatting\s+-\s+Samenvatting\b', 'Samenvatting -', title, flags=re.IGNORECASE)
    title = re.sub(r'\(\s*\)', '', title).strip()

    # Re-attach author cleanly
    if author and f"({author})" not in title:
        title = f"{title} ({author})"

    title = " ".join(title.split())
    if len(title) > 200:
        title = title[:197] + "..."
    return title

def derive_orthogonal_tags(doc, cat_id, author, year):
    fn = doc.get("filename", "")
    path = doc.get("path", "")
    ext = doc.get("extension", "").lower()
    preview = doc.get("content_preview") or {}
    p1 = preview.get("page1_text", "")
    full_str = f"{path} {fn} {p1}".lower()
    
    tags = []
    
    # 1. Provenance
    tags.append("old-burgieclan")
    
    # 2. Medium: Scan
    if preview.get("is_scanned_handwritten") or ext in ["jpg", "jpeg", "png", "heic", "bmp"]:
        tags.append("Scan")
        
    # 3. Content: Handgeschreven
    if has_true_handwriting(doc):
        tags.append("Handgeschreven")
        
    # 4. Programming Languages & Tools
    if ext == "py" or "python" in full_str:
        if "Python" not in tags: tags.append("Python")
    if ext in ["java", "class", "bluej", "ctxt"] or "java" in full_str:
        if "Java" not in tags: tags.append("Java")
    if ext in ["c", "cpp", "h", "hpp", "asm", "mips"] or "c++" in full_str or "c/" in full_str:
        if "C / C++" not in tags: tags.append("C / C++")
    if ext in ["m", "mat"] or "matlab" in full_str:
        if "MATLAB" not in tags: tags.append("MATLAB")
    if ext in ["xlsx", "xls"] or "excel" in full_str:
        if "Excel" not in tags: tags.append("Excel")
    if ext in ["csv", "dat"] or "dataset" in full_str:
        if "Dataset / Data" not in tags: tags.append("Dataset / Data")

    # 5. Exam Sessions
    if "januari" in full_str or "jan" in fn.lower():
        tags.append("Januari")
    if "juni" in full_str or "jun" in fn.lower():
        tags.append("Juni")
    if any(k in full_str for k in ["herexamen", "2de zit", "augustus", "september", "aug", "sep"]):
        tags.append("Herexamen (2de zit)")
    if cat_id != 5 and any(k in full_str for k in ["midterm", "tussentijds"]):
        tags.append("Tussentijds (Midterm)")

    # 6. Solution State
    if "modeloplossing" in full_str or "model solution" in full_str:
        tags.append("Modeloplossing")
    elif any(k in full_str for k in ["oplossing", "oplossingen", "solution", "solutions", "antwoorden", "answers"]):
        tags.append("Oplossing")
    elif any(k in full_str for k in ["opgave", "opgaven", "blanco", "blank"]):
        tags.append("Opgave (Blanco)")

    # 7. Formats & Nature
    if any(k in full_str for k in ["formularium", "formuleblad", "cheatsheet", "cheat sheet"]):
        tags.append("Formularium")
    if any(k in full_str for k in ["lesnotities", "lesnota", "notities", "class notes"]):
        tags.append("Lesnotities")
    if any(k in full_str for k in ["verslag", "project", "assignment", "report", "p&o"]):
        tags.append("Verslag / Project")
    if any(k in full_str for k in ["reconstructie", "examenvragen", "exam questions", "vragen"]):
        tags.append("Reconstructie / Vragen")
    if any(k in full_str for k in ["alle", "bundel", "compilatie", "complete", "all"]):
        tags.append("Bundel / Alle")
    if any(k in full_str for k in ["meerkeuze", "multiple choice", "mc"]):
        tags.append("Meerkeuze")
    if any(k in full_str for k in ["mondeling", "oral"]):
        tags.append("Mondeling")
    if any(k in full_str for k in ["studiewijzer", "cursuswijzer", "gids", "guide"]):
        tags.append("Studiewijzer / Gids")
    if cat_id != 3 and any(k in full_str for k in ["theorie", "theory"]):
        tags.append("Theorie")
    if cat_id != 4 and any(k in full_str for k in ["oefeningen", "exercises", "oefening"]):
        tags.append("Oefeningen (Examen)")

    # 8. Divisions (Deel 1 - 19)
    m = re.search(r'\b(?:deel|part|vol|sessie|les|chapter|ch)\s*([1-9]|1[0-9])\b', full_str)
    if m:
        tags.append(f"Deel {m.group(1)}")

    # 9. Language: English
    if any(k in path.lower() for k in ["master of", "master in", "option:", "options/", "core courses", "core programme", "electives"]):
        tags.append("English")
    elif any(k in fn.lower() for k in ["summary", "exam", "exercise", "assignment", "slides", "notes", "solution", "solutions"]):
        tags.append("English")
    elif any(k in p1.lower() for k in ["the ", "this ", "chapter ", "exam ", "lecture ", "exercise "]):
        tags.append("English")

    # Canonicalize and apply redundancy filtering
    canonical_tags = []
    redundant = REDUNDANT_IN_CATEGORY.get(cat_id, set())
    
    for t in tags:
        c_tag = canonicalize_tag(t)
        if c_tag and c_tag not in redundant and c_tag not in canonical_tags:
            canonical_tags.append(c_tag)
            
    if "old-burgieclan" not in canonical_tags:
        canonical_tags.append("old-burgieclan")

    return canonical_tags

def normalize_course(course_code, course_name, documents):
    # Detect photo sequences
    image_exts = {'jpg', 'jpeg', 'png', 'heic', 'bmp'}
    folder_images = defaultdict(list)
    for d in documents:
        if d.get('extension', '').lower() in image_exts:
            parent = os.path.dirname(d.get('path', ''))
            folder_images[parent].append(d)

    photo_seq_titles = {}
    for parent, imgs in folder_images.items():
        if len(imgs) >= 3:
            def natural_sort_key(rec):
                fn = rec.get('filename', '')
                nums = re.findall(r'\d+', fn)
                return (int(nums[0]) if nums else 0, fn)
            sorted_imgs = sorted(imgs, key=natural_sort_key)
            total = len(sorted_imgs)
            
            # Clean folder name
            folder_path = parent.strip('/')
            parts = folder_path.split('/')
            if len(parts) >= 2:
                gp = re.sub(r'[_.\-]+', ' ', parts[-2]).strip()
                p = re.sub(r'[_.\-]+', ' ', parts[-1]).strip()
                p = re.sub(r'deel\s*(\d+)', r'Deel \1', p, flags=re.IGNORECASE)
                if gp.lower() in {'examens', 'oefeningen', 'theorie', 'samenvattingen', 'slides', 'labo', 'midterms', 'ttt'}:
                    clean_folder_title = f"{gp} - {p}"
                else:
                    clean_folder_title = p
            else:
                raw_name = os.path.basename(parent) or "Document"
                clean_folder_title = re.sub(r'[_.\-]+', ' ', raw_name).strip()
            clean_folder_title = " ".join(clean_folder_title.split())
            
            for idx, img_rec in enumerate(sorted_imgs, start=1):
                photo_seq_titles[img_rec['file_id']] = f"{clean_folder_title} (p. {idx}/{total})"

    normalized = []
    for doc in documents:
        file_id = doc["file_id"]
        cat_id = determine_category_id(doc)
        author = extract_student_author(doc)
        year = extract_academic_year(doc)
        tags = derive_orthogonal_tags(doc, cat_id, author, year)
        
        if file_id in photo_seq_titles:
            display_title = photo_seq_titles[file_id]
            if "Scan" not in tags:
                tags.append("Scan")
        else:
            display_title = generate_canonical_title(doc, course_code, course_name, cat_id, author, year)
            
        normalized.append({
            "file_id": file_id,
            "display_title": display_title,
            "category_id": cat_id,
            "year": year,
            "author": author,
            "tags": tags
        })

    # Collision resolution
    title_counts = Counter(r["display_title"] for r in normalized)
    seen_titles = defaultdict(int)
    for r in normalized:
        t = r["display_title"]
        if title_counts[t] > 1:
            seen_titles[t] += 1
            idx = seen_titles[t]
            if idx > 1:
                r["display_title"] = f"{t} ({idx})"

    return normalized

