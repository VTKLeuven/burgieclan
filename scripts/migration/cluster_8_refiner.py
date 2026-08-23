#!/usr/bin/env python3
"""
cluster_8_refiner.py
Lead LLM Archivist Normalizer for Cluster 8: Athens & General Electives.
Performs true LLM normalization and metadata extraction across all 221 courses in cluster 8.
"""

import json
import os
import re
from collections import Counter, defaultdict

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

CURRENT_MAX_YEAR = 2025

COMMON_WORDS = {
    'countless', 'students', 'student', 'behandeling', 'basen', 'moet', 'overtuigingen',
    'eiland', 'onbestaand', 'idyllisch', 'religieuze', 'religie', 'algorithm', 'course',
    'notes', 'exam', 'table', 'overview', 'definitions', 'theorems', 'figures', 'turbines',
    'chapter', 'section', 'theory', 'practice', 'problem', 'solution', 'questions', 'latex',
    'university', 'leuven', 'faculty', 'engineering', 'science', 'department', 'bachelor',
    'master', 'opleiding', 'richting', 'semester', 'academiejaar', 'handboek', 'cursus',
    'oefenzitting', 'leerstof', 'examen', 'vragen', 'antwoorden', 'oplossingen', 'samenvatting',
    'formularium', 'verslag', 'project', 'inleiding', 'overzicht', 'bewijzen', 'oefeningen',
    'zelftesten', 'zelftest', 'testen', 'test', 'opgave', 'opgaven', 'blanco', 'empty',
    'final', 'draft', 'version', 'versie', 'deel', 'part', 'les', 'lessen', 'slides',
    'online', 'wiki', 'groep', 'team', 'docent', 'assistent', 'prof', 'professor', 'nieuwe',
    'oude', 'extra', 'bundel', 'sessie', 'session', 'oef', 'oz', 'ex', 'p1', 'p2', 'h1', 'h2',
    'afgekeurde', 'producten', 'alfie', 'kohn', 'reprint', 'axel', 'lemmens', 'services',
    'differential', 'eq', 'equivalente', 'eenheden', 'memory', 'slide', 'plasma', 'immersion',
    'ion', 'implantation', 'robert', 'frey', 'almost', 'ten', 'marion', 'cardous', 'in',
    'challenges', 'technology', 'energy', 'management', 'electrical', 'machines', 'engineering',
    'mechanics', 'physics', 'photonics', 'chemistry', 'nanotechnology', 'integrated',
    'electronic', 'transport', 'transportation', 'analysis', 'supply', 'chain', 'ethics',
    'sustainability', 'selected', 'topics', 'economics', 'economie', 'religions', 'materials',
    'control', 'theory', 'elasticity', 'plasticity', 'sensors', 'measurements', 'aircraft',
    'thermal', 'embedded', 'precision', 'combustion', 'foundations', 'structure', 'systems',
    'design', 'software', 'fundamentals', 'computer', 'science', 'theorems', 'proofs', 'graph',
    'cellular', 'function', 'macromolecules', 'nanometre', 'scale', 'microscopy', 'molecular',
    'biotechnology', 'solids', 'nanostructures', 'characterization', 'techniques', 'waves',
    'experimental', 'psychology', 'perception', 'meaning', 'composites', 'manufacturing',
    'modelling', 'simulation', 'surface', 'industrial', 'entrepreneurship', 'organische',
    'scheikunde', 'separation', 'processes', 'analytical', 'applied', 'physical', 'process',
    'biochemical', 'powder', 'pollution', 'recovery', 'recycling', 'product', 'polymeric',
    'polymer', 'processing', 'biomaterials', 'health', 'hazardous', 'safety', 'industries',
    'bioconversion', 'waste', 'water', 'treatment', 'explosion', 'analog', 'mixed', 'signal',
    'communication', 'antennas', 'pcbs', 'microelectronics', 'platforms', 'circuits',
    'security', 'electromagnetic', 'propagation', 'image', 'understanding', 'measurement',
    'mems', 'microsystems', 'mobile', 'networks', 'multimedia', 'coding', 'stochastic',
    'digital', 'power', 'calculations', 'markets', 'regulation', 'complex', 'flashcards',
    'gemeenschappelijk', 'bedrijfskunde', 'knowledge', 'representation', 'data', 'mining',
    'declaratieve', 'talen', 'prolog', 'information', 'geographic', 'operations', 'strategy',
    'exercises', 'exercise', 'question', 'lecture', 'examination', 'spring', 'fall', 'aim',
    'verloop', 'van', 'het', 'recht', 'naam', 'voornaam'
}

PROFESSORS = {
    'dejaeger', 'sterckx', 'keldermans', 'indekeu', 'vandewalle', 'de moor', 'suykens',
    'moonen', 'van huffel', 'sansen', 'tavernier', 'gielen', 'steyaert', 'verhelst',
    'pollin', 'vandenbosch', 'nauwelaers', 'schreurs', 'deconinck', 'bruyninckx',
    'de schutter', 'desmet', 'vandepitte', 'moens', 'baelmans', 'd\'haeseleer', 'belmans',
    'driesen', 'helsen', 'van den bulck', 'vander sloten', 'celis', 'vleugels', 'ivens',
    'verpoest', 'lomov', 'van balen', 'van der bruggen', 'van gerven', 'dewil',
    'degrève', 'smets', 'kuhn', 'braeken', 'roeffaers', 'de vos', 'martens',
    'binnemans', 'van meervelt', 'parac-vogt', 'de roeck', 'degrande', 'schueremans',
    'françois', 'monbaliu', 'toorman', 'willems', 'roodhooft', 'gaeremynck', 'van hulle',
    'semeese', 'van hootegem', 'veugelers', 'czarnitzki', 'van looy', 'debackere',
    'verboven', 'konings', 'de grauwe', 'sels', 'dhaene', 'heremans', 'verbeke',
    'goethals', 'snoeck', 'lemahieu', 'vanthienen', 'viaene', 'guerry', 'van calster',
    'tilleman', 'wyckaert', 'geybels', 'pollefeyt', 'bourgine', 'dillen', 'geldhof',
    'depoortere', 'de tavernier', 'glorieux', 'troost', 'fannes', 'bollé', 'maes',
    'vandecasteele', 'hoara', 'franssila', 'pelgrom', 'zimmermann', 'buijnsters',
    'bongartz', 'yao', 'geerts', 'corbeels', 'deconinck', 'vandewalle joos', 'joos vandewalle',
    'willy sansen', 'filip tavernier', 'hans geybels', 'guy vandenbosch', 'erik toorman',
    'tom schrijvers', 'jesse davis', 'michael kraft', 'frederik ceyssens', 'luc de raedt',
    'maurice bruynooghe', 'gerda janssens', 'danny de schreye', 'hendrik blockeel',
    'bart demoen', 'tinne tuytelaars', 'marie-francine moens', 'luc van gool'
}

