#!/usr/bin/env python3
"""
cluster_2_normalizer.py
Lead LLM Normalizer & Archivist for Cluster 2: Mechanical & Aero (WTK, Mechatronics, Aerospace).
Covers 36 courses and 3,598 documents with deep intelligence.
"""

import json
import os
import re
from collections import Counter, defaultdict

VOCAB_FILE = "migration_data/tag_vocabulary.json"

# Load tag vocabulary
with open(VOCAB_FILE, "r", encoding="utf-8") as f:
    VOCAB_DATA = json.load(f)

ALLOWED_TAGS = set()
for g_tags in VOCAB_DATA.get("groups", {}).values():
    ALLOWED_TAGS.update(g_tags)

TAG_ALIASES = dict(VOCAB_DATA.get("aliases", {}))
REDUNDANT_IN_CATEGORY = {
    int(cat_id): set(tags)
    for cat_id, tags in VOCAB_DATA.get("redundant_in_category", {}).items()
}

PROFESSORS = [
    "vandepitte", "indekeu", "dejaeger", "desmet", "sas", "swevers", "lauwers",
    "kruth", "pintelon", "meyers", "d'haeseleer", "dhaeseleer", "mark huyse",
    "huyse", "belis", "student 043", "creemers", "van der perre", "van bael",
    "blanpain", "vleugels", "degrande", "dirk vandepitte", "wim desmet",
    "jan swevers", "bert lauwer", "johan meyers", "william dhaeseleer",
    "sterckx", "keldermans", "gantois", "verbelen", "deconinck", "vanderperre",
    "wim dehaene", "georges gielen", "mertens", "sergio portoles", "sergio portolés",
    "p. fisette", "fisette", "h. bruyninckx", "bruyninckx", "j. de schutter", "de schutter"
]

NON_AUTHORS = {
    'empty', 'leeg', 'blanco', 'blank', 'oplossing', 'oplossingen', 'opgave',
    'opgaven', 'solution', 'solutions', 'antwoorden', 'vragen', 'questions',
    'theorie', 'theory', 'copy', 'kopie', 'final', 'nieuw', 'new', 'oud', 'old',
    'herexamen', 'examen', 'exam', 'deel', 'part', 'nl', 'en', 'eng', 'engels',
    'english', 'dutch', 'scan', 'handgeschreven', 'slides', 'code', 'script',
    'onbekend', 'unknown', 'student', 'anoniem', 'anonymous', 'praktisch',
    'samenvatting', 'formularium', 'verslag', 'notities', 'leidingen', 'straling',
    'convectie', 'warmtewisselaars', 'geleiding', 'updated', 'update', 'net',
    'dropbox', 'vtk', 'wiki', 'drive', 'toledo', 'facebook', 'cursus', 'oefenzitting',
    'oefenzittingen', 'oefeningen', 'oefening', 'opgaven', 'bundel', 'vraag',
    'in kleur', 'kleur', 'afbeeldingen', 'extra', 'extraoefn', 'oefn'
}

