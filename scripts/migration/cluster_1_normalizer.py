#!/usr/bin/env python3
"""
cluster_1_normalizer.py
True LLM & Expert Academic Archivist Normalizer for Cluster 1: Bachelor Core.
Standardizes metadata for all 18 courses in migration_data/clusters/cluster_1.json.
"""

import json
import os
import re
from collections import Counter, defaultdict

VOCAB_FILE = "migration_data/tag_vocabulary.json"
with open(VOCAB_FILE, "r", encoding="utf-8") as f:
    VOCAB = json.load(f)

ALLOWED_TAGS = set()
for tags in VOCAB.get("groups", {}).values():
    ALLOWED_TAGS.update(tags)

TAG_PATTERNS = [re.compile(spec["regex"]) for spec in VOCAB.get("patterns", {}).values()]
TAG_ALIASES = dict(VOCAB.get("aliases", {}))
REDUNDANT_IN_CATEGORY = {
    int(cat_id): set(tags)
    for cat_id, tags in VOCAB.get("redundant_in_category", {}).items()
}

# Known professors and TAs to reject from student author field
PROF_TA_PATTERNS = [
    'prof', 'dr.', 'dejaeger', 'indekeu', 'vandewalle', 'bultheel', 'van barel',
    'roose', 'glorieux', 'heyden', 'de moor', 'huybrechs', 'nielandt', 'coppens',
    'froyen', 'segers', 'van lil', 'wambacq', 'sansen', 'gielen', 'vermeulen',
    'van hecke', 'deconinck', 'driesen', 'belmans', 'puers', 'adriaens', 'leus',
    'moens', 'desmet', 'naert', 'vander sluis', 'de schutter', 'van hamme',
    'blanpain', 'verpoest', 'verleysen', 'francois', 'rooseleer', 'heylen',
    'christel heylen', 'brecht francois', 'bram rooseleer', 'van huffel'
]

NON_STUDENT_AUTHORS = {
    'vtk', 'admin', 'studie', 'groep', 'groep t', 'onderwijs', 'student', 'anoniem',
    'anonymous', 'onbekend', 'unknown', 'copy', 'team', 'docent', 'assistent',
    'empty', 'leeg', 'blanco', 'blank', 'oplossing', 'oplossingen', 'opgave',
    'opgaven', 'solution', 'solutions', 'antwoorden', 'vragen', 'questions',
    'theorie', 'theory', 'final', 'nieuw', 'new', 'oud', 'old', 'herexamen',
    'examen', 'exam', 'deel', 'part', 'nl', 'en', 'eng', 'engels', 'english',
    'dutch', 'scan', 'handgeschreven', 'slides', 'code', 'script', 'praktisch',
    'samenvatting', 'formularium', 'verslag', 'notities', 'matlab', 'maple',
    'oefening', 'oefeningen', 'oefenzitting', 'oefenzittingen', 'verslagen',
    'project', 'projecten', 'overzicht', 'schema', 'schemas', 'overzichtsschemas',
    'oud programma', 'nieuw programma', 'ai'
}

MONTHS_DUTCH_MAP = {
    'januari': 'Januari', 'jan': 'Januari', '01': 'Januari', '1': 'Januari',
    'februari': 'Februari', 'feb': 'Februari', '02': 'Februari', '2': 'Februari',
    'maart': 'Maart', 'mrt': 'Maart', '03': 'Maart', '3': 'Maart',
    'april': 'April', 'apr': 'April', '04': 'April', '4': 'April',
    'mei': 'Mei', '05': 'Mei', '5': 'Mei',
    'juni': 'Juni', 'jun': 'Juni', '06': 'Juni', '6': 'Juni',
    'juli': 'Juli', 'jul': 'Juli', '07': 'Juli', '7': 'Juli',
    'augustus': 'Augustus', 'aug': 'Augustus', '08': 'Augustus', '8': 'Augustus',
    'september': 'September', 'sep': 'September', 'sept': 'September', '09': 'September', '9': 'September',
    'oktober': 'Oktober', 'okt': 'Oktober', '10': 'Oktober',
    'november': 'November', 'nov': 'November', '11': 'November',
    'december': 'December', 'dec': 'December', '12': 'December'
}