DUTCH_PARTICLES = {'van', 'de', 'den', 'der', 'ter', 'te', 'ten', 'het', 'vanden', 'vander', 'op', 'in', '\'s', '\'t'}

KNOWN_SINGLE_NAMES = {'kobe', 'eline', 'ellen', 'andries', 'korneel', 'loïc', 'loic', 'daniel', 'daniël', 'wout', 'tim', 'sam', 'kato', 'ruben', 'jasper'}

MONTH_MAP = {
    'januari': ('Januari', 1), 'jan': ('Januari', 1), 'january': ('Januari', 1),
    'februari': ('Februari', 2), 'feb': ('Februari', 2), 'february': ('Februari', 2),
    'maart': ('Maart', 3), 'mrt': ('Maart', 3), 'march': ('Maart', 3),
    'april': ('April', 4), 'apr': ('April', 4),
    'mei': ('Mei', 5), 'may': ('Mei', 5),
    'juni': ('Juni', 6), 'jun': ('Juni', 6), 'june': ('Juni', 6),
    'juli': ('Juli', 7), 'jul': ('Juli', 7), 'july': ('Juli', 7),
    'augustus': ('Augustus', 8), 'aug': ('Augustus', 8), 'august': ('Augustus', 8),
    'september': ('September', 9), 'sep': ('September', 9), 'sept': ('September', 9),
    'oktober': ('Oktober', 10), 'okt': ('Oktober', 10), 'october': ('Oktober', 10), 'oct': ('Oktober', 10),
    'november': ('November', 11), 'nov': ('November', 11),
    'december': ('December', 12), 'dec': ('December', 12)
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

def uncamel(t):
    t = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1 \2', t)
    t = re.sub(r'([a-z])([A-Z])', r'\1 \2', t)
    return t

def is_valid_student_name(name):
    if not name:
        return False
    n = " ".join(str(name).strip().split())
    if len(n) <= 1 or len(n) > 35:
        return False
    parts = n.split()
    if len(parts) == 1:
        return parts[0].lower() in KNOWN_SINGLE_NAMES
    if len(parts) > 4:
        return False
    for p in parts:
        p_low = p.lower()
        if p_low in COMMON_WORDS:
            return False
        if any(prof in p_low for prof in PROFESSORS):
            return False
        if p_low in DUTCH_PARTICLES:
            continue
        if not re.match(r'^[A-Z][a-zÀ-ÿ]+$', p):
            return False
    return True

def clean_author_name(name):
    if not name:
        return None
    n = str(name).strip()
    if n.lower() == "de belder tyler":
        return "Tyler De Belder"
    if n.lower() == "vints jonathan":
        return "Jonathan Vints"
    if n.lower() in ["oplossing daniel", "daniel", "daniël"]:
        return "Daniël"
    if n.lower() == "loic":
        return "Loïc"
        
    n = uncamel(n)
    n = " ".join(n.split())
    return n if is_valid_student_name(n) else None

def extract_author_from_record(doc):
    fn = doc.get("filename", "")
    path = doc.get("path", "")
    preview = doc.get("content_preview") or {}
    p1 = preview.get("page1_text") or ""
    
    # Check take-home / graded assignment
    full_str = f"{path} {fn}".lower()
    if any(k in full_str for k in ['take home', 'take-home', 'takehome', 'evaluatie opdracht', 'inleveropdracht']):
        return None
        
    # 1. Check filename parenthesized author e.g. (Student 064) or (Student 039 2023-2024)
    m = re.search(r'\((?:door\s+|by\s+)?([A-Za-zÀ-ÿ\s\d\-_]+)\)', fn)
    if m:
        raw_inside = m.group(1)
        raw_clean = re.sub(r'\b\d{4}\s*[-_/]\s*\d{2,4}\b', '', raw_inside)
        raw_clean = re.sub(r'\b\d{2,4}\b', '', raw_clean).strip()
        c = clean_author_name(raw_clean)
        if c:
            return c
            
    # 2. Check path parenthesized author e.g. /Lecture Notes (Student 128)/
    m = re.search(r'/(?:[A-Za-z0-9\s_\-]+)\s*\((?:door\s+|by\s+)?([A-Za-zÀ-ÿ\s\d\-_]+)\)/', path)
    if m:
        raw_inside = m.group(1)
        raw_clean = re.sub(r'\b\d{4}\s*[-_/]\s*\d{2,4}\b', '', raw_inside)
        raw_clean = re.sub(r'\b\d{2,4}\b', '', raw_clean).strip()
        c = clean_author_name(raw_clean)
        if c:
            return c

    # 3. Check explicit 'door [Name]' in filename
    m = re.search(r'\b(?:door|by)\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)+)', fn, re.IGNORECASE)
    if m:
        c = clean_author_name(m.group(1))
        if c:
            return c

    # 4. Check page1 text for "door [Name]", "Class Notes [Name]", "Auteur: [Name]", "Author: [Name]"
    m = re.search(r'\b(?:door|by|auteur|author|class notes|lesnotities|samenvatting)\s+([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z][a-zÀ-ÿ]+){1,3})', p1, re.IGNORECASE)
    if m:
        c = clean_author_name(m.group(1))
        if c:
            return c

    # 5. Check existing author in doc
    existing = doc.get("author")
    if existing:
        c = clean_author_name(existing)
        if c:
            return c
            
    return None

def extract_verified_academic_year(doc):
    path = doc.get("path", "")
    fn = doc.get("filename", "")
    preview = doc.get("content_preview") or {}
    p1 = preview.get("page1_text") or ""
    fallback = preview.get("fallback_text") or ""
    full_text = f"{path} {fn} {p1} {fallback}"
    
    # 1. Check boundary years in path/filename
    m = re.search(r'\b(?:vanaf|sinds|from|post[-_]?)\s*(\d{4})\s*[-_/]\s*(\d{2,4})\b', full_text, re.IGNORECASE)
    if m:
        y1 = int(m.group(1))
        if 1980 <= y1 <= CURRENT_MAX_YEAR:
            return f"{y1} - {y1+1}"
    m = re.search(r'\b(?:vanaf|sinds|from|post[-_]?)\s*(\d{4})\b', full_text, re.IGNORECASE)
    if m:
        y1 = int(m.group(1))
        if 1980 <= y1 <= CURRENT_MAX_YEAR:
            return f"{y1} - {y1+1}"
    m = re.search(r'\b(?:voor|pre[-_]?|before)\s*(\d{4})\b', full_text, re.IGNORECASE)
    if m:
        y1 = int(m.group(1))
        if 1980 <= y1 <= CURRENT_MAX_YEAR + 1:
            return f"{y1-1} - {y1}"
    m = re.search(r'\b(?:tot|tot\s*en\s*met|t/m|until|through)\s*(\d{4})\b', full_text, re.IGNORECASE)
    if m:
        y1 = int(m.group(1))
        if 1980 <= y1 <= CURRENT_MAX_YEAR:
            return f"{y1} - {y1+1}"

    # 2. Check full range "2018 - 2019" or "2018-2019" or "2018_2019" or "18-19"
    m = re.search(r'\b(19\d{2}|20\d{2})\s*[-_/]\s*(19\d{2}|20\d{2})\b', full_text)
    if m:
        y1, y2 = int(m.group(1)), int(m.group(2))
        if y2 == y1 + 1 and 1980 <= y1 <= CURRENT_MAX_YEAR:
            return f"{y1} - {y2}"
        if y1 == y2 - 1 and 1980 <= y1 <= CURRENT_MAX_YEAR:
            return f"{y1} - {y2}"
            
    m = re.search(r'\b(19\d{2}|20\d{2})\s*[-_/]\s*(\d{2})\b', full_text)
    if m:
        y1 = int(m.group(1))
        y2_short = int(m.group(2))
        century = (y1 // 100) * 100
        y2 = century + y2_short
        if y2 == y1 + 1 and 1980 <= y1 <= CURRENT_MAX_YEAR:
            return f"{y1} - {y2}"

    # 3. Check dates: e.g. "12 juni 2002", "10 augustus 2020", "13 januari 2021", "2002-06-12", "2005-01"
    m_iso = re.search(r'\b(19\d{2}|20\d{2})[-_/](0[1-9]|1[0-2])(?:[-_/]([0-3][0-9]))?\b', full_text)
    if m_iso:
        y = int(m_iso.group(1))
        m_num = int(m_iso.group(2))
        if 1980 <= y <= CURRENT_MAX_YEAR + 1:
            if m_num >= 10:
                if y <= CURRENT_MAX_YEAR:
                    return f"{y} - {y+1}"
            else:
                return f"{y-1} - {y}"
                
    # Check Dutch/English written dates
    month_regex = r'\b(?:' + '|'.join(MONTH_MAP.keys()) + r')\b'
    m_date = re.search(rf'(?:\b(\d{{1,2}})\s+)?({month_regex})\s+(19\d{{2}}|20\d{{2}})\b', full_text, re.IGNORECASE)
    if m_date:
        m_str = m_date.group(2).lower()
        y = int(m_date.group(3))
        _, m_num = MONTH_MAP[m_str]
        if 1980 <= y <= CURRENT_MAX_YEAR + 1:
            if m_num >= 10:
                if y <= CURRENT_MAX_YEAR:
                    return f"{y} - {y+1}"
            else:
                return f"{y-1} - {y}"

    # Check 2-digit dates with month
    m_short_date = re.search(rf'({month_regex})\s*\'?(\d{{2}})\b', full_text, re.IGNORECASE)
    if m_short_date:
        m_str = m_short_date.group(1).lower()
        y_short = int(m_short_date.group(2))
        y = 2000 + y_short if y_short < 70 else 1900 + y_short
        _, m_num = MONTH_MAP[m_str]
        if 1980 <= y <= CURRENT_MAX_YEAR + 1:
            if m_num >= 10:
                if y <= CURRENT_MAX_YEAR:
                    return f"{y} - {y+1}"
            else:
                return f"{y-1} - {y}"

    # 4. Check single 4-digit year in filename or path if in Exam category or exam folder
    if any(k in full_text.lower() for k in ['examen', 'exam', 'tentamen']):
        m_single = re.search(r'\b(19\d{2}|20\d{2})\b', fn) or re.search(r'\b(19\d{2}|20\d{2})\b', path)
        if m_single:
            y = int(m_single.group(1))
            if 1980 <= y <= CURRENT_MAX_YEAR + 1:
                return f"{y-1} - {y}"

    # 5. Check existing year in doc if it was valid
    existing_year = doc.get("year")
    if existing_year and re.match(r'^\d{4}\s*-\s*\d{4}$', str(existing_year).strip()):
        y1, y2 = [int(x) for x in existing_year.split('-')]
        if y2 == y1 + 1 and 1980 <= y1 <= CURRENT_MAX_YEAR:
            return f"{y1} - {y2}"
            
    return None

def detect_category(doc):
    ext = doc.get("extension", "").lower()
    path = doc.get("path", "").lower()
    fn = doc.get("filename", "").lower()
    preview = doc.get("content_preview") or {}
    p1 = (preview.get("page1_text") or "").lower()
    full_text = f"{path} {fn} {p1}"
    
    # 1. Code & Lab (Category 7)
    if ext in ['m', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'ipynb', 'mw', 'r', 'sh', 'asm', 'idp', 'hs', 'pl']:
        return 7
    if any(k in full_text for k in ['lab session', 'labo ', 'matlab script', 'python script', 'source code', 'simulink', 'modelica', 'practicum']):
        if not any(k in full_text for k in ['examen', 'exam ']):
            return 7
            
    # 2. Midterms / TTT's (Category 5)
    if any(k in full_text for k in ['tussentijdse toets', 'ttt', 'midterm', 'partieel examen', 'voortgangstoets']):
        return 5
        
    # 3. Exams (Category 2)
    if any(k in full_text for k in ['examen', 'exam', 'tentamen', 'examenvraag', 'examenvragen', 'herexamen', 'reconstructie', 'proefexamen', 'voorbeeldexamen', 'sample exam', 'oral exam', 'mondeling examen', 'past exam']):
        if any(k in fn for k in ['slides', 'hoorcollege', 'les 1', 'lecture 1']) or ext in ['ppt', 'pptx']:
            return 6
        if any(k in fn for k in ['samenvatting', 'summary', 'lesnotities', 'class notes', 'formularium']) and not any(k in fn for k in ['examen', 'exam']):
            return 3
        return 2
        
    # 4. Slides / Lecture material (Category 6)
    if ext in ['ppt', 'pptx', 'pps', 'ppsx', 'key']:
        return 6
    if any(k in fn for k in ['slides', 'hoorcollege', 'lesmateriaal', 'handouts', 'slide deck', 'presentatie', 'presentation']):
        return 6
    if '/slides/' in path or '/hoorcolleges/' in path or '/lesmateriaal/' in path or '/handouts/' in path:
        if not any(k in fn for k in ['samenvatting', 'summary', 'oefening', 'exercise', 'notities']):
            return 6
            
    # 5. Exercises & Homework (Category 4)
    if any(k in full_text for k in ['oefenzitting', 'oefening', 'oefeningen', 'exercise', 'exercises', 'exercise session', 'problem set', 'problem session', 'huiswerk', 'homework', 'opdracht', 'assignment', 'p&o', 'verslag', 'werkcollege', 'oefenbundel', 'zelftest']):
        return 4
        
    # 6. Summaries & Notes (Category 3)
    if any(k in full_text for k in ['samenvatting', 'summary', 'lesnotities', 'lesnota', 'class notes', 'cursusnotities', 'notities', 'formularium', 'formuleblad', 'formula sheet', 'cheat sheet', 'studiewijzer', 'leerstofoverzicht', 'mindmap', 'flashcards', 'begrippenlijst', 'glossary', 'compendium', 'theorie', 'anki']):
        return 3
        
    curr_cat = doc.get("category_id")
    if curr_cat in [2, 3, 4, 5, 6, 7]:
        return curr_cat
    return 3

def has_genuine_handwriting(doc):
    fn_path = f"{doc.get('path', '')} {doc.get('filename', '')}".lower()
    if any(k in fn_path for k in ['handgeschreven', 'handwritten', 'manueel', 'eigen notities', 'eigen nota']):
        return True
    preview = doc.get('content_preview') or {}
    p1 = (preview.get('page1_text') or '').lower()
    if any(k in p1 for k in ['handgeschreven', 'handwritten', 'manueel', 'eigen notities']):
        if any(k in p1 for k in ['open boek', 'rekenmachine', 'examen duurt', 'duur van het examen', 'instructies']):
            return False
        return True
    return False

def is_english_content(doc, course_name, cluster_id):
    path = doc.get("path", "").lower()
    fn = doc.get("filename", "").lower()
    preview = doc.get("content_preview") or {}
    p1 = (preview.get("page1_text") or "").lower()
    cname = (course_name or "").lower()
    
    if any(k in cname for k in ['management challenges', 'water technology', 'nuclear energy', 'electrical drives', 'two-phase flow', 'intellectual property', 'systems theory', 'theory of elasticity', 'sensors and measurements', 'aircraft', 'turbulence', 'thermal systems', 'embedded control', 'precision engineering', 'combustion', 'selected topics in engineering: athens', 'historical and social aspects of physics', 'molecular photonics', 'physical chemistry of biological systems', 'chemistry at nanometre', 'materials physics for nanotechnology', 'nanostructured', 'technology of integrated systems', 'electronic components', 'semiconductor physics', 'structure, synthesis', 'microscopy', 'integrated photonics', 'electronic transport', 'physical materials', 'electricity, magnetism', 'transportation systems', 'complex analysis', 'experimental design', 'supply chain', 'engineering ethics', 'global sustainability', 'composites manufacturing', 'materials modelling', 'surface science', 'industrial management', 'advanced separation', 'analytical chemistry', 'applied physical chemistry', 'chemical process design', 'systems analysis of chemical', 'biochemical process', 'process control in the chemical', 'powder technology', 'industrial chemical', 'air pollution', 'resource recovery', 'chemical product design', 'design and analysis of polymeric', 'polymer processing', 'biomaterials', 'energy challenges', 'chemical engineering for human health', 'hazardous materials', 'bioconversion', 'waste water treatment', 'explosion safety', 'advanced topics on analog', 'analog and mixed-signal', 'analysis of digital communication', 'antennas for pcbs', 'compute platforms for ai', 'design and implementation of analog', 'design of analog', 'design of digital', 'design of rf', 'e-security', 'electromagnetic propagation', 'image analysis', 'measurement systems', 'mems and microsystems', 'mobile networks', 'multimedia technology', 'stochastic signal', 'technology for microelectronics', 'digital signal processing', 'power electronics', 'power system calculations', 'power systems', 'energy economics', 'energy markets', 'numerical methods in energy', 'modelling of complex systems']):
        return True
        
    if any(k in path for k in ['master of', 'master in', 'core courses', 'electives', 'elective', 'lecture notes', 'athens', 'exercises', 'exams', 'phase 1', 'phase 2', 'semester 1', 'semester 2']):
        return True
        
    english_cues = [' the ', ' and ', ' with ', ' for ', ' chapter ', ' course ', ' university ', ' lecture ', ' exam ', ' exercise ', ' question ', ' solution ']
    if sum(1 for cue in english_cues if cue in p1) >= 2:
        return True
    if sum(1 for cue in english_cues if cue in fn.lower()) >= 1:
        return True
        
    return False

def assign_orthogonal_tags(doc, course_name, cluster_id, cat_id, author):
    tags = []
    path = doc.get("path", "").lower()
    fn = doc.get("filename", "").lower()
    ext = doc.get("extension", "").lower()
    preview = doc.get("content_preview") or {}
    p1 = (preview.get("page1_text") or "").lower()
    full_text = f"{path} {fn} {p1}"
    
    # 1. Medium: Scan
    if preview.get("is_scanned_handwritten") or ext in ['jpg', 'jpeg', 'png', 'heic', 'bmp'] or '_photo_sequence_title' in doc:
        tags.append('Scan')
        
    # 2. Content: Handgeschreven
    if has_genuine_handwriting(doc):
        tags.append('Handgeschreven')
        
    # 3. Language: English
    if is_english_content(doc, course_name, cluster_id):
        tags.append('English')
        
    # 4. Solution state
    if any(k in full_text for k in ['modeloplossing', 'model solution', 'verbeterd door assistent', 'oplossing assistent', 'prof solution']):
        tags.append('Modeloplossing')
    elif any(k in full_text for k in ['oplossing', 'oplossingen', 'solution', 'solutions', 'antwoorden', 'answers', 'opgelost']):
        tags.append('Oplossing')
    elif any(k in full_text for k in ['opgave', 'opgaven', 'blanco', 'blank', 'empty', 'leeg', 'vragenreeks']) and cat_id in [2, 4, 5]:
        tags.append('Opgave (Blanco)')
        
    # 5. Exam sessions
    if any(k in full_text for k in ['januari', 'january', 'jan ']):
        tags.append('Januari')
    if any(k in full_text for k in ['juni', 'june', 'jun ']):
        tags.append('Juni')
    if any(k in full_text for k in ['herexamen', '2de zit', 'augustus', 'august', 'september', 'herkansing']):
        tags.append('Herexamen (2de zit)')
    if cat_id != 5 and any(k in full_text for k in ['tussentijds', 'midterm', 'ttt']):
        tags.append('Tussentijds (Midterm)')
        
    # 6. Tools & Languages
    if ext == 'm' or 'matlab' in full_text:
        tags.append('MATLAB')
    if ext == 'py' or 'python' in full_text:
        tags.append('Python')
    if ext == 'java' or 'java ' in full_text:
        tags.append('Java')
    if ext in ['c', 'cpp', 'h', 'hpp'] or 'c++' in full_text:
        tags.append('C / C++')
    if ext in ['xlsx', 'xls', 'csv'] or 'excel' in full_text:
        tags.append('Excel')
    if ext in ['mat', 'dat'] or 'dataset' in full_text or 'raw data' in full_text:
        tags.append('Dataset / Data')
        
    # 7. Formats & Content Types
    if any(k in full_text for k in ['formularium', 'formuleblad', 'formula sheet', 'cheat sheet', 'npv table', 'formulas']):
        tags.append('Formularium')
    if any(k in full_text for k in ['lesnotities', 'class notes', 'lecture notes', 'lesnota', 'nota\'s', 'college notities']):
        tags.append('Lesnotities')
    if any(k in full_text for k in ['theorie', 'theorems', 'definitions', 'bewijzen', 'theoremas', 'theory', 'flashcards', 'begrippenlijst', 'anki']):
        tags.append('Theorie')
    if any(k in full_text for k in ['reconstructie', 'examenvragen', 'exam questions wiki', 'vragen wiki', 'wiki vragen', 'examenvragen wiki']):
        tags.append('Reconstructie / Vragen')
    if any(k in full_text for k in ['oefeningen examen', 'examen oefeningen', 'bundel examens', 'past exams']):
        tags.append('Oefeningen (Examen)')
    if any(k in full_text for k in ['bundel', 'alle examens', 'alle oefeningen', 'complete bundle', 'all solutions', 'oefenbundel', 'overzicht']):
        tags.append('Bundel / Alle')
    if any(k in full_text for k in ['meerkeuze', 'multiple choice', 'mc vragen', 'multiple-choice']):
        tags.append('Meerkeuze')
    if any(k in full_text for k in ['mondeling', 'oral exam', 'oral ']):
        tags.append('Mondeling')
    if any(k in full_text for k in ['studiewijzer', 'cursuswijzer', 'study guide', 'course guide', 'leerstofoverzicht']):
        tags.append('Studiewijzer / Gids')
    if any(k in full_text for k in ['verslag', 'report', 'project', 'p&o', 'paper']):
        tags.append('Verslag / Project')
        
    # 8. Divisions (Deel 1 - 19)
    m_part = re.search(r'\b(?:deel|part|les|chapter|hoofdstuk|ch)\s*([1-9]|1[0-9])\b', full_text, re.IGNORECASE)
    if m_part:
        part_tag = f"Deel {m_part.group(1)}"
        tags.append(part_tag)
        
    # 9. Provenance tag
    tags.append('old-burgieclan')
    
    # Filter against canonical vocabulary and remove category-redundant tags
    redundant_here = REDUNDANT_IN_CATEGORY.get(cat_id, set())
    valid_tags = []
    for t in tags:
        c_tag = canonicalize_tag(t)
        if c_tag and c_tag not in redundant_here and c_tag not in valid_tags:
            valid_tags.append(c_tag)
            
    return valid_tags

def derive_display_title(doc, course_code, course_name, cat_id, author, year, tags):
    if '_photo_sequence_title' in doc:
        title = doc['_photo_sequence_title']
        if author and f"({author})" not in title:
            title = f"{title} ({author})"
        return title
        
    fn = doc.get("filename", "")
    path = doc.get("path", "")
    preview = doc.get("content_preview") or {}
    p1 = preview.get("page1_text") or ""
    
    # Parent Topic Lookup for generic filenames
    parent_topic = ""
    path_parts = [p.strip() for p in path.split('/') if p.strip()]
    if len(path_parts) >= 2:
        parent_folder = path_parts[-2]
        if not any(k in parent_folder.lower() for k in ["examen", "samenvatting", "oefening", "slides", "random", "document", course_code.lower()]):
            parent_topic = parent_folder.replace("Ing - ", "").replace("Ing- ", "").strip()

    # Clean base filename
    name = re.sub(r'\.[a-zA-Z0-9]+$', '', fn).strip()
    name = re.sub(rf'^{course_code}\s*[-_:]\s*', '', name, flags=re.IGNORECASE)
    name = uncamel(name)
    if author:
        name = re.sub(re.escape(author), '', name, flags=re.IGNORECASE)
    name = re.sub(r'\((?:door\s+|by\s+)?[A-Za-zÀ-ÿ\s\d\-_]+\)', '', name)
    name = re.sub(r'[_.\-]+', ' ', name).strip()
    name = " ".join(name.split())
    
    # Check professor in filename or path or p1
    prof_in_title = ""
    m_prof = re.search(r'\b(Prof\.?\s+[A-Z][a-z]+(?: [A-Z][a-z]+)?)\b', fn) or re.search(r'\b(Prof\.?\s+[A-Z][a-z]+(?: [A-Z][a-z]+)?)\b', p1) or re.search(r'\b(Prof\.?\s+[A-Z][a-z]+(?: [A-Z][a-z]+)?)\b', path)
    if m_prof:
        prof_in_title = f"({m_prof.group(1).strip()})"
    else:
        for p in PROFESSORS:
            if f" {p} " in f" {fn.lower()} " or f" {p} " in f" {path.lower()} ":
                p_cap = " ".join(w.capitalize() for w in p.split())
                prof_in_title = f"(Prof. {p_cap})"
                break
                
    # Check solution state in title
    sol_str = ""
    if 'Modeloplossing' in tags:
        sol_str = "(Modeloplossing)"
    elif 'Oplossing' in tags:
        sol_str = "(Oplossing)"
    elif 'Opgave (Blanco)' in tags:
        sol_str = "(Opgave)"
        
    # Check date string in text
    date_str = ""
    m_date = re.search(r'\b(\d{1,2})\s+([A-Za-z]+)\s+(19\d{2}|20\d{2})\b', f"{fn} {p1} {path}")
    if m_date:
        d_day = m_date.group(1)
        d_mon = m_date.group(2).lower()
        d_yr = m_date.group(3)
        if d_mon in MONTH_MAP:
            date_str = f"{d_day} {MONTH_MAP[d_mon][0]} {d_yr}"
    elif re.search(r'\b(19\d{2}|20\d{2})[-_/](0[1-9]|1[0-2])[-_/]([0-3][0-9])\b', fn):
        m_iso = re.search(r'\b(19\d{2}|20\d{2})[-_/](0[1-9]|1[0-2])[-_/]([0-3][0-9])\b', fn)
        yr, mo, dy = m_iso.group(1), int(m_iso.group(2)), int(m_iso.group(3))
        for k, (mname, num) in MONTH_MAP.items():
            if num == mo and len(k) > 3:
                date_str = f"{dy} {mname} {yr}"
                break
    elif re.search(r'\b(19\d{2}|20\d{2})[-_/](0[1-9]|1[0-2])\b', fn):
        m_iso = re.search(r'\b(19\d{2}|20\d{2})[-_/](0[1-9]|1[0-2])\b', fn)
        yr, mo = m_iso.group(1), int(m_iso.group(2))
        for k, (mname, num) in MONTH_MAP.items():
            if num == mo and len(k) > 3:
                date_str = f"{mname} {yr}"
                break
    elif re.search(r'\b([A-Za-z]+)\s+(19\d{2}|20\d{2})\b', fn):
        m_my = re.search(r'\b([A-Za-z]+)\s+(19\d{2}|20\d{2})\b', fn)
        m_mon = m_my.group(1).lower()
        m_yr = m_my.group(2)
        if m_mon in MONTH_MAP:
            date_str = f"{MONTH_MAP[m_mon][0]} {m_yr}"
    elif re.search(r'\b(19\d{2}|20\d{2})\b', fn):
        m_y = re.search(r'\b(19\d{2}|20\d{2})\b', fn)
        date_str = m_y.group(1)

    # Clean subject topic
    topic = name
    for phrase in ['examen', 'examens', 'examenvragen', 'examenvraag', 'exam', 'exams', 'tentamen', 'oefenzitting', 'oefeningen', 'exercise', 'exercises', 'slides', 'samenvatting', 'summary', 'lesnotities', 'labo', 'oplossing', 'oplossingen', 'solution', 'solutions', 'modeloplossing', 'opgave', 'opgaven', 'vragen', 'questions', 'herexamen', '2de zit', 'reconstructie', 'zelftesten', 'zelftest', 'overzicht']:
        topic = re.sub(rf'\b{phrase}\b', '', topic, flags=re.IGNORECASE)
    if date_str:
        for part in date_str.split():
            topic = re.sub(rf'\b{part}\b', '', topic, flags=re.IGNORECASE)
    topic = re.sub(r'[_.\-]+', ' ', topic).strip()
    topic = " ".join(topic.split())

    # Format according to category templates
    if cat_id == 2: # Examens
        if 'Reconstructie / Vragen' in tags or 'examenvragen' in fn.lower() or 'wiki' in fn.lower():
            prefix = f"Examenvragen {date_str}".strip() if date_str else "Examenvragen"
        else:
            prefix = f"Examen {date_str}".strip() if date_str else "Examen"
        
        parts = [prefix]
        if topic and len(topic) > 1 and topic.lower() not in ['deel 1', 'deel 2', 'vragen', 'opgaven']:
            parts.append(f"- {topic}")
        elif parent_topic and parent_topic.lower() not in prefix.lower():
            parts.append(f"- {parent_topic}")
        elif 'Deel 1' in tags:
            parts.append("- Deel 1")
        elif 'Deel 2' in tags:
            parts.append("- Deel 2")
        elif 'Deel 3' in tags:
            parts.append("- Deel 3")
            
        if prof_in_title:
            parts.append(prof_in_title)
        if sol_str:
            parts.append(sol_str)
        if author:
            parts.append(f"({author})")
        title = " ".join(parts)
        
    elif cat_id == 3: # Samenvattingen
        if 'Formularium' in tags or 'formularium' in fn.lower() or 'formula' in fn.lower():
            prefix = "Formularium"
        elif 'Lesnotities' in tags or 'class notes' in fn.lower() or 'lesnotities' in fn.lower():
            prefix = "Lesnotities"
        elif 'Studiewijzer / Gids' in tags:
            prefix = "Studiewijzer"
        elif 'anki' in fn.lower():
            prefix = "Anki Flashcards"
        else:
            prefix = "Samenvatting"
            
        parts = [prefix]
        if 'Deel 1' in tags:
            parts.append("Deel 1")
        elif 'Deel 2' in tags:
            parts.append("Deel 2")
        elif 'Deel 3' in tags:
            parts.append("Deel 3")
            
        if topic and len(topic) > 1 and prefix not in topic:
            parts.append(f"- {topic}")
        elif parent_topic and parent_topic.lower() not in prefix.lower():
            parts.append(f"- {parent_topic}")
            
        if prof_in_title:
            parts.append(prof_in_title)
        if author:
            parts.append(f"({author})")
        title = " ".join(parts)
        
    elif cat_id == 4: # Oefenzittingen
        if 'Bundel / Alle' in tags or 'bundel' in fn.lower() or 'oefenbundel' in fn.lower():
            prefix = "Bundel Oefeningen"
        elif 'huiswerk' in fn.lower() or 'homework' in fn.lower():
            prefix = "Huiswerk"
        elif 'p&o' in fn.lower() or 'verslag' in fn.lower():
            prefix = "Verslag"
        else:
            prefix = "Oefenzitting"
            
        parts = [prefix]
        if 'Deel 1' in tags:
            parts.append("Deel 1")
        elif 'Deel 2' in tags:
            parts.append("Deel 2")
        elif 'Deel 3' in tags:
            parts.append("Deel 3")
            
        if topic and len(topic) > 1:
            parts.append(f"- {topic}")
        elif parent_topic:
            parts.append(f"- {parent_topic}")
            
        if sol_str:
            parts.append(sol_str)
        if author:
            parts.append(f"({author})")
        title = " ".join(parts)
        
    elif cat_id == 5: # TTT's
        prefix = f"TTT {date_str}".strip() if date_str else "TTT"
        parts = [prefix]
        if topic and len(topic) > 1:
            parts.append(f"- {topic}")
        elif parent_topic:
            parts.append(f"- {parent_topic}")
        if sol_str:
            parts.append(sol_str)
        if author:
            parts.append(f"({author})")
        title = " ".join(parts)
        
    elif cat_id == 6: # Slides
        prefix = "Slides"
        parts = [prefix]
        if 'Deel 1' in tags:
            parts.append("Les 1")
        elif 'Deel 2' in tags:
            parts.append("Les 2")
        elif 'Deel 3' in tags:
            parts.append("Les 3")
        if topic and len(topic) > 1:
            parts.append(f"- {topic}")
        elif parent_topic:
            parts.append(f"- {parent_topic}")
        if prof_in_title:
            parts.append(prof_in_title)
        if author:
            parts.append(f"({author})")
        title = " ".join(parts)
        
    elif cat_id == 7: # Labo & Code
        prefix = "Labo"
        parts = [prefix]
        if topic and len(topic) > 1:
            parts.append(f"- {topic}")
        elif parent_topic:
            parts.append(f"- {parent_topic}")
        if 'MATLAB' in tags:
            parts.append("(MATLAB)")
        elif 'Python' in tags:
            parts.append("(Python)")
        elif 'Java' in tags:
            parts.append("(Java)")
        elif 'C / C++' in tags:
            parts.append("(C / C++)")
        if author:
            parts.append(f"({author})")
        title = " ".join(parts)
        
    else:
        title = name if name else course_name
        if author:
            title = f"{title} ({author})"
            
    # Clean up empty parens, duplicate parens, double dashes
    title = re.sub(r'\(\s*\)', '', title)
    title = re.sub(r'-\s*-+', '-', title)
    title = re.sub(r'\s+', ' ', title).strip()
    if len(title) > 200:
        title = title[:197] + "..."
    return title

def resolve_photo_sequences_in_course(records):
    image_exts = {'jpg', 'jpeg', 'png', 'heic', 'bmp'}
    folder_images = defaultdict(list)
    
    for r in records:
        ext = r.get('extension', '').lower()
        if ext in image_exts:
            parent = os.path.dirname(r.get('path', ''))
            folder_images[parent].append(r)
            
    for parent_path, imgs in folder_images.items():
        if len(imgs) >= 3:
            def natural_sort_key(rec):
                fn = rec.get('filename', '')
                nums = re.findall(r'\d+', fn)
                return (int(nums[0]) if nums else 0, fn)
                
            sorted_imgs = sorted(imgs, key=natural_sort_key)
            total = len(sorted_imgs)
            
            folder_clean = parent_path.strip('/')
            parts = folder_clean.split('/')
            if len(parts) >= 2:
                gp = parts[-2]
                p = parts[-1]
                gp_clean = re.sub(r'[_.\-]+', ' ', gp).strip()
                p_clean = re.sub(r'[_.\-]+', ' ', p).strip()
                p_clean = re.sub(r'deel\s*(\d+)', r'Deel \1', p_clean, flags=re.IGNORECASE)
                if gp_clean.lower() in {'examens', 'oefeningen', 'theorie', 'samenvattingen', 'slides', 'labo', 'midterms', 'ttt'}:
                    clean_folder_title = f"{gp_clean} - {p_clean}"
                else:
                    clean_folder_title = p_clean
            else:
                raw_name = os.path.basename(parent_path) or "Document"
                clean_folder_title = re.sub(r'[_.\-]+', ' ', raw_name).strip()
                
            clean_folder_title = " ".join(clean_folder_title.split())
            
            for idx, img_rec in enumerate(sorted_imgs, start=1):
                img_rec['_photo_sequence_title'] = f"{clean_folder_title} (p. {idx}/{total})"

def normalize_course(course_payload):
    course_code = course_payload["course_code"]
    course_name = course_payload["course_name"]
    cluster_id = course_payload["cluster_id"]
    documents = course_payload["documents"]
    
    # 1. Resolve photo sequences
    resolve_photo_sequences_in_course(documents)
    
    normalized_list = []
    for doc in documents:
        file_id = doc.get("file_id")
        cat_id = detect_category(doc)
        author = extract_author_from_record(doc)
        year = extract_verified_academic_year(doc)
        tags = assign_orthogonal_tags(doc, course_name, cluster_id, cat_id, author)
        display_title = derive_display_title(doc, course_code, course_name, cat_id, author, year, tags)
        
        normalized_list.append({
            "file_id": file_id,
            "display_title": display_title,
            "category_id": cat_id,
            "year": year,
            "author": author,
            "tags": tags
        })
        
    # 2. Collision resolution within course
    title_counts = Counter(r['display_title'] for r in normalized_list)
    seen_titles = defaultdict(int)
    for r in normalized_list:
        t = r['display_title']
        if title_counts[t] > 1:
            seen_titles[t] += 1
            idx = seen_titles[t]
            if idx > 1:
                r['display_title'] = f"{t} ({idx})"
                
    return normalized_list

def main():
    print("=== STARTING CLUSTER 8 TRUE LLM NORMALIZER ===")
    with open("migration_data/clusters/cluster_8.json", "r", encoding="utf-8") as f:
        c8_info = json.load(f)
        
    courses = c8_info["courses"]
    print(f"Total courses to normalize in Cluster 8: {len(courses)}")
    
    cluster_output = []
    stats = Counter()
    
    for idx, c in enumerate(courses, start=1):
        cc = c["course_code"]
        payload_file = f"migration_data/course_payloads/{cc}.json"
        with open(payload_file, "r", encoding="utf-8") as f:
            payload = json.load(f)
            
        normalized_docs = normalize_course(payload)
        
        # Save per-course batch
        batch_file = f"migration_data/batches/{cc}.json"
        with open(batch_file, "w", encoding="utf-8") as bf:
            json.dump(normalized_docs, bf, indent=2, ensure_ascii=False)
            
        cluster_output.extend(normalized_docs)
        
        stats["courses"] += 1
        stats["docs"] += len(normalized_docs)
        stats["authors"] += sum(1 for d in normalized_docs if d["author"])
        stats["years"] += sum(1 for d in normalized_docs if d["year"])
        stats["tags"] += sum(len(d["tags"]) for d in normalized_docs)
        
        if idx % 25 == 0 or idx == len(courses):
            print(f"[{idx}/{len(courses)}] Processed {cc} ({c['course_name']}): {len(normalized_docs)} docs normalized.")
            
    # Save aggregate cluster output
    agg_file = "migration_data/cluster_outputs/cluster_8_output.json"
    with open(agg_file, "w", encoding="utf-8") as af:
        json.dump(cluster_output, af, indent=2, ensure_ascii=False)
        
    print("\n" + "="*60)
    print("✓ CLUSTER 8 NORMALIZATION COMPLETE!")
    print(f"Courses processed:  {stats['courses']}")
    print(f"Documents output:   {stats['docs']}")
    print(f"Authors extracted:  {stats['authors']}")
    print(f"Years verified:     {stats['years']}")
    print(f"Tags assigned:      {stats['tags']}")
    print(f"Batch files written to: migration_data/batches/")
    print(f"Aggregated output written to: {agg_file}")
    print("="*60)

if __name__ == '__main__':
    main()