MONTH_MAP = {
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

def clean_whitespace(text):
    if not text:
        return ""
    return " ".join(str(text).strip().split())

def canonicalize_tag(tag):
    t = clean_whitespace(tag)
    if not t:
        return None
    t = TAG_ALIASES.get(t, t)
    if t in ALLOWED_TAGS:
        return t
    if re.match(r"^Deel ([1-9]|1[0-9])$", t):
        return t
    return None

def extract_author(record):
    """Extracts genuine student author, rejecting professors, TAs, and status tokens."""
    fn = record.get("filename", "")
    path = record.get("path", "")
    preview = record.get("content_preview") or {}
    p1 = preview.get("page1_text") or ""
    full_str = f"{path} {fn} {p1}"

    if any(k in full_str.lower() for k in ['take home', 'take-home', 'evaluatie opdracht', 'inleveropdracht']):
        return None

    known_authors = [
        ("Student 033", ["student 033", "student_033"]),
        ("Student 053", ["student 053", "student_053"]),
        ("Student 083", ["student 083", "student_083", "student 083l", "student_083l"]),
        ("Student 065", ["student 065", "student065", "student 066", "student_065"]),
        ("Student 114", ["student 114", "student 114", "thibaud van_elsué", "student_114", "student 114"]),
        ("Student 039", ["student 039", "student_039"]),
        ("Student 104", ["student 104", "student_104"]),
        ("Student 040", ["student 040", "student_040"]),
        ("Student 041", ["student 041", "student_041"]),
        ("Student 072", ["student 072", "student_072"]),
        ("Student 063", ["student 063", "student_063"]),
        ("Student 108", ["student 108", "student_108"]),
        ("Student 045", ["student 045", "jilmen quintiens"]),
        ("Student 077", ["student 077", "student_077"]),
        ("Student 133", ["student 133"]),
        ("Student 118", ["student 118"]),
        ("Student 069", ["student 069"]),
        ("Student 092", ["student 092"]),
        ("Student 105", ["student 105"]),
        ("Student 037", ["student 037"]),
        ("Student 125", ["student 125"]),
        ("Student 126", ["student 126"]),
        ("Student 080", ["student 080"]),
        ("Student 036", ["student 036"]),
        ("Student 087", ["student 087"]),
        ("Student 048", ["student 048"]),
        ("Student 024", ["student 024"]),
        ("Student 016", ["student 016"]),
        ("Student 060", ["student 060"]),
        ("Student 009", ["student 009"]),
        ("Student 121", ["student 121"]),
        ("Student 136", ["student 136", "student136"]),
        ("Student 054", ["student 054", "student_054"]),
        ("Student 088", ["student 088"]),
        ("Student 056", ["student 056"]),
        ("Student 022", ["student 022"]),
        ("Student 044", ["student 044"]),
        ("Student 099", ["student 099"]),
        ("Student 129", ["student 129"]),
        ("Student 078", ["student 078"]),
        ("Student 004", ["student 004"]),
        ("Student 011", ["student 011"]),
        ("Student 073", ["student 073"]),
        ("Student 090", ["student 090"]),
        ("Student 131", ["student 131"]),
        ("Student 093", ["student 093"]),
        ("Student 028", ["student 028"]),
        ("Student 109", ["student 109"]),
        ("Student 097", ["student 097"]),
        ("Student 010", ["student 010"]),
        ("Student 067", ["student 067"]),
        ("Student 100", ["student 100"]),
        ("Student 095", ["student 095", "segers roald"]),
        ("Student 075", ["student 075"]),
        ("Student 071", ["student 071"]),
        ("Student 132", ["student 132"]),
        ("Student 076", ["student 076"]),
        ("Student 127", ["student 127"]),
        ("Student 138", ["student 138"]),
        ("Student 026", ["student 026", "student-026"]),
        ("Student 017", ["student 017"]),
        ("Student 012", ["student 012", "student012"]),
        ("Student 023", ["student 023", "student 023"]),
        ("Student 116", ["student 116", "student_116", "student 116"]),
        ("Student 025", ["student 025", "student_025"]),
        ("Student 124", ["student124", "student 124"]),
        ("Student 123", ["student 123", "student_123"]),
        ("Student 018", ["student 018"]),
        ("Caro", ["(caro)", "oplossing caro", "_caro"]),
        ("Eveline", ["opl eveline", "(eveline)"]),
        ("Milan", ["milan 2022-2023", "oz bouwmechanica milan"]),
        ("Kobe", ["examenvragen kobe", "(kobe)"]),
        ("Jeroen", ["notasjeroen", "notas jeroen"]),
        ("Oscar", ["samenvatting oscar", "- oscar.pdf", "oscar.pdf"]),
        ("Dries", ["nota's dries"]),
        ("Student 061", ["student 061", "student_061"]),
        ("Laurens", ["(laurens)"]),
        ("Snoekie", ["(snoekie)"])
    ]

    fn_path_lower = f"{path} {fn}".lower()
    for canonical_name, aliases in known_authors:
        for alias in aliases:
            if alias in fn_path_lower or (len(alias) > 5 and alias in p1.lower()):
                if not any(prof in canonical_name.lower() for prof in PROFESSORS):
                    return canonical_name

    m = re.search(r'\((?:door\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\)', fn)
    if m:
        candidate = m.group(1).strip()
        cand_lower = candidate.lower()
        if cand_lower not in NON_AUTHORS and not any(part in NON_AUTHORS for part in cand_lower.split()):
            if not any(prof in cand_lower for prof in PROFESSORS):
                return candidate

    return None

def extract_academic_year(record):
    """Extracts verified academic year YYYY - YYYY or null."""
    fn = record.get("filename", "")
    path = record.get("path", "")
    preview = record.get("content_preview") or {}
    p1 = preview.get("page1_text") or ""
    fb = preview.get("fallback_text") or ""
    full_text = f"{path} {fn} {p1} {fb}"

    m_vanaf = re.search(r'\b(?:vanaf|sinds|from|post[-_]?)\s*(\d{4})\s*[-_/]\s*(\d{2,4})\b', full_text, re.IGNORECASE)
    if m_vanaf:
        y1 = int(m_vanaf.group(1))
        if 1990 <= y1 <= 2025:
            return f"{y1} - {y1+1}"

    m_vanaf_s = re.search(r'\b(?:vanaf|sinds|from|post[-_]?)\s*(\d{4})\b', full_text, re.IGNORECASE)
    if m_vanaf_s:
        y1 = int(m_vanaf_s.group(1))
        if 1990 <= y1 <= 2025:
            return f"{y1} - {y1+1}"

    m_voor = re.search(r'\b(?:voor|pre[-_]?|before)\s*(\d{4})\b', full_text, re.IGNORECASE)
    if m_voor:
        y = int(m_voor.group(1))
        if 1990 <= y <= 2026:
            return f"{y-1} - {y}"

    m_tot = re.search(r'\b(?:tot|t/m)\s*(\d{4})\b', full_text, re.IGNORECASE)
    if m_tot:
        y = int(m_tot.group(1))
        if 1990 <= y <= 2025:
            return f"{y} - {y+1}"

    m_span = re.search(r'\b(19\d\d|20[0-2]\d)\s*[-_/]\s*(19\d\d|20[0-2]\d)\b', full_text)
    if m_span:
        y1, y2 = int(m_span.group(1)), int(m_span.group(2))
        if y2 == y1 + 1 and y1 <= 2025:
            return f"{y1} - {y2}"
        if y2 == (y1 % 100) + 1:
            return f"{y1} - {y1+1}"

    m_span2 = re.search(r'\b(19\d\d|20[0-2]\d)\s*[-_/]\s*(\d{2})\b', full_text)
    if m_span2:
        y1 = int(m_span2.group(1))
        y2_short = int(m_span2.group(2))
        if y2_short == (y1 + 1) % 100 and y1 <= 2025:
            return f"{y1} - {y1+1}"

    m_short_span = re.search(r'\b(?:\'|)?([0-2]\d)\s*[-_/]\s*(?:\'|)?([0-2]\d)\b', fn)
    if m_short_span:
        s1, s2 = int(m_short_span.group(1)), int(m_short_span.group(2))
        if s2 == s1 + 1:
            y1 = 2000 + s1 if s1 < 50 else 1900 + s1
            if y1 <= 2025:
                return f"{y1} - {y1+1}"

    # Complex date combinations e.g. "2021 09 en 16 juni" or "2018 06 18"
    m_complex_date = re.search(r'\b(20[0-2]\d)\s*(\d{1,2})?\s*(?:en\s*\d{1,2}\s*)?(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|jan|feb|mrt|apr|jun|jul|aug|sep|okt|nov|dec)\b', full_text, re.IGNORECASE)
    if m_complex_date:
        yr = int(m_complex_date.group(1))
        mo_str = m_complex_date.group(3).lower()
        if yr <= 2025:
            if mo_str in ['januari', 'jan', 'februari', 'feb', 'maart', 'mrt', 'april', 'apr', 'mei', 'juni', 'jun', 'juli', 'jul', 'augustus', 'aug', 'september', 'sep']:
                return f"{yr-1} - {yr}"
            else:
                return f"{yr} - {yr+1}"

    m_date = re.search(r'\b(\d{1,2})[-_.\s]+(januari|jan|februari|feb|maart|mrt|april|apr|mei|juni|jun|juli|jul|augustus|aug|september|sep|oktober|okt|november|nov|december|dec)[-_.\s]+(19\d\d|20[0-2]\d)\b', full_text, re.IGNORECASE)
    if m_date:
        m_str = m_date.group(2).lower()
        yr = int(m_date.group(3))
        if yr <= 2025 or (yr == 2026 and m_str in ['januari', 'jan']):
            if m_str in ['januari', 'jan', 'februari', 'feb', 'maart', 'mrt', 'april', 'apr', 'mei', 'juni', 'jun', 'juli', 'jul', 'augustus', 'aug', 'september', 'sep']:
                return f"{yr-1} - {yr}"
            else:
                return f"{yr} - {yr+1}"

    m_date_rev = re.search(r'\b(19\d\d|20[0-2]\d)[-_](0[1-9]|1[0-2])[-_](\d{1,2})\b', fn)
    if m_date_rev:
        yr = int(m_date_rev.group(1))
        mo = int(m_date_rev.group(2))
        if yr <= 2025:
            if mo <= 9:
                return f"{yr-1} - {yr}"
            else:
                return f"{yr} - {yr+1}"

    m_date_rev2 = re.search(r'\b(19\d\d|20[0-2]\d)\s*(0[1-9]|1[0-2])\s*(\d{1,2})\b', fn)
    if m_date_rev2:
        yr = int(m_date_rev2.group(1))
        mo = int(m_date_rev2.group(2))
        if yr <= 2025:
            if mo <= 9:
                return f"{yr-1} - {yr}"
            else:
                return f"{yr} - {yr+1}"

    m_compact = re.search(r'\b([0-3]\d)(0[1-9]|1[0-2])([0-2]\d)\b', fn)
    if m_compact:
        day = int(m_compact.group(1))
        mo = int(m_compact.group(2))
        yr_short = int(m_compact.group(3))
        if 1 <= day <= 31 and 1 <= mo <= 12:
            yr = 2000 + yr_short
            if yr <= 2025:
                if mo <= 9:
                    return f"{yr-1} - {yr}"
                else:
                    return f"{yr} - {yr+1}"

    m_my = re.search(r'\b(januari|jan|februari|feb|maart|mrt|april|apr|mei|juni|jun|juli|jul|augustus|aug|september|sep|oktober|okt|november|nov|december|dec)[-_.\s]+(19\d\d|20[0-2]\d)\b', full_text, re.IGNORECASE)
    if m_my:
        m_str = m_my.group(1).lower()
        yr = int(m_my.group(2))
        if yr <= 2025:
            if m_str in ['januari', 'jan', 'februari', 'feb', 'maart', 'mrt', 'april', 'apr', 'mei', 'juni', 'jun', 'juli', 'jul', 'augustus', 'aug', 'september', 'sep']:
                return f"{yr-1} - {yr}"
            else:
                return f"{yr} - {yr+1}"

    m_y = re.search(r'\b(20[0-2]\d)\b', f"{path} {fn}")
    if m_y:
        y = int(m_y.group(1))
        if 1990 <= y <= 2025:
            if 'examen' in path.lower() or 'examen' in fn.lower():
                return f"{y-1} - {y}"
            return f"{y} - {y+1}"

    return None

def detect_category_and_title(record, course_code, course_name, author, year):
    """
    Intelligently determines category_id (2-7), formats canonical display_title,
    and identifies tags.
    """
    fn = record.get("filename", "")
    path = record.get("path", "")
    ext = record.get("extension", "").lower()
    preview = record.get("content_preview") or {}
    p1 = preview.get("page1_text") or ""
    is_scanned = preview.get("is_scanned_handwritten", False)

    full_lower = f"{path} {fn} {p1}".lower()
    fn_lower = fn.lower()
    path_lower = path.lower()

    orig_cat = record.get("category_id", 3)
    category_id = orig_cat

    # 1. CATEGORY DETERMINATION
    if ext in ["m", "py", "java", "c", "cpp", "mlx", "mw"]:
        category_id = 7 # Labo & Code
    elif any(k in full_lower for k in ["tussentijdse toets", "midterm", "partieel examen", "ttt "]) or "/ttt" in path_lower or fn_lower.startswith("ttt"):
        category_id = 5 # TTT's
    elif (any(k in fn_lower for k in ["examen", "tentamen", "examenvraag", "examenvragen", "voorbeeldexamen", "proefexamen", "herkansing", "exam_"]) or
          "/examen" in path_lower or "/tentamen" in path_lower or "/exam" in path_lower) and not any(k in fn_lower for k in ["samenvatting", "slides", "lesnota", "oefenzitting", "oefening"]):
        category_id = 2 # Examens
    elif any(k in fn_lower for k in ["slides", "dia", "presentatie", "powerpoint", "lecture"]) or ext in ["ppt", "pptx"] or "/slides" in path_lower:
        if category_id != 2:
            category_id = 6 # Slides
    elif any(k in fn_lower for k in ["oefenzitting", "oefening", "oefz", "huiswerk", "hw", "problem", "exercise", "solutions fox&mcdonald", "oplossing oefening"]) or "/oefening" in path_lower or "/oefenzitting" in path_lower or "fox&mcdonald" in path_lower:
        if category_id != 2 and category_id != 7:
            category_id = 4 # Oefenzittingen
    elif any(k in fn_lower for k in ["samenvatting", "summary", "notities", "lesnotities", "synthese", "formularium", "formuleblad", "gids", "studiewijzer", "anki", "flashcards"]) or "/samenvatting" in path_lower or "/notities" in path_lower:
        category_id = 3 # Samenvattingen

    # Special course-level overrides
    if course_code == "H04T7A" and any(k in fn_lower for k in ["vraag ajm", "vraag ebm", "vraag ibm", "vraag lbm", "vraag pam", "vraagchm"]):
        category_id = 2 # Exam questions

    if category_id == 3:
        if re.search(r'\b(examen|tentamen)\s+(van\s+)?\d{1,2}\s+(januari|februari|juni|augustus|september)', p1, re.IGNORECASE) or 'naam :' in p1.lower() or 'punten per vraag' in p1.lower():
            if 'samenvatting' not in fn_lower and 'notities' not in fn_lower:
                category_id = 2

    # 2. TAGS EXTRACTION
    tags = []

    if is_scanned or ext in ["jpg", "jpeg", "png", "bmp", "heic"]:
        tags.append("Scan")

    if any(k in fn_lower for k in ["handgeschreven", "handwritten", "manueel", "eigen notities", "eigen nota", "eigen_nota"]):
        tags.append("Handgeschreven")
    elif any(k in p1.lower() for k in ["handgeschreven", "handwritten"]) and not any(k in p1.lower() for k in ["open boek", "rekenmachine", "examen duurt", "toegestaan"]):
        tags.append("Handgeschreven")
    elif "notities" in fn_lower and is_scanned and not any(k in p1.lower() for k in ["open boek", "rekenmachine", "faculteit ingenieurswetenschappen"]):
        if not any(k in fn_lower for k in ["slides", "powerpoint"]):
            tags.append("Handgeschreven")

    if ext in ["m", "mlx"] or "matlab" in full_lower:
        tags.append("MATLAB")
    elif ext == "py" or "python" in full_lower:
        tags.append("Python")
    elif ext == "java" or "java" in full_lower:
        tags.append("Java")
    elif ext in ["c", "cpp", "h", "hpp"] or "c++" in full_lower:
        tags.append("C / C++")
    elif ext in ["xlsx", "xls"] or "excel" in full_lower:
        tags.append("Excel")
    elif ext in ["mat", "csv", "dat"]:
        tags.append("Dataset / Data")

    # Precise session tags matching (avoid false month matches from days e.g. 08-06-2023)
    if any(k in fn_lower for k in ["januari", "jan", "1e zit", "eerste zit"]) or re.search(r'[-_]01[-_]', fn) or re.search(r'\b\d{1,2}[-_]01[-_]\d{2,4}\b', fn):
        tags.append("Januari")
    if any(k in fn_lower for k in ["juni", "jun", "2de examenperiode"]) or re.search(r'[-_]06[-_]', fn) or re.search(r'\b\d{1,2}[-_]06[-_]\d{2,4}\b', fn) or "2018 06 18" in fn:
        tags.append("Juni")
    if any(k in fn_lower for k in ["herexamen", "2de zit", "tweede zit", "augustus", "aug", "september", "sep"]) or re.search(r'\b\d{1,2}[-_](08|09)[-_]\d{2,4}\b', fn) or "2023 08 14" in fn:
        tags.append("Herexamen (2de zit)")
    if any(k in fn_lower for k in ["tussentijds", "midterm", "ttt"]):
        tags.append("Tussentijds (Midterm)")

    if any(k in fn_lower for k in ["modeloplossing", "modeloplossingen", "model solution", "uitgewerkt"]):
        tags.append("Modeloplossing")
    elif any(k in fn_lower for k in ["oplossing", "oplossingen", "solution", "solutions", "antwoorden", "opl", "antw"]):
        tags.append("Oplossing")
    elif any(k in fn_lower for k in ["opgave", "opgaven", "blanco", "blank", "vragenreeks"]):
        tags.append("Opgave (Blanco)")

    if any(k in fn_lower for k in ["formularium", "formules", "formuleblad", "formulas"]):
        tags.append("Formularium")
    if any(k in fn_lower for k in ["studiewijzer", "gids", "handleiding", "flashcards", "anki"]):
        tags.append("Studiewijzer / Gids")
    if any(k in fn_lower for k in ["lesnotities", "lesnota", "notities", "nota's"]):
        tags.append("Lesnotities")
    if any(k in fn_lower for k in ["verslag", "rapport", "project", "p&o"]):
        tags.append("Verslag / Project")
    if any(k in fn_lower for k in ["examenvragen", "examenvraag", "reconstructie", "vragen uit examens", "theorievragen", "oude examenvragen"]):
        tags.append("Reconstructie / Vragen")
    if any(k in fn_lower for k in ["examenoefeningen", "oefeningen uit examens", "vb examens"]):
        tags.append("Oefeningen (Examen)")
    if any(k in fn_lower for k in ["bundel", "alle oefeningen", "alle lessen"]):
        tags.append("Bundel / Alle")
    if any(k in fn_lower for k in ["meerkeuze", "multiple choice", "mc"]):
        tags.append("Meerkeuze")
    if any(k in fn_lower for k in ["mondeling"]):
        tags.append("Mondeling")
    if any(k in fn_lower for k in ["theorie", "theorievragen"]):
        tags.append("Theorie")

    if any(k in path_lower for k in ["master of", "core courses (", "option: aero", "option: automotive", "option: manufacturing", "soil mechanics", "numerical modelling", "mechanical drive systems", "fluid mechanics", "heat transfer"]):
        tags.append("English")
    elif any(k in fn_lower for k in ["summary", "problem", "solution", "exam", "lecture", "exercises"]):
        tags.append("English")

    m_deel = re.search(r'\b(?:deel|part|les|hoofdstuk|chapter|ch|oz|oefenzitting)\s*([1-9]|1[0-9])\b', fn_lower)
    if m_deel:
        tags.append(f"Deel {m_deel.group(1)}")

    tags.append("old-burgieclan")

    display_title = derive_canonical_title(record, category_id, course_code, course_name, author, year, full_lower)

    clean_tags = []
    redundant = REDUNDANT_IN_CATEGORY.get(category_id, set())
    for t in tags:
        ct = canonicalize_tag(t)
        if ct and ct not in redundant and ct not in clean_tags:
            clean_tags.append(ct)

    return display_title, category_id, clean_tags

def derive_canonical_title(record, category_id, course_code, course_name, author, year, full_lower):
    """Formats standardized human-readable display title following templates."""
    fn = record.get("filename", "")
    path = record.get("path", "")
    ext = record.get("extension", "").lower()
    name_no_ext = re.sub(r'\.[a-zA-Z0-9]+$', '', fn).strip()

    name_clean = re.sub(rf'^{course_code}\s*[-_:]\s*', '', name_no_ext, flags=re.IGNORECASE).strip()
    name_clean = re.sub(r'[_.\-]+', ' ', name_clean).strip()
    name_clean = clean_whitespace(name_clean)

    prof_title = ""
    for p in PROFESSORS:
        if p in fn.lower() or p in path.lower():
            p_cap = " ".join(part.capitalize() for part in p.split())
            if not p_cap.startswith("Prof."):
                prof_title = f"(Prof. {p_cap})"
            else:
                prof_title = f"({p_cap})"
            break

    sol_suffix = ""
    if "modeloplossing" in name_clean.lower():
        sol_suffix = "(Modeloplossing)"
    elif "oplossing" in name_clean.lower() or "solution" in name_clean.lower() or "antwoorden" in name_clean.lower():
        sol_suffix = "(Oplossing)"
    elif "opgave" in name_clean.lower() or "blanco" in name_clean.lower():
        sol_suffix = "(Opgave)"

    if "fox&mcdonald" in path.lower() or "fox & mcdonald" in path.lower() or "fox&mcdonald" in fn.lower():
        m_prob = re.search(r'Problem\s*(\d+)[._](\d+)', fn, re.IGNORECASE)
        if m_prob:
            ch_num = m_prob.group(1)
            prob_num = m_prob.group(2)
            return f"Fox & McDonald Hoofdstuk {ch_num} - Problem {ch_num}.{prob_num} (Oplossing)"
        return f"Fox & McDonald - {name_clean} (Oplossing)"

    if '_photo_sequence_title' in record:
        return record['_photo_sequence_title']

    # Specific topic overrides
    if course_code == "H04T7A":
        if "vraag ajm" in fn.lower(): return "Examenvraag AJM (Abrasive Jet Machining)"
        if "vraag ebm" in fn.lower(): return "Examenvraag EBM (Electron Beam Machining)"
        if "vraag ibm" in fn.lower(): return "Examenvraag IBM (Ion Beam Machining)"
        if "vraag lbm" in fn.lower(): return "Examenvraag LBM (Laser Beam Machining)"
        if "vraag pam" in fn.lower(): return "Examenvraag PAM (Plasma Arc Machining)"
        if "vraagchm" in fn.lower() or "vraag chm" in fn.lower(): return "Examenvraag CHM (Chemical Machining)"
        if "ecm" in fn.lower() and "korsluit" in fn.lower(): return "Oefening ECM Kortsluitprobleem"

    if course_code == "H01N0A":
        if "sv01-mobiliteit" in fn: return f"Samenvatting Deel 1 - Mobiliteit en Kinematisch Model ({author})" if author else "Samenvatting Deel 1 - Mobiliteit en Kinematisch Model"
        if "sv02-kinematische" in fn: return f"Samenvatting Deel 2 - Kinematische Analyse van Vlakke Stangenmechanismes ({author})" if author else "Samenvatting Deel 2 - Kinematische Analyse van Vlakke Stangenmechanismes"
        if "sv03-dynamische" in fn: return f"Samenvatting Deel 3 - Dynamische Analyse van Kruk-Drijfstangmechanismes ({author})" if author else "Samenvatting Deel 3 - Dynamische Analyse van Kruk-Drijfstangmechanismes"
        if "sv04-bewegingsvergelijkingen" in fn: return f"Samenvatting Deel 4 - Bewegingsvergelijkingen ({author})" if author else "Samenvatting Deel 4 - Bewegingsvergelijkingen"
        if "sv05-nokken" in fn: return f"Samenvatting Deel 5 - Nok-Volgersystemen ({author})" if author else "Samenvatting Deel 5 - Nok-Volgersystemen"
        if "sv04-aanvulling-eig" in fn: return "Samenvatting Deel 4 - Aanvulling Eigenschappen Bewegingswetten"
        if "sv04-aanvulling-vb" in fn: return "Samenvatting Deel 4 - Aanvulling Kloomok & Muffley"

    if course_code == "H04T5A":
        if "kruth" in fn.lower(): return "Lesnotities Gevorderde Verspanende Technieken - Deel Kruth (Prof. Kruth) (Jeroen)"
        if "lauwers" in fn.lower(): return "Lesnotities Gevorderde Verspanende Technieken - Deel Lauwers (Prof. Lauwers) (Jeroen)"
    if course_code == "H04T1A":
        if "dimensionele" in fn.lower(): return "Lesnotities Dimensionele Meettechniek (Jeroen)"
    if course_code == "H04X3A":
        return "Lesnotities Regeltechniek (Dries)"
    if course_code == "H0A15A":
        return "Examenvoorbereiding - Virtuele Productontwikkeling"

    # Extract date string
    date_str = ""
    # "2018 06 18" or "2023 08 14"
    m_d_rev_num = re.search(r'\b(20[0-2]\d)\s*(0[1-9]|1[0-2])\s*(\d{1,2})\b', fn)
    if m_d_rev_num:
        y = m_d_rev_num.group(1)
        m = MONTH_MAP.get(m_d_rev_num.group(2), m_d_rev_num.group(2))
        d = str(int(m_d_rev_num.group(3)))
        date_str = f"{d} {m} {y}"

    # "2021 09 en 16 juni" or "2022 18 en 11 juni"
    if not date_str:
        m_d_pair = re.search(r'\b(20[0-2]\d)\s*(\d{1,2})\s*(?:en|&)\s*(\d{1,2})\s*(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|jan|feb|mrt|apr|jun|jul|aug|sep|okt|nov|dec)\b', fn, re.IGNORECASE)
        if m_d_pair:
            y = m_d_pair.group(1)
            d1 = str(int(m_d_pair.group(2)))
            d2 = str(int(m_d_pair.group(3)))
            m = MONTH_MAP.get(m_d_pair.group(4).lower(), m_d_pair.group(4).capitalize())
            date_str = f"{min(int(d1), int(d2))} & {max(int(d1), int(d2))} {m} {y}"

    # "2020 11juni" or "2024 15 juni" or "2024 8 juni"
    if not date_str:
        m_d_rev = re.search(r'\b(20[0-2]\d)\s*(\d{1,2})\s*(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|jan|feb|mrt|apr|jun|jul|aug|sep|okt|nov|dec)\b', name_clean, re.IGNORECASE)
        if m_d_rev:
            y = m_d_rev.group(1)
            d = str(int(m_d_rev.group(2)))
            m = MONTH_MAP.get(m_d_rev.group(3).lower(), m_d_rev.group(3).capitalize())
            date_str = f"{d} {m} {y}"

    # "14jan2015" or "9jan2015" or "12jan2015" or "06juni2016"
    if not date_str:
        m_d_concat = re.search(r'\b(\d{1,2})(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|jan|feb|mrt|apr|jun|jul|aug|sep|okt|nov|dec)(19\d\d|20[0-2]\d)\b', fn, re.IGNORECASE)
        if m_d_concat:
            d = str(int(m_d_concat.group(1)))
            m = MONTH_MAP.get(m_d_concat.group(2).lower(), m_d_concat.group(2).capitalize())
            y = m_d_concat.group(3)
            date_str = f"{d} {m} {y}"

    # "19 Juni 2017" or "19.06.2017" or "19-06-2017"
    if not date_str:
        m_d1 = re.search(r'\b(\d{1,2})\s*(januari|jan|februari|feb|maart|mrt|april|apr|mei|juni|jun|juli|jul|augustus|aug|september|sep|oktober|okt|november|nov|december|dec)\s*(19\d\d|20[0-2]\d)\b', name_clean, re.IGNORECASE)
        if m_d1:
            d = m_d1.group(1)
            m = MONTH_MAP.get(m_d1.group(2).lower(), m_d1.group(2).capitalize())
            y = m_d1.group(3)
            date_str = f"{d} {m} {y}"

    if not date_str:
        m_d2 = re.search(r'\b(19\d\d|20[0-2]\d)[-_](0[1-9]|1[0-2])[-_](\d{1,2})\b', fn)
        if m_d2:
            y = m_d2.group(1)
            m = MONTH_MAP.get(m_d2.group(2), m_d2.group(2))
            d = str(int(m_d2.group(3)))
            date_str = f"{d} {m} {y}"

    if not date_str:
        m_d2b = re.search(r'\b(\d{1,2})[-_.](0[1-9]|1[0-2])[-_.](19\d\d|20[0-2]\d)\b', fn)
        if m_d2b:
            d = str(int(m_d2b.group(1)))
            m = MONTH_MAP.get(m_d2b.group(2), m_d2b.group(2))
            y = m_d2b.group(3)
            date_str = f"{d} {m} {y}"

    if not date_str:
        m_compact_m = re.search(r'\b(jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)([0-2]\d)\b', fn, re.IGNORECASE)
        if m_compact_m:
            m = MONTH_MAP.get(m_compact_m.group(1).lower(), m_compact_m.group(1).capitalize())
            y = str(2000 + int(m_compact_m.group(2)))
            date_str = f"{m} {y}"

    if not date_str:
        m_d3 = re.search(r'\b(januari|jan|februari|feb|maart|mrt|april|apr|mei|juni|jun|juli|jul|augustus|aug|september|sep|oktober|okt|november|nov|december|dec)\s*(19\d\d|20[0-2]\d)\b', name_clean, re.IGNORECASE)
        if m_d3:
            m = MONTH_MAP.get(m_d3.group(1).lower(), m_d3.group(1).capitalize())
            y = m_d3.group(2)
            date_str = f"{m} {y}"

    if not date_str:
        m_compact = re.search(r'\b([0-3]\d)(0[1-9]|1[0-2])([0-2]\d)\b', fn)
        if m_compact:
            d = str(int(m_compact.group(1)))
            m = MONTH_MAP.get(m_compact.group(2), m_compact.group(2))
            y = str(2000 + int(m_compact.group(3)))
            date_str = f"{d} {m} {y}"

    clean_core = re.sub(r'^(?:examen|examens|examenvragen|examenvraag|tentamen|samenvatting|samenvattingen|oefenzitting|oefenzittingen|oefeningen|oefening|slides|dia|labo|ttt)\s*[-:]?\s*', '', name_clean, flags=re.IGNORECASE).strip()
    clean_core = re.sub(r'\b(oplossing|opgave|modeloplossing)\b', '', clean_core, flags=re.IGNORECASE).strip()
    clean_core = re.sub(r'\s*\(\s*\)', '', clean_core).strip()

    # Category 2: EXAMS
    if category_id == 2:
        title_core = "Examen"
        if "examenvragen" in name_clean.lower() or "examenvraag" in name_clean.lower():
            title_core = "Examenvragen"

        is_herexamen = "herexamen" in name_clean.lower() or "2de zit" in name_clean.lower() or "tweede zit" in name_clean.lower()
        herexamen_tag = "(Herexamen)" if is_herexamen and "herexamen" not in date_str.lower() else ""

        m_part = re.search(r'\b(?:deel|part)\s*([1-9]|1[0-9])\b', name_clean, re.IGNORECASE)
        part_str = f"- Deel {m_part.group(1)}" if m_part else ""

        topic = ""
        m_topic = re.search(r'(?:korte vragen|theorie|oefeningen|vraag\s*\d+(?:\s*(?:en|&)\s*\d+)?|sterkteleer|dynamica|kinetostatica)', name_clean, re.IGNORECASE)
        if m_topic:
            topic = f"- {m_topic.group(0).capitalize()}"

        if date_str:
            title = f"{title_core} {date_str} {part_str} {topic} {herexamen_tag} {sol_suffix}".strip()
        elif year:
            title = f"{title_core} {year} {part_str} {topic} {herexamen_tag} {sol_suffix}".strip()
        else:
            title = f"{title_core} - {clean_core}" if clean_core else f"{title_core} {name_clean}"

        return clean_title_formatting(title, author, prof_title)

    # Category 4: EXERCISES & HOMEWORK
    elif category_id == 4:
        if "p&o" in name_clean.lower() or "project" in name_clean.lower() or "verslag" in name_clean.lower():
            title = f"Project Verslag - {clean_core or name_clean}"
        elif "huiswerk" in name_clean.lower() or "hw" in name_clean.lower():
            m_hw = re.search(r'\b(?:huiswerk|hw)\s*(\d+)\b', name_clean, re.IGNORECASE)
            hw_num = f" {m_hw.group(1)}" if m_hw else ""
            title = f"Huiswerk{hw_num} - {clean_core or name_clean} {sol_suffix}"
        elif "bundel" in name_clean.lower() or "alle oefeningen" in name_clean.lower():
            title = f"Bundel Oefeningen - {clean_core or name_clean} {sol_suffix}"
        else:
            m_oz = re.search(r'\b(?:oefenzitting|oefz|oz|les|hf|hoofdstuk|chapter)\s*(\d+)\b', name_clean, re.IGNORECASE)
            oz_num = f" {m_oz.group(1)}" if m_oz else ""
            # Strip redundant oz mentions in core
            clean_core_oz = re.sub(r'\b(?:oz|oefz|oefenzitting)\s*\d+\b', '', clean_core, flags=re.IGNORECASE).strip()
            clean_core_oz = re.sub(r'^\s*[-:]\s*', '', clean_core_oz).strip()
            if clean_core_oz:
                title = f"Oefenzitting{oz_num} - {clean_core_oz} {sol_suffix}"
            else:
                title = f"Oefenzitting{oz_num} {sol_suffix}".strip()

        return clean_title_formatting(title, author, prof_title)

    # Category 3: SUMMARIES & NOTES
    elif category_id == 3:
        if "formularium" in name_clean.lower() or "formules" in name_clean.lower():
            title = f"Formularium - {clean_core or name_clean}"
        elif "studiewijzer" in name_clean.lower() or "gids" in name_clean.lower() or "handleiding" in name_clean.lower():
            title = f"Studiewijzer - {clean_core or name_clean}"
        elif "anki" in name_clean.lower() or "flashcards" in name_clean.lower():
            title = f"Anki Flashcards - {clean_core or name_clean}"
        elif "lesnotities" in name_clean.lower() or "lesnota" in name_clean.lower() or "notities" in name_clean.lower():
            title = f"Lesnotities - {clean_core or name_clean}"
        else:
            m_part = re.search(r'\b(?:deel|part|hf|hoofdstuk|chapter|les)\s*([1-9]|1[0-9])\b', name_clean, re.IGNORECASE)
            part_str = f"Deel {m_part.group(1)} - " if m_part else ""
            title = f"Samenvatting {part_str}{clean_core or name_clean}"

        return clean_title_formatting(title, author, prof_title)

    # Category 5: TTT's
    elif category_id == 5:
        m_ttt = re.search(r'\bttt\s*(\d+)\b', name_clean, re.IGNORECASE)
        ttt_num = f" {m_ttt.group(1)}" if m_ttt else ""
        if date_str:
            title = f"TTT{ttt_num} {date_str} {sol_suffix}"
        elif year:
            title = f"TTT{ttt_num} ({year}) {sol_suffix}"
        else:
            title = f"TTT{ttt_num} - {clean_core or name_clean} {sol_suffix}"
        return clean_title_formatting(title, author, prof_title)

    # Category 6: SLIDES
    elif category_id == 6:
        m_les = re.search(r'\b(?:les|hoofdstuk|chapter|ch|deel)\s*(\d+)\b', name_clean, re.IGNORECASE)
        les_str = f"Les {m_les.group(1)} - " if m_les else ""
        title = f"Slides {les_str}{clean_core or name_clean}"
        return clean_title_formatting(title, None, prof_title)

    # Category 7: LABO & CODE
    elif category_id == 7:
        if date_str:
            title = f"Labo {date_str} - {clean_core or name_clean} ({tags_lang(ext)})" if tags_lang(ext) else f"Labo {date_str} - {clean_core or name_clean}"
        else:
            lang_str = f"({tags_lang(ext)})" if tags_lang(ext) else ""
            title = f"Labo - {clean_core or name_clean} {lang_str}"
        return clean_title_formatting(title, author, prof_title)

    title = f"{name_clean}"
    return clean_title_formatting(title, author, prof_title)

def tags_lang(ext):
    if ext in ["m", "mlx"]: return "MATLAB"
    if ext == "py": return "Python"
    if ext == "java": return "Java"
    if ext in ["c", "cpp"]: return "C / C++"
    return ""

def clean_title_formatting(title, author, prof_title):
    t = clean_whitespace(title)
    
    t = re.sub(r'^(Examen|Examenvragen|Samenvatting|Oefenzitting|Slides|Labo|TTT)\s*[-:]?\s*(Examen|Examenvragen|Samenvatting|Oefenzitting|Slides|Labo|TTT)\b', r'\1', t, flags=re.IGNORECASE)
    t = re.sub(r'\b(oplossing|opgave|modeloplossing)\s*\(\1\)', r'(\1)', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*\(\s*\)', '', t)
    
    if author:
        author_compact = author.replace(" ", "").lower()
        t = re.sub(rf'\({re.escape(author_compact)}\)', '', t, flags=re.IGNORECASE)
        t = re.sub(rf'\b{re.escape(author_compact)}\b', '', t, flags=re.IGNORECASE)
        t = re.sub(rf'\({re.escape(author)}\)', '', t, flags=re.IGNORECASE)
        t = clean_whitespace(t)

    t = re.sub(r'[-–—]\s*[-–—]', '-', t)
    t = re.sub(r'\s*-\s*-\s*', ' - ', t)
    t = re.sub(r'\s{2,}', ' ', t).strip()

    if prof_title and prof_title.lower() not in t.lower():
        t = f"{t} {prof_title}"

    if author and f"({author})" not in t:
        t = f"{t} ({author})"

    t = re.sub(r'\(\s*\)', '', t)
    t = re.sub(r'\s{2,}', ' ', t).strip()
    return t

def sanitize_dedup_suffixes(text):
    text = re.sub(r'\s*\(\d+\)\s*$', '', text)
    text = re.sub(r'_\(\d+\)$', '', text)
    text = re.sub(r'_copy\d*$', '', text, flags=re.IGNORECASE)
    return text.strip()

def process_single_course(course_code):
    """Processes an entire course payload with photo sequences, author resolution, and validation."""
    payload_file = f"migration_data/course_payloads/{course_code}.json"
    if not os.path.exists(payload_file):
        raise FileNotFoundError(f"Missing {payload_file}")

    with open(payload_file, "r", encoding="utf-8") as f:
        payload = json.load(f)

    course_name = payload["course_name"]
    docs = payload["documents"]

    image_exts = {'jpg', 'jpeg', 'png', 'heic', 'bmp'}
    folder_images = defaultdict(list)
    for d in docs:
        ext = d.get('extension', '').lower()
        if ext in image_exts:
            parent = os.path.dirname(d.get('path', ''))
            folder_images[parent].append(d)

    for parent, imgs in folder_images.items():
        if len(imgs) >= 3:
            def natural_sort_key(rec):
                fn = rec.get('filename', '')
                nums = re.findall(r'\d+', fn)
                return (int(nums[0]) if nums else 0, fn)

            sorted_imgs = sorted(imgs, key=natural_sort_key)
            total = len(sorted_imgs)

            folder_path = parent.strip('/')
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
                raw_name = os.path.basename(parent) or "Document"
                clean_folder_title = re.sub(r'[_.\-]+', ' ', raw_name).strip()

            clean_folder_title = clean_whitespace(clean_folder_title)

            for idx, img_rec in enumerate(sorted_imgs, start=1):
                img_rec['_photo_sequence_title'] = f"{clean_folder_title} (p. {idx}/{total})"

    normalized_list = []
    for d in docs:
        author = extract_author(d)
        year = extract_academic_year(d)
        display_title, category_id, tags = detect_category_and_title(d, course_code, course_name, author, year)

        display_title = sanitize_dedup_suffixes(display_title)
        if len(display_title) > 200:
            display_title = display_title[:197] + "..."

        normalized_list.append({
            "file_id": d["file_id"],
            "display_title": display_title,
            "category_id": category_id,
            "year": year,
            "author": author,
            "tags": tags
        })

    title_counts = Counter(r['display_title'] for r in normalized_list)
    seen_titles = defaultdict(int)
    for r in normalized_list:
        t = r['display_title']
        if title_counts[t] > 1:
            seen_titles[t] += 1
            idx = seen_titles[t]
            if idx > 1:
                r['display_title'] = f"{t} ({idx})"

    batch_file = f"migration_data/batches/{course_code}.json"
    with open(batch_file, "w", encoding="utf-8") as f:
        json.dump(normalized_list, f, indent=2, ensure_ascii=False)

    return normalized_list

def main():
    with open("migration_data/clusters/cluster_2.json", "r", encoding="utf-8") as f:
        cluster = json.load(f)

    courses = cluster["courses"]
    print(f"=== NORMALIZING CLUSTER 2: {cluster['cluster_name']} ({len(courses)} COURSES) ===")

    all_records = []
    for c in courses:
        code = c["course_code"]
        name = c["course_name"]
        norm = process_single_course(code)
        all_records.extend(norm)
        print(f"  ✓ [{code}] {name}: {len(norm)} documents normalized")

    os.makedirs("migration_data/cluster_outputs", exist_ok=True)
    out_file = "migration_data/cluster_outputs/cluster_2_output.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(all_records, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Completed Cluster 2 normalization! Total: {len(all_records)} docs written to {out_file}")

if __name__ == '__main__':
    main()