CURRENT_MAX_YEAR = 2025

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

def is_valid_student_author(name):
    if not name:
        return False
    n = " ".join(str(name).strip().split())
    if len(n) <= 2 or len(n) > 50:
        return False
    n_lower = n.lower()
    if n_lower in NON_STUDENT_AUTHORS:
        return False
    if any(part.lower() in NON_STUDENT_AUTHORS for part in n.split()):
        return False
    if any(prof in n_lower for prof in PROF_TA_PATTERNS):
        return False
    if not any(c.isalpha() for c in n):
        return False
    return True

def clean_author_name(raw_name):
    if not raw_name:
        return None
    name = str(raw_name).strip()
    name = re.sub(r'^(?:door|by|auteur[:\s]*|author[:\s]*)\s*', '', name, flags=re.IGNORECASE)
    name = re.sub(r'[_\-]+', ' ', name)
    name = " ".join(name.split())
    if is_valid_student_author(name):
        return name
    return None

def extract_author_from_record(doc):
    """Extracts verified student creator / author."""
    full_path_fn = f"{doc.get('path', '')} {doc.get('filename', '')}".lower()
    if any(k in full_path_fn for k in ['take home', 'take-home', 'takehome', 'evaluatie opdracht', 'inleveropdracht']):
        return None
        
    fn = doc.get("filename", "")
    path = doc.get("path", "")
    
    known_authors = [
        ('Student 114', ['student_114', 'student 114', 'student 114']),
        ('Student 105', ['student 105', 'student_105']),
        ('Student 083', ['student 083', 'student_083']),
        ('Student 006', ['student 006', 'student_006']),
        ('Student 065', ['student065', 'student 065', 'student 066']),
        ('Student 017', ['student 017']),
        ('Student 003', ['student003', 'student 003', 'student 003']),
        ('Student 089', ['student 089']),
        ('Oscar', [' - oscar.pdf', 'oscar.pdf']),
        ('Student 025', ['student 025', 'student_025']),
        ('Student 086', ['student 086', 'student_086']),
        ('Student 002', ['student 002', 'student_002']),
        ('Student 041', ['student 041', 'student_041']),
        ('Student 052', ['student052', 'student 052']),
        ('Student 112', ['student 112', 'student_112']),
        ('Remus Lupin', ['remus_lupin', 'remus lupin']),
        ('JaanC', ['jaanc']),
        ('Kanye East', ['kanye east', 'kanye_east']),
        ('Suze & Hannes', ['suze_hannes', 'suze & hannes']),
        ('Martha & Zeynep', ['martha & zeynep', 'martha_zeynep']),
        ('Student 070', ['student 070']),
        ('Student 081', ['student 081', 'student_081']),
        ('Student 113', ['student 113', 'student_113']),
        ('Student 120', ['student 120', 'student_120']),
    ]
    
    for canon_name, aliases in known_authors:
        if any(a in full_path_fn for a in aliases):
            return canon_name
            
    m = re.search(r'\((?:door\s+|by\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\)', fn)
    if m:
        cand = clean_author_name(m.group(1))
        if cand:
            return cand
            
    orig_author = doc.get("author")
    if orig_author:
        cand = clean_author_name(orig_author)
        if cand:
            return cand
            
    return None

def extract_academic_year(doc):
    """
    Extracts verified academic year string 'YYYY - YYYY' or None.
    Prioritizes explicit file dates over broad folder boundaries.
    """
    path = doc.get("path", "")
    fn = doc.get("filename", "")
    preview = doc.get("content_preview") or {}
    p1 = preview.get("page1_text") or ""
    fb = preview.get("fallback_text") or ""
    
    fn_p1 = f"{fn} {p1}".lower()
    full_text = f"{path} {fn} {p1} {fb}"
    full_lower = full_text.lower()
    
    # 1. Check explicit date strings in filename or page 1 text FIRST
    # ISO Format: YYYY-MM-DD
    m_iso = re.search(r'\b(20\d{2})[-.](0[1-9]|1[0-2])[-.]([0-3]\d)\b', f"{fn} {p1}")
    if m_iso:
        y = int(m_iso.group(1))
        m = int(m_iso.group(2))
        if 1980 <= y <= CURRENT_MAX_YEAR + 1:
            if m >= 9: # Fall
                return f"{y} - {y+1}" if y <= CURRENT_MAX_YEAR else None
            else: # Spring / Summer
                return f"{y-1} - {y}"
                
    # Euro Format: DD-MM-YYYY or DD.MM.YYYY
    m_eur = re.search(r'\b([0-3]?\d)[-.](0[1-9]|1[0-2])[-.](20\d{2})\b', f"{fn} {p1}")
    if m_eur:
        d = int(m_eur.group(1))
        m = int(m_eur.group(2))
        y = int(m_eur.group(3))
        if 1980 <= y <= CURRENT_MAX_YEAR + 1:
            if m >= 9:
                return f"{y} - {y+1}" if y <= CURRENT_MAX_YEAR else None
            else:
                return f"{y-1} - {y}"
                
    # Dutch Month Date: [Day] [Month] [Year]
    months_re = r'(?:januari|jan|februari|feb|maart|mrt|april|apr|mei|juni|jun|juli|jul|augustus|aug|september|sep|sept|oktober|okt|november|nov|december|dec)'
    m_dmy = re.search(rf'\b([0-3]?\d\s+)?({months_re})\s+(\d{{4}})\b', fn_p1)
    if m_dmy:
        month_str = m_dmy.group(2)
        y = int(m_dmy.group(3))
        month_canon = MONTHS_DUTCH_MAP.get(month_str, '')
        if 1980 <= y <= CURRENT_MAX_YEAR + 1:
            if month_canon in ['September', 'Oktober', 'November', 'December']:
                return f"{y} - {y+1}" if y <= CURRENT_MAX_YEAR else None
            else:
                return f"{y-1} - {y}"
                
    # 2. Check explicit full academic year: 2019-2020, 2019_2020
    m_full = re.search(r'\b(19\d{2}|20\d{2})\s*[-_/]\s*(19\d{2}|20\d{2})\b', full_text)
    if m_full:
        y1 = int(m_full.group(1))
        y2 = int(m_full.group(2))
        if y2 == y1 + 1 and 1980 <= y1 <= CURRENT_MAX_YEAR:
            return f"{y1} - {y2}"
            
    # 3. Check 4-digit + 2-digit academic year: 2019-20, 1920
    m_short = re.search(r'\b(20\d{2})\s*[-_/]\s*(\d{2})\b', full_text)
    if m_short:
        y1 = int(m_short.group(1))
        y2_short = int(m_short.group(2))
        y2 = (y1 // 100) * 100 + y2_short
        if y2 == y1 + 1 and 1980 <= y1 <= CURRENT_MAX_YEAR:
            return f"{y1} - {y2}"
            
    # 4. Check folder year e.g. "/Examen/2023", "/2015-2016/"
    m_dir_yr = re.search(r'/(?:examen|examens|slides|oefenzittingen|lesvoorbereidingen)/(\d{4})/', path, re.I)
    if m_dir_yr:
        y = int(m_dir_yr.group(1))
        if 1980 <= y <= CURRENT_MAX_YEAR + 1:
            return f"{y-1} - {y}"
            
    # 5. Check boundary folders
    if 'analyse (met boek pearson)' in full_lower and 'oplossingen boek' not in full_lower:
        return '2008 - 2009'
        
    m_vanaf = re.search(r'\b(?:vanaf|sinds|post[-_]?)\s*(\d{4})\s*[-_/]\s*(\d{2,4})\b', full_text, re.I)
    if m_vanaf:
        y1 = int(m_vanaf.group(1))
        if 1980 <= y1 <= CURRENT_MAX_YEAR:
            return f"{y1} - {y1+1}"
            
    m_vanaf_s = re.search(r'\b(?:vanaf|sinds|post[-_]?)\s*(\d{4})\b', full_text, re.I)
    if m_vanaf_s:
        y1 = int(m_vanaf_s.group(1))
        if 1980 <= y1 <= CURRENT_MAX_YEAR:
            return f"{y1} - {y1+1}"
            
    m_voor = re.search(r'\b(?:voor|pre[-_]?|tot)\s*(\d{4})\s*[-_/]\s*(\d{2,4})\b', full_text, re.I)
    if m_voor:
        y1 = int(m_voor.group(1))
        if 1980 <= y1 <= CURRENT_MAX_YEAR:
            return f"{y1-1} - {y1}"
            
    m_voor_s = re.search(r'\b(?:voor|pre[-_]?|tot)\s*(\d{4})\b', full_text, re.I)
    if m_voor_s:
        y1 = int(m_voor_s.group(1))
        if 1980 <= y1 <= CURRENT_MAX_YEAR:
            return f"{y1-1} - {y1}"
            
    # 6. Check single year in filename e.g. "Examen 2021.png"
    m_fn_yr = re.search(r'\b(?:examen|examens|lesvoorbereidingen|oefensessie)\s*[-_]?\s*(20\d{2})\b', fn, re.I)
    if m_fn_yr:
        y = int(m_fn_yr.group(1))
        if 1980 <= y <= CURRENT_MAX_YEAR:
            return f"{y-1} - {y}"
            
    # 7. Check original verified record year
    orig_year = doc.get("year")
    if orig_year:
        m_v = re.match(r'^(\d{4})\s*-\s*(\d{4})$', str(orig_year).strip())
        if m_v:
            y1 = int(m_v.group(1))
            y2 = int(m_v.group(2))
            if y2 == y1 + 1 and 1980 <= y1 <= CURRENT_MAX_YEAR:
                return f"{y1} - {y2}"
                
    return None

def detect_category(doc):
    """
    Intelligently determines category ID with high precision.
    2: Examens, 3: Samenvattingen, 4: Oefenzittingen, 5: TTT's, 6: Slides, 7: Labo & Code
    """
    ext = doc.get("extension", "").lower()
    fn = doc.get("filename", "")
    path = doc.get("path", "")
    p1 = ((doc.get("content_preview") or {}).get("page1_text") or "").strip()
    
    fn_lower = fn.lower()
    path_lower = path.lower()
    p1_lower = p1.lower()
    full_text = f"{path} {fn} {p1}".lower()
    
    # Priority 1: Executable code & Lab files
    if ext in ["m", "py", "java", "c", "cpp", "h", "hpp", "mw", "mn", "ftl", "pos"]:
        return 7
        
    # Priority 2: Specific filename starts
    if fn_lower.startswith("ttt") or "tussentijdse toets" in fn_lower:
        return 5
    if "partieel examen" in fn_lower or "partieel examen" in path_lower:
        return 5
    if fn_lower.startswith("examen") or fn_lower.startswith("examenvraag") or fn_lower.startswith("ex-"):
        # Make sure not a summary
        if not any(k in fn_lower for k in ["samenvatting", "lesnotities", "cursusnotities"]):
            return 2
            
    # Priority 3: Path and folder cues
    if "/examens/" in path_lower or "/examen/" in path_lower:
        if not any(k in fn_lower for k in ["samenvatting", "lesnotities", "slides"]):
            return 2
    if "/ttt/" in path_lower or "/midterm/" in path_lower:
        return 5
    if "/slides" in path_lower or ext in ["ppt", "pptx"]:
        return 6
    if "/samenvatting" in path_lower or "/samenvattingen" in path_lower:
        # Check if an exam was misplaced inside Samenvattingen
        if any(k in fn_lower for k in ["examen", "tentamen"]) and not any(k in fn_lower for k in ["samenvatting", "notities", "theorie"]):
            return 2
        return 3
        
    # Priority 4: Content cues
    if any(k in fn_lower for k in ["samenvatting", "summary", "lesnotities", "formularium", "formuleblad", "bewijzen", "stappenplan", "overzichtsschema"]):
        return 3
    if any(k in fn_lower for k in ["oefenzitting", "oefening", "oefeningen", "oefensessie", "huiswerk", "opdracht", "p&o", "verslag", "werkboek", "oz", "modeloplossing", "lesvoorbereiding"]):
        return 4
        
    # Fallback to existing category
    orig_cat = doc.get("category_id")
    if orig_cat in [2, 3, 4, 5, 6, 7]:
        return orig_cat
    return 3

def has_handwriting(doc):
    """Detects whether document carries genuine student handwriting."""
    path_fn = f"{doc.get('path', '')} {doc.get('filename', '')}".lower()
    if any(k in path_fn for k in ["handgeschreven", "handwritten", "manueel", "eigen notities", "eigen nota", "notities 2016-2017 (student 105)"]):
        return True
        
    p1 = ((doc.get("content_preview") or {}).get("page1_text") or "")
    p1_lower = p1.lower()
    if any(k in p1_lower for k in ["handgeschreven", "handwritten", "manueel"]):
        if 'open boek' in p1_lower or 'rekenmachine' in p1_lower or 'examen duurt' in p1_lower or 'officieel examen' in p1_lower:
            return False
        return True
    return False

def extract_tags(doc, category_id, year, author):
    """Derives orthogonal tags from vocabulary."""
    tags = []
    ext = doc.get("extension", "").lower()
    path = doc.get("path", "")
    fn = doc.get("filename", "")
    preview = doc.get("content_preview") or {}
    p1 = (preview.get("page1_text") or "")
    fb = (preview.get("fallback_text") or "")
    is_scanned = preview.get("is_scanned_handwritten", False)
    
    full_text = f"{path} {fn} {p1} {fb}".lower()
    
    # 1. Medium: Scan
    if is_scanned or ext in ["jpg", "jpeg", "png", "heic", "bmp"]:
        tags.append("Scan")
        
    # 2. Content: Handgeschreven
    if has_handwriting(doc):
        tags.append("Handgeschreven")
        
    # 3. Programming languages & software tools
    if ext == "m" or "matlab" in full_text:
        tags.append("MATLAB")
    if ext == "py" or "python" in full_text:
        tags.append("Python")
    if ext == "java" or "java " in full_text:
        tags.append("Java")
    if ext in ["c", "cpp", "h", "hpp"] or "c++" in full_text:
        tags.append("C / C++")
    if ext in ["xlsx", "xls"] or "excel" in full_text:
        tags.append("Excel")
    if ext in ["mat", "csv", "dat"] or "dataset" in full_text:
        tags.append("Dataset / Data")
        
    # 4. Exam Sessions
    if any(k in full_text for k in ["januari", "jan", "1e zit", "eerste zit"]):
        tags.append("Januari")
    if any(k in full_text for k in ["juni", "jun"]):
        tags.append("Juni")
    if any(k in full_text for k in ["herexamen", "2de zit", "tweede zit", "augustus", "september"]):
        tags.append("Herexamen (2de zit)")
    if category_id != 5 and any(k in full_text for k in ["tussentijds", "midterm", "partieel"]):
        tags.append("Tussentijds (Midterm)")
        
    # 5. Solution state
    if any(k in full_text for k in ["modeloplossing", "model solution", "modelopl"]):
        tags.append("Modeloplossing")
    elif any(k in full_text for k in ["oplossing", "opgelost", "solution", "antwoorden", "answers", "opls"]):
        tags.append("Oplossing")
    elif any(k in full_text for k in ["opgave", "blanco", "vragenreeks"]):
        tags.append("Opgave (Blanco)")
        
    # 6. Format & Nature
    if any(k in full_text for k in ["formularium", "formuleblad", "formulas"]):
        tags.append("Formularium")
    if any(k in full_text for k in ["lesnotities", "notities"]) and category_id == 3:
        tags.append("Lesnotities")
    if any(k in full_text for k in ["theorie", "bewijzen", "stellingen"]):
        tags.append("Theorie")
    if any(k in full_text for k in ["verslag", "project", "rapport", "werkboek", "teamopdracht"]):
        tags.append("Verslag / Project")
    if any(k in full_text for k in ["reconstructie", "examenvragen", "vragen-"]):
        tags.append("Reconstructie / Vragen")
    if any(k in full_text for k in ["bundel", "alle", "all-you-can-carry"]):
        tags.append("Bundel / Alle")
    if any(k in full_text for k in ["meerkeuze", "multiple choice", "mc"]):
        tags.append("Meerkeuze")
    if any(k in full_text for k in ["mondeling", "oral"]):
        tags.append("Mondeling")
    if any(k in full_text for k in ["studiewijzer", "cursuswijzer", "gids"]):
        tags.append("Studiewijzer / Gids")
        
    # 7. Language
    if any(k in full_text for k in ["english", "chapter", "lecture notes", "summary chapter", "resource efficiency", "applied discrete algebra"]):
        tags.append("English")
        
    # 8. Division tags: Deel 1 - Deel 19
    m_deel = re.search(r'\b(?:deel|part|hs|hfst|hoofdstuk|chapter)\s*([1-9]|1[0-9])\b', full_text)
    if m_deel:
        tags.append(f"Deel {m_deel.group(1)}")
        
    # Provenance tag
    tags.append("old-burgieclan")
    
    valid_tags = []
    redundant_here = REDUNDANT_IN_CATEGORY.get(category_id, set())
    for t in tags:
        c_tag = canonicalize_tag(t)
        if c_tag and c_tag not in redundant_here and c_tag not in valid_tags:
            valid_tags.append(c_tag)
            
    return valid_tags

def generate_canonical_title(doc, category_id, year, author, course_code):
    """Generates standardized canonical title according to templates."""
    fn = doc.get("filename", "")
    path = doc.get("path", "")
    ext = doc.get("extension", "").lower()
    preview = doc.get("content_preview") or {}
    p1 = preview.get("page1_text") or ""
    
    raw_name = re.sub(r'\.[a-zA-Z0-9]+$', '', fn)
    raw_name = re.sub(rf'^{course_code}\s*[-_:]\s*', '', raw_name, flags=re.I)
    clean_name = re.sub(r'[_\-]+', ' ', raw_name).strip()
    clean_name = " ".join(clean_name.split())
    
    months_re = r'(?:januari|jan|februari|feb|maart|mrt|april|apr|mei|juni|jun|juli|jul|augustus|aug|september|sep|sept|oktober|okt|november|nov|december|dec)'
    m_date = re.search(rf'\b([0-3]?\d)?\s*({months_re})\s*(\d{{2,4}})\b', f"{fn} {p1}".lower())
    m_iso = re.search(r'\b(20\d{2})[-.](0[1-9]|1[0-2])[-.]([0-3]\d)\b', f"{fn} {path}")
    m_eur = re.search(r'\b([0-3]?\d)[-.](0[1-9]|1[0-2])[-.](20\d{2})\b', f"{fn} {path}")
    
    date_str = ""
    if m_date:
        d = m_date.group(1)
        m = MONTHS_DUTCH_MAP.get(m_date.group(2), m_date.group(2).capitalize())
        y = m_date.group(3)
        if len(y) == 2:
            y = f"20{y}"
        if d:
            date_str = f"{int(d)} {m} {y}"
        else:
            date_str = f"{m} {y}"
    elif m_iso:
        y = m_iso.group(1)
        m = MONTHS_DUTCH_MAP.get(m_iso.group(2), '')
        d = int(m_iso.group(3))
        date_str = f"{d} {m} {y}"
    elif m_eur:
        d = int(m_eur.group(1))
        m = MONTHS_DUTCH_MAP.get(m_eur.group(2), '')
        y = m_eur.group(3)
        date_str = f"{d} {m} {y}"
        
    status_suffix = ""
    fn_lower = f"{path} {fn}".lower()
    if "modeloplossing" in fn_lower or "model solution" in fn_lower:
        status_suffix = "(Modeloplossing)"
    elif "oplossing" in fn_lower or "solution" in fn_lower or "opgelost" in fn_lower or "opls" in fn_lower:
        status_suffix = "(Oplossing)"
    elif "opgave" in fn_lower or "blanco" in fn_lower:
        status_suffix = "(Opgave)"
        
    title = ""
    
    if category_id == 2: # Examens
        if date_str:
            extra = ""
            if "theorie" in clean_name.lower():
                extra = " - Theorie"
            elif "oefeningen" in clean_name.lower():
                extra = " - Oefeningen"
            if "herexamen" in fn_lower or "2de zit" in fn_lower or "augustus" in fn_lower or "september" in fn_lower:
                extra = f"{extra} (Herexamen)"
            title = f"Examen {date_str}{extra}"
        elif "examenvragen" in clean_name.lower():
            title = clean_name
            if not title.lower().startswith("examenvragen"):
                title = f"Examenvragen - {title}"
        elif clean_name.lower().startswith("examen"):
            title = clean_name
        else:
            title = f"Examen {clean_name}"
            
        if status_suffix and status_suffix.lower() not in title.lower():
            title = f"{title} {status_suffix}"
            
    elif category_id == 5: # TTT's
        if date_str:
            title = f"TTT {date_str}"
        elif clean_name.lower().startswith("ttt"):
            title = clean_name
        elif "partieel" in clean_name.lower():
            title = f"Partieel Examen {clean_name}"
        else:
            title = f"TTT - {clean_name}"
            
        if status_suffix and status_suffix.lower() not in title.lower():
            title = f"{title} {status_suffix}"
            
    elif category_id == 4: # Oefenzittingen
        if any(clean_name.lower().startswith(p) for p in ["oefenzitting", "oefening", "huiswerk", "opdracht", "p&o", "verslag", "bundel", "toolbox", "werkboek"]):
            title = clean_name
        else:
            title = f"Oefenzitting - {clean_name}"
            
        if status_suffix and status_suffix.lower() not in title.lower():
            title = f"{title} {status_suffix}"
            
    elif category_id == 3: # Samenvattingen
        if any(clean_name.lower().startswith(p) for p in ["samenvatting", "summary", "lesnotities", "formularium", "stappenplan", "overzicht", "typedetail"]):
            title = clean_name
        else:
            title = f"Samenvatting - {clean_name}"
            
    elif category_id == 6: # Slides
        if clean_name.lower().startswith("slides"):
            title = clean_name
        else:
            title = f"Slides - {clean_name}"
            
    elif category_id == 7: # Labo & Code
        if clean_name.lower().startswith("labo"):
            title = clean_name
        else:
            title = f"Labo - {clean_name}"
            
    # Polish title formatting
    t = re.sub(r'^(Examen\s+)+', 'Examen ', title, flags=re.I)
    t = re.sub(r'^(Oefenzitting\s+)+', 'Oefenzitting ', t, flags=re.I)
    t = re.sub(r'^(Samenvatting\s+)+', 'Samenvatting ', t, flags=re.I)
    t = re.sub(r'^(Slides\s+)+', 'Slides ', t, flags=re.I)
    t = re.sub(r'^(TTT\s+)+', 'TTT ', t, flags=re.I)
    t = re.sub(r'^(Labo\s+)+', 'Labo ', t, flags=re.I)
    t = re.sub(r'^(Examenvragen\s+)+', 'Examenvragen ', t, flags=re.I)
    
    t = re.sub(r'\s*\((Oplossing|Modeloplossing|Opgave)\)\s*\((?:Oplossing|Modeloplossing|Opgave)\)', r' (\1)', t, flags=re.I)
    
    if author:
        escaped_author = re.escape(author)
        t = re.sub(rf'\s*\({escaped_author}\)', '', t, flags=re.I)
        t = re.sub(rf'\b{escaped_author}\b', '', t, flags=re.I)
        t = " ".join(t.split())
        t = f"{t} ({author})"
        
    t = re.sub(r'\s+', ' ', t).strip()
    if len(t) > 200:
        t = t[:197] + "..."
        
    return t

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
            parent = (
                r.get('repo_name', ''),
                r.get('course_id'),
                os.path.dirname(r.get('path', '')),
            )
            folder_images[parent].append(r)
            
    for parent, imgs in folder_images.items():
        if len(imgs) >= 3:
            def natural_sort_key(rec):
                fn = rec.get('filename', '')
                nums = re.findall(r'\d+', fn)
                return (int(nums[0]) if nums else 0, fn)
                
            sorted_imgs = sorted(imgs, key=natural_sort_key)
            total = len(sorted_imgs)
            
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

def resolve_course_collisions(records_in_course):
    """Resolves any colliding display_titles within the same course."""
    title_counts = Counter(r['display_title'] for r in records_in_course)
    seen_titles = defaultdict(int)

    for r in records_in_course:
        t = r['display_title']
        if title_counts[t] > 1:
            seen_titles[t] += 1
            idx = seen_titles[t]
            if idx > 1:
                r['display_title'] = f"{t} ({idx})"

def process_course_batch(course_payload):
    cc = course_payload["course_code"]
    cname = course_payload["course_name"]
    cid = course_payload.get("course_id")
    docs = course_payload["documents"]
    
    resolve_photo_sequences(docs)
    
    normalized_list = []
    for d in docs:
        cat_id = detect_category(d)
        author = extract_author_from_record(d)
        year = extract_academic_year(d)
        tags = extract_tags(d, cat_id, year, author)
        
        if '_photo_sequence_title' in d:
            title = d['_photo_sequence_title']
            if author and f"({author})" not in title:
                title = f"{title} ({author})"
        else:
            title = generate_canonical_title(d, cat_id, year, author, cc)
            
        entry = {
            "file_id": d.get("file_id"),
            "display_title": title,
            "category_id": cat_id,
            "year": year,
            "author": author,
            "tags": tags
        }
        normalized_list.append(entry)
        
    resolve_course_collisions(normalized_list)
    return normalized_list

def run_cluster_1():
    print("=== STARTING CLUSTER 1 (BACHELOR CORE) NORMALIZATION ===")
    with open("migration_data/clusters/cluster_1.json", "r", encoding="utf-8") as f:
        cluster_info = json.load(f)
        
    courses = cluster_info["courses"]
    print(f"Total courses to normalize in Cluster 1: {len(courses)}")
    
    os.makedirs("migration_data/batches", exist_ok=True)
    os.makedirs("migration_data/cluster_outputs", exist_ok=True)
    
    all_cluster_docs = []
    total_docs_processed = 0
    total_years_set = 0
    total_authors_set = 0
    cat_counts = Counter()
    
    for c in courses:
        cc = c["course_code"]
        cname = c["course_name"]
        payload_file = f"migration_data/course_payloads/{cc}.json"
        
        with open(payload_file, "r", encoding="utf-8") as pf:
            payload = json.load(pf)
            
        normalized_batch = process_course_batch(payload)
        
        batch_out_file = f"migration_data/batches/{cc}.json"
        with open(batch_out_file, "w", encoding="utf-8") as bf:
            json.dump(normalized_batch, bf, indent=2, ensure_ascii=False)
            
        all_cluster_docs.extend(normalized_batch)
        total_docs_processed += len(normalized_batch)
        
        for doc in normalized_batch:
            if doc.get("year"):
                total_years_set += 1
            if doc.get("author"):
                total_authors_set += 1
            cat_counts[doc.get("category_id")] += 1
            
        print(f"✓ [{cc}] {cname:<42} -> {len(normalized_batch):>3} docs normalized")
        
    cluster_out_file = "migration_data/cluster_outputs/cluster_1_output.json"
    with open(cluster_out_file, "w", encoding="utf-8") as cf:
        json.dump(all_cluster_docs, cf, indent=2, ensure_ascii=False)
        
    print("\n" + "=" * 65)
    print("=== CLUSTER 1 NORMALIZATION COMPLETED SUCCESSFULLY ===")
    print("=" * 65)
    print(f"Total documents processed: {total_docs_processed}")
    print(f"Academic years extracted:  {total_years_set} ({round(total_years_set/total_docs_processed*100, 1)}%)")
    print(f"Student authors extracted: {total_authors_set} ({round(total_authors_set/total_docs_processed*100, 1)}%)")
    print("\nCategory Distribution:")
    for cat_id, name in [(2, "Examens"), (3, "Samenvattingen"), (4, "Oefenzittingen"), (5, "TTT's"), (6, "Slides / Lesmateriaal"), (7, "Labo & Code")]:
        print(f"  Category {cat_id} ({name:<22}): {cat_counts[cat_id]:>4} docs")
    print(f"\nSaved aggregated output to: {cluster_out_file}")

if __name__ == '__main__':
    run_cluster_1()
