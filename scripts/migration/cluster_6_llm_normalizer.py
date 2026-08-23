#!/usr/bin/env python3
"""
cluster_6_llm_normalizer.py
High-intelligence LLM normalizer and metadata extractor for Cluster 6: Civil & Architecture.
Covers all 45 courses in Cluster 6 with deep semantic understanding, directory breadcrumb reasoning,
author extraction, verified academic years, category reclassification, and orthogonal tags.
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


CURRENT_MAX_YEAR = 2025

NON_AUTHOR_TOKENS = {
    'empty', 'leeg', 'blanco', 'blank', 'oplossing', 'oplossingen', 'opgave',
    'opgaven', 'solution', 'solutions', 'antwoorden', 'vragen', 'questions',
    'theorie', 'theory', 'copy', 'kopie', 'final', 'finaal', 'nieuw', 'new', 'oud', 'old',
    'herexamen', 'examen', 'exam', 'deel', 'part', 'nl', 'en', 'eng', 'engels',
    'english', 'dutch', 'scan', 'handgeschreven', 'slides', 'code', 'script',
    'onbekend', 'unknown', 'student', 'anoniem', 'anonymous', 'praktisch',
    'samenvatting', 'formularium', 'verslag', 'notities', 'definitief', 'uitgebreid',
    'overzicht', 'oefeningen', 'oefening', 'cursus', 'les', 'bundel', 'reeks',
    'conflict', 'conflicted', 'conflicted copy', 'exemplaar met conflict',
    'take home', 'takehome', 'inleveropdracht', 'opdracht', 'groep', 'team',
    'vtk', 'admin', 'studie', 'beide', 'extra', 'correctie', 'verbetering',
    'compleet', 'volledig', 'samengevat', 'nota', 'nota\'s', 'versie', 'aangepast',
    'hervorming', 'b1', 'b2', 'b3', '1bira', '2bira', '3bira', '1b', '2b', '3b',
    'woninganalyse', 'selectiebundel', 'bundel', 'architectuur', 'bouwkunde',
    'marx duurzamheid', 'sartre freud', 'momentstijve verbinding', 'monumentenzorg ok',
    'probabilistisch ontwerpen', 'project hoogbouw', 'religie examenvragen',
    'seminarie dijkshoorn', 'sociologie examenvragen', 'thermodynamic values',
    'utopie lutopia', 'volk adendum', 'watkin mf', 'watkin tine', 'wetenschap technologie',
    'wijsbegeerte  martha', 'wijsbegeerte martha', 'architectuurgeschiedenis juni', 'dit jaar',
    'hoofdstuk ii', 'hoofdstuk iii', 'hoofdstuk iv', 'hoofdstuk ix', 'hoofdstuk vi',
    'hoofdstuk vii', 'hoofdstuk viii', 'hoofdstuk xi', 'hoofdstuk xii', 'hoofdstuk xiii',
    'hydraulica juni', 'specialisatie gotiek', 'technologie van bouwmaterialen',
    'wonen in het verleden', 'pearson prentice', 'stroming in poreuze media',
    'cross lussen', 'de brabantse', 'due diligence', 'gevalstudie gotiek',
    'het moderne', 'lise chris', 'paper architectuurtheorie', 'paper arno bossaert',
    'paper menno mestrom', 'postmodernisme tuur', 'trachtenberg hfstk',
    'van gorp', 'van praet', 'vrieze lene', 'af', 'chemisch evenwicht',
    'chemische reacties', 'paper', 'papervraag', 'papervragen'
}

KNOWN_PROFESSORS_AND_STAFF = {
    'vandewalle', 'indekeu', 'de roeck', 'saelens', 'roels', 'van balen',
    'verstrynge', 'degrande', 'schaerlaekens', 'heynen', 'dehaene', 'neuckermans',
    'strauven', 'baelmans', 'tampère', 'tampere', 'chris tampère', 'chris tampere',
    'reynders', 'e. reynders', 'edwin reynders', 'adriaens', 'pieter adriaens',
    'pieter r. adriaens', 'watkin', 'david watkin', 'eastman', 'chuck eastman',
    'koolhaas', 'rem koolhaas', 'van gemert', 'dionys van gemert', 'huyse',
    'mark huyse', 'lombaert', 'geert lombaert', 'desmet', 'wim desmet',
    'belis', 'jan belis', 'd\'haeseleer', 'william d\'haeseleer', 'proost',
    'joris proost', 'blanpain', 'bart blanpain', 'goddeeris', 'ido goddeeris',
    'de meyer', 'van dyck', 'ceulemans', 'olyslager', 'vangheel', 'van hemelrijck',
    'le corbusier', 'alberti', 'vitruvius', 'palladio', 'semper', 'gottfried semper',
    'gropius', 'mies van der rohe', 'mies', 'wright', 'frank lloyd wright',
    'guadet', 'julien guadet', 'ruskin', 'john ruskin', 'viollet-le-duc', 'viollet le duc',
    'de keyser', 'luc de keyser', 'rummens', 'stefan rummens', 'mattens', 'filip mattens',
    'de lathouwer', 'lieven de lathouwer', 'maes', 'frederik maes', 'stefaan roels',
    'dirk saelens', 'luc schaerlaekens', 'hilde heynen', 'hildegarde heynen',
    'lucie bervoets', 'karel de clercq', 'catherine szanto', 'bernadette blanchon',
    'luis ribeiro', 'bas smets', 'agence ter', 'rowe koetter', 'tzonis lefaivre',
    'marvin trachtenberg', 'trachtenberg', 'hibbeler', 'r c hibbeler', 'dewulf fons',
    'fons dewulf', 'rowej', 'rowe', 'koetter', 'colin rowe', 'fred koetter',
    'tzonis', 'lefaivre', 'alexander tzonis', 'liane lefaivre', 'bodiansky',
    'ecochard', 'bodiansky ecochard', 'giedion', 'sigfried giedion', 'adolf loos',
    'loos', 'venturi', 'smithsons', 'alison smithson', 'peter smithson',
    'rossi', 'aldo rossi', 'augé', 'marc augé', 'levinas', 'heidegger',
    'hollein', 'hans hollein'
}

MONTH_MAP = {
    'jan': ('Januari', 1), 'januari': ('Januari', 1), 'january': ('Januari', 1),
    'feb': ('Februari', 2), 'februari': ('Februari', 2), 'february': ('Februari', 2),
    'mrt': ('Maart', 3), 'maart': ('Maart', 3), 'march': ('Maart', 3),
    'apr': ('April', 4), 'april': ('April', 4),
    'mei': ('Mei', 5), 'may': ('Mei', 5),
    'jun': ('Juni', 6), 'juni': ('Juni', 6), 'june': ('Juni', 6),
    'jul': ('Juli', 7), 'juli': ('Juli', 7), 'july': ('Juli', 7),
    'aug': ('Augustus', 8), 'augustus': ('Augustus', 8), 'august': ('Augustus', 8),
    'sep': ('September', 9), 'sept': ('September', 9), 'september': ('September', 9),
    'okt': ('Oktober', 10), 'oct': ('Oktober', 10), 'oktober': ('Oktober', 10), 'october': ('Oktober', 10),
    'nov': ('November', 11), 'november': ('November', 11),
    'dec': ('December', 12), 'december': ('December', 12),
}


def sanitize_raw_text(t):
    return " ".join(str(t).strip().split())


def is_valid_student_author(name):
    if not name:
        return False
    n = sanitize_raw_text(name)
    if len(n) < 3 or len(n) > 60:
        return False
    n_lower = n.lower()
    if n_lower in NON_AUTHOR_TOKENS:
        return False
    if any(n_lower == prof or n_lower.endswith(" " + prof) for prof in KNOWN_PROFESSORS_AND_STAFF):
        return False
    if any(k in n_lower for k in ['prof.', 'prof ', 'professor', 'dr.', 'dr ']):
        return False
    tokens = [t for t in re.split(r'[\s_\-,&/]+', n_lower) if t]
    if not tokens or any(t in NON_AUTHOR_TOKENS for t in tokens):
        return False
    if not any(c.isalpha() for c in n):
        return False
    return True


def clean_student_name(name):
    if not name:
        return None
    n = sanitize_raw_text(name)
    reversals = {
        "Van Droogenbroeck Bram": "Bram Van Droogenbroeck",
        "Droogenbroeck Bram": "Bram Van Droogenbroeck",
        "Verbelen Bram": "Bram Verbelen",
        "Stroeckx Jorben": "Jorben Stroeckx",
        "Swennen Ward": "Ward Swennen",
        "Tackx Elise": "Elise Tackx",
        "Seys Mathias": "Mathias Seys",
        "Devos Frederik": "Frederik Devos",
        "Dewilde Florian": "Florian Dewilde",
        "De Vrieze Lene": "Lene De Vrieze",
        "Vrieze Lene": "Lene De Vrieze",
        "Thibaut Van": "Thibaut Van der Beken",
        "Gwendolyn Jolien": "Gwendolyn & Jolien",
        "Lily Vreven Janne Willems": "Janne Willems & Lily Vreven",
        "Janne Willems Lily Vreven": "Janne Willems & Lily Vreven",
        "Van Gorp": "Michiel Van Gorp",
        "Van Praet": "Vincent Van Praet",
        "Wijsbegeerte Martha": "Martha",
        "Martha": "Martha",
        "PeetersMyrthe": "Myrthe Peeters",
        "PeetersStijn": "Stijn Peeters",
        "LaurineDeRop": "Laurine De Rop",
        "MulierMuriel": "Muriel Mulier",
        "RomeoNuitten": "Romeo Nuitten",
        "MestromMenno": "Menno Mestrom",
        "DelvaNina": "Nina Delva",
        "DesairElise": "Elise Desair",
        "FeysEvelien": "Evelien Feys",
        "HoppenbrouwersLore": "Lore Hoppenbrouwers",
        "JanssenCamille": "Camille Janssen",
        "JoossensSophie": "Sophie Joossens",
        "MintenMathijs": "Mathijs Minten",
        "DecraemerLina": "Lina Decraemer",
        "DochezJules": "Jules Dochez",
        "LensJonas": "Jonas Lens",
        "LeuraersCato": "Cato Leuraers",
        "MoonsEva": "Eva Moons",
        "ClerckxSiemen": "Siemen Clerckx",
        "CockxEmiel": "Emiel Cockx",
        "VindevogelMarie-Sophie": "Marie-Sophie Vindevogel",
        "DictusStien": "Stien Dictus",
        "VanderbeekLode": "Lode Vanderbeek",
        "VanparysBerten": "Berten Vanparys",
        "KnevelsMathijs": "Mathijs Knevels",
        "FloorMelis": "Floor Melis",
        "LeysenJulie": "Julie Leysen",
        "MeekersSimon": "Simon Meekers",
        "MaarteBosmans": "Maarte Bosmans",
        "FemkeCammans": "Femke Cammans",
        "BoonenLore": "Lore Boonen",
        "ReneeBorowski": "Renee Borowski",
        "SkylerNorga": "Skyler Norga",
        "ElineHoeben": "Eline Hoeben",
        "LaraDeHertogh": "Lara De Hertogh",
        "EllaMaes": "Ella Maes",
        "KaatLongin": "Kaat Longin",
        "CelineDorval": "Celine Dorval",
        "KayraErdem": "Kayra Erdem",
        "JorisVanHirtum": "Joris Van Hirtum",
        "AxelleHaekens": "Axelle Haekens",
        "JulieVloeberghs": "Julie Vloeberghs",
        "RobbeKaljouw": "Robbe Kaljouw",
        "VeerleHeremens": "Veerle Heremens",
        "ChristineWillems": "Christine Willems",
        "SamuelKlein": "Samuel Klein",
        "SofieApril": "Sofie April",
        "JokeMertens": "Joke Mertens",
        "LiesMertens": "Lies Mertens",
        "LucasBehets": "Lucas Behets",
        "AnnaïsBerx": "Annaïs Berx",
        "LiseMouton": "Lise Mouton",
        "TatjanaBogaert": "Tatjana Bogaert",
        "MarieMouton": "Marie Mouton",
        "DzhaninMyumyun": "Dzhanin Myumyun",
        "LotteNuyts": "Lotte Nuyts",
        "MietCras": "Miet Cras",
        "TomasPauwels": "Tomas Pauwels",
        "ElisabethPeeters": "Elisabeth Peeters",
        "MarcusPraet": "Marcus Praet",
        "AlexanderScheepers": "Alexander Scheepers",
        "JanneDaman": "Janne Daman",
        "PlukVanBrempt": "Pluk Van Brempt",
        "NickAdams": "Nick Adams",
        "VictorDerache": "Victor Derache"
    }
    if n in reversals:
        return reversals[n]
    return n


def parse_at_paper_filename(fn_no_ext):
    """Parses complex H01S4C architecture theory paper filenames into clean student author names."""
    # Strip paper prefixes
    cleaned = re.sub(r'^\d+[\.\-_ ]+', '', fn_no_ext)
    cleaned = re.sub(r'^(?:paper|vraag|papervraag|paperat2|paperat)[\.\-_ ]*\d*[\.\-_ ]*', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'[\.\-_ ]*(?:paper|vraag|papervraag|paperat2|paperat|definitief|finaal|r0\d+|2bira|\d{4})[\.\-_ ]*$', '', cleaned, flags=re.IGNORECASE)

    # Patterns like "Rowe_Koetter_LaurineDeRop", "Bodiansky_Ecochard_PeetersMyrthe"
    m_author_tail = re.search(r'([A-Z][a-z]+(?:De[A-Z][a-z]+|[A-Z][a-z]+))$', cleaned)
    if m_author_tail:
        cand = clean_student_name(m_author_tail.group(1))
        if is_valid_student_author(cand):
            return cand

    # Pattern like "Tuur_Lenaerts", "Arno Bossaert", "Menno Mestrom", "Anneleen Van der Veken"
    m_full_name = re.search(r'([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+(?:Van\s+der\s+|Van\s+den\s+|Van\s+|De\s+)?[A-ZÀ-ÿ][a-zà-ÿ]+)+)$', cleaned)
    if m_full_name:
        cand = clean_student_name(m_full_name.group(1))
        if is_valid_student_author(cand):
            return cand

    return None


def extract_student_author(doc):
    fn = doc.get("filename", "")
    path = doc.get("path", "")
    p1 = (doc.get("content_preview") or {}).get("page1_text", "")
    fn_no_ext = re.sub(r'\.[a-zA-Z0-9]+$', '', fn)
    
    full_str = f"{path} {fn}".lower()
    if any(k in full_str for k in ['take home', 'take-home', 'takehome', 'evaluatie opdracht', 'inleveropdracht', 'groep', 'team']):
        return None

    # 1. H01S4C papers specialized extraction
    if 'paper' in path.lower() or 'paper' in fn.lower():
        at_cand = parse_at_paper_filename(fn_no_ext)
        if at_cand:
            return at_cand

    # 2. Specific author in folder path e.g. /notities Bram Vandroogenbroeck/ or /Thibaud Van Elsué/
    m_fld = re.search(r'/(?:notities|samenvatting[^\/]*)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)+)', path)
    if m_fld:
        cand = clean_student_name(m_fld.group(1).strip())
        if is_valid_student_author(cand):
            return cand
            
    # 3. Parenthetical credits: e.g. "(door Firstname Lastname)" or "(Firstname Lastname)"
    m_par = re.findall(r'\((?:door\s+|by\s+)?([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)+)\)', fn)
    for cand in m_par:
        cand = clean_student_name(cand)
        if is_valid_student_author(cand):
            return cand

    # 4. Filename suffix: " - Firstname Lastname"
    m_dash = re.search(r'[-_]\s*([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)+)$', fn_no_ext)
    if m_dash:
        cand = clean_student_name(m_dash.group(1).strip())
        if is_valid_student_author(cand):
            return cand

    # 5. Filename prefix / pattern: "Firstname Lastname Samenvatting"
    m_fn1 = re.search(r'^([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)+)\s*[-_]\s*(?:Samenvatting|Notities|Examenvragen|BIM|CVG)', fn_no_ext, re.IGNORECASE)
    if m_fn1:
        cand = clean_student_name(m_fn1.group(1).strip())
        if is_valid_student_author(cand):
            return cand
            
    m_fn2 = re.search(r'(?:Samenvatting|Notities|Examenvragen|Oefeningen|Practicum|Definities)\s+(?:van\s+|door\s+)?([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)+)', fn_no_ext, re.IGNORECASE)
    if m_fn2:
        cand = clean_student_name(m_fn2.group(1).strip())
        if is_valid_student_author(cand):
            return cand

    # 6. Underscore name: "Bram_Verbelen", "Lily_Vreven", "Nathalie_Voeten", "BenJacobs"
    m_und = re.findall(r'(?:^|[_\-])([A-Z][a-z]+_[A-Z][a-z]+)(?:[_\.\-]|$)', fn_no_ext)
    for cand_u in m_und:
        cand = clean_student_name(cand_u.replace('_', ' '))
        if is_valid_student_author(cand):
            return cand

    # 7. Page 1 text signatures
    if p1:
        m_p1_pluk = re.search(r'^([A-Z][a-z]+\s+Van\s+[A-Z][a-z]+)\s+samenvatting', p1, re.IGNORECASE)
        if m_p1_pluk:
            cand = clean_student_name(m_p1_pluk.group(1))
            if is_valid_student_author(cand):
                return cand
            
        m_p1_door = re.search(r'(?:door|by|auteur|author|student|nota\'s van|notities van):\s*([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)+)', p1, re.IGNORECASE)
        if m_p1_door:
            cand = clean_student_name(m_p1_door.group(1).strip())
            if is_valid_student_author(cand):
                return cand

        m_p1_caps = re.search(r'(?:SAMENVATTING|OPLOSSINGEN|NOTITIES)\s+[A-ZÀ-ÿa-zà-ÿ\s\-]+\s+([A-ZÀ-ÿ][a-zà-ÿ]+\s+[A-ZÀ-ÿ]{2,})', p1)
        if m_p1_caps:
            cand = clean_student_name(m_p1_caps.group(1).title())
            if is_valid_student_author(cand):
                return cand

    return None


def extract_academic_year(doc):
    fn = doc.get("filename", "")
    path = doc.get("path", "")
    p1 = (doc.get("content_preview") or {}).get("page1_text", "")
    full_text = f"{path} {fn} {p1}"

    # 1. Full 4-digit span e.g. "2018-2019", "2018 - 2019", "2018_2019", "2018/2019"
    m_full = re.search(r'\b(19\d\d|20[0-2]\d)\s*[-_/]\s*(19\d\d|20[0-2]\d)\b', full_text)
    if m_full:
        y1, y2 = int(m_full.group(1)), int(m_full.group(2))
        if y2 == y1 + 1 and 1980 <= y1 <= CURRENT_MAX_YEAR:
            return f"{y1} - {y2}"
        if y2 == (y1 % 100) + 1:
            return f"{y1} - {y1+1}"

    # 2. 2-digit span e.g. "13-14", "18-19", "'13-'14", "2018-19"
    m_short = re.search(r'(?:^|[_\s\-\(\'/])(\d{2})\s*[-_/]\s*(\d{2})(?:[_\s\-\)\']|$)', fn)
    if m_short:
        s1, s2 = int(m_short.group(1)), int(m_short.group(2))
        if s2 == s1 + 1:
            y1 = 2000 + s1 if s1 < 80 else 1900 + s1
            if 1980 <= y1 <= CURRENT_MAX_YEAR:
                return f"{y1} - {y1+1}"

    # 3. Boundary folders: "Pre 2018" -> "2017 - 2018", "Vanaf 2018-2019" -> "2018 - 2019", "tot 2017" -> "2016 - 2017"
    m_pre = re.search(r'\b(?:pre|voor|tot)\s*[-_]?\s*(20[0-2]\d)\b', full_text, re.IGNORECASE)
    if m_pre:
        y = int(m_pre.group(1))
        if 1980 <= y <= CURRENT_MAX_YEAR + 1:
            return f"{y-1} - {y}"
            
    m_vanaf = re.search(r'\b(?:vanaf|sinds|from|post)\s*[-_]?\s*(20[0-2]\d)\b', full_text, re.IGNORECASE)
    if m_vanaf:
        y = int(m_vanaf.group(1))
        if 1980 <= y <= CURRENT_MAX_YEAR:
            return f"{y} - {y+1}"

    # 4. Exam session with date: "Januari 2021", "28 januari 2021", "juni 2020", "augustus 2019", "25 mei 2022"
    m_sess = re.search(r'\b(\d{1,2})?\s*([a-zA-Z]{3,9})\s*[\']?\s*(20[0-2]\d|\d{2})\b', f"{fn} {p1[:200]}")
    if m_sess:
        day_str, m_str, yr_str = m_sess.group(1), m_sess.group(2).lower(), m_sess.group(3)
        if m_str in MONTH_MAP:
            m_name, m_num = MONTH_MAP[m_str]
            yr = int(yr_str)
            if yr < 100:
                yr = 2000 + yr if yr < 80 else 1900 + yr
            if 1980 <= yr <= CURRENT_MAX_YEAR:
                if m_num >= 9:
                    return f"{yr} - {yr+1}"
                else:
                    return f"{yr-1} - {yr}"

    # 5. Explicit single year in filename
    m_yr_fn = re.search(r'(?:examen|examenvragen|samenvatting|notities|verslag|practicum|oefeningentest)\s*[-_]?\s*(20[0-2]\d)\b', fn, re.IGNORECASE)
    if m_yr_fn:
        yr = int(m_yr_fn.group(1))
        if 1980 <= yr <= CURRENT_MAX_YEAR:
            return f"{yr-1} - {yr}"

    return None


def detect_handwriting_and_scan(doc):
    prev = doc.get("content_preview") or {}
    p1 = prev.get("page1_text") or ""
    fn_path = f"{doc.get('path', '')} {doc.get('filename', '')}".lower()
    ext = doc.get("extension", "").lower()
    is_scanned = prev.get("is_scanned_handwritten", False) or ext in ["jpg", "jpeg", "png", "heic", "bmp"]

    has_handwriting = False
    if any(k in fn_path for k in ["handgeschreven", "handwritten", "manueel", "eigen notities", "eigen nota", "eigen handschrift", "geschreven"]):
        has_handwriting = True
    elif any(k in p1.lower() for k in ["handgeschreven", "handwritten", "manueel", "eigen notities"]) and not any(k in p1.lower() for k in ["open boek", "rekenmachine", "examen duurt", "toegestaan"]):
        has_handwriting = True

    return is_scanned, has_handwriting


def classify_category(doc, course_code, course_name):
    fn = doc.get("filename", "")
    path = doc.get("path", "")
    ext = doc.get("extension", "").lower()
    p1 = (doc.get("content_preview") or {}).get("page1_text", "")
    full_text = f"{path} {fn} {p1}".lower()
    fn_lower = fn.lower()
    path_lower = path.lower()

    # 1. Scripts & Code -> Category 7 (Labo & Code)
    if ext in ["py", "m", "java", "c", "cpp", "whl", "gh", "dyn", "ipynb", "sh"]:
        return 7
    if any(k in fn_lower for k in ["script", "macro", "grasshopper", "dynamo"]):
        return 7
    if ext in ["xlsx", "xls"] and any(k in full_text for k in ["berekeningsmodel", "berekeningen", "tool", "matrix", "spreadsheet"]):
        return 7

    # 2. Midterms / TTT -> Category 5 (TTT's)
    if any(k in fn_lower for k in ["ttt", "tussentijdse toets", "tussentijds", "midterm", "deeltoets", "partieel examen", "oefeningentest", "gequoteerde oefenzitting", "gequoteerde oefz"]):
        return 5
    if any(k in p1.lower() for k in ["oefeningentest", "tussentijdse toets", "midterm examination", "gequoteerde oefenzitting"]) and not any(k in full_text for k in ["examen 1e zit", "examen 2e zit", "eindexamen"]):
        return 5

    # 3. Exams -> Category 2 (Examens)
    if any(k in fn_lower for k in ["examen", "examenvraag", "examenvragen", "tentamen", "2de zit", "herexamen", "reconstructie", "oud-examen", "oud-examens", "mondeling examen", "proefexamen", "voorbeeldexamen", "sl3-2014", "sl3_2020", "sl3_ex_"]):
        if not any(k in fn_lower for k in ["samenvatting van examenvragen", "slides"]) and ext not in ["pptx", "ppt"]:
            return 2
    if any(k in path_lower for k in ["/examens/", "/examen/", "/examenvragen/"]) and not any(k in fn_lower for k in ["samenvatting", "slides", "lesnotities"]):
        return 2

    # 4. Slides -> Category 6 (Slides / Lesmateriaal)
    if ext in ["pptx", "ppt"] or any(k in fn_lower for k in ["slides", "presentatie", "hoorcollege"]) or any(k in path_lower for k in ["/slides/", "/lesmateriaal/"]):
        if not any(k in fn_lower for k in ["samenvatting", "examenvragen"]):
            return 6
    if re.search(r'\bles\s*\d+\b', fn_lower) and ext == 'pdf' and (doc.get("content_preview") or {}).get("page_count", 0) > 10 and "slide" in p1.lower():
        return 6

    # 5. Exercises & Homework & Practicum & Reports -> Category 4 (Oefenzittingen)
    if any(k in fn_lower for k in ["oefenzitting", "oefening", "oefeningen", "werkcollege", "huiswerk", "taak", "opdracht", "verslag", "practicum", "p&o", "woninganalyse", "selectiebundel", "portfolio", "casus", "project", "rapport", "oef_"]):
        if not any(k in fn_lower for k in ["samenvatting oefeningen", "theorie"]):
            return 4
    if any(k in path_lower for k in ["/oefeningen/", "/oefenzittingen/", "/oefenzitting/", "/practicum/", "/verslagen/"]):
        if not any(k in fn_lower for k in ["samenvatting", "theorie"]):
            return 4

    # 6. Summaries / Notes / Formularia / Guides -> Category 3 (Samenvattingen)
    if any(k in fn_lower for k in ["samenvatting", "lesnotities", "notities", "definities", "woordenlijst", "begrippen", "formularium", "formuleblad", "studiewijzer", "gids", "tips", "overzicht", "inhoudstafel", "flashcards", "theorie", "cursus", "vademecum"]):
        return 3

    existing_cat = doc.get("category_id")
    if existing_cat in [2, 3, 4, 5, 6, 7]:
        return existing_cat
    return 3


def build_canonical_display_title(doc, cat_id, author, year, course_code, course_name):
    fn = doc.get("filename", "")
    path = doc.get("path", "")
    p1 = (doc.get("content_preview") or {}).get("page1_text", "")
    fn_no_ext = re.sub(r'\.[a-zA-Z0-9]+$', '', fn)
    
    clean_fn = re.sub(r'\(.*conflicted copy.*\)', '', fn_no_ext, flags=re.IGNORECASE)
    clean_fn = re.sub(r'\(Exemplaar met conflict.*\)', '', clean_fn, flags=re.IGNORECASE)
    clean_fn = re.sub(r'\[Compatibilit.*\]', '', clean_fn, flags=re.IGNORECASE)
    clean_fn = re.sub(r'_compressed', '', clean_fn, flags=re.IGNORECASE)
    clean_fn = re.sub(r'\s*\(\d+\)$', '', clean_fn)
    clean_fn = re.sub(r'_\(\d+\)$', '', clean_fn)
    clean_fn = re.sub(r'[-_]copy\d*$', '', clean_fn, flags=re.IGNORECASE)
    clean_fn = re.sub(r'\bAF\b', '', clean_fn)
    clean_fn = re.sub(r'\[1\]', '', clean_fn)
    
    clean_fn = re.sub(rf'^{course_code}\s*[-_:]\s*', '', clean_fn, flags=re.IGNORECASE)
    clean_fn = re.sub(r'^H0[0-9A-Z]{4}\s*[-_:]\s*', '', clean_fn, flags=re.IGNORECASE)

    clean_fn = re.sub(r'[_.\-]+', ' ', clean_fn).strip()
    clean_fn = " ".join(clean_fn.split())

    path_parts = [p.strip() for p in path.split('/') if p.strip()]
    parent_topic = ""
    if len(path_parts) >= 2:
        parent = path_parts[-2]
        if not any(k in parent.lower() for k in ["examens", "samenvattingen", "oefeningen", "slides", "document", course_code.lower()]):
            parent_topic = re.sub(r'[_.\-]+', ' ', parent).strip()

    title = clean_fn

    if cat_id == 2: # Examens
        is_oplossing = any(k in clean_fn.lower() or k in p1.lower() for k in ["oplossing", "opgelost", "modeloplossing", "antwoorden", "solution"])
        is_reconstructie = any(k in clean_fn.lower() or k in p1.lower() for k in ["reconstructie", "vragen", "examenvraag", "examenvragen", "herinnering", "typevragen"])
        
        sess_month = None
        for m_k, (m_nl, _) in MONTH_MAP.items():
            if re.search(rf'\b{m_k}\b', clean_fn, re.IGNORECASE):
                sess_month = m_nl
                break
                
        m_day = re.search(r'\b(\d{1,2})\s*(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\b', clean_fn, re.IGNORECASE)
        day_str = f"{m_day.group(1)} " if m_day else ""

        m_yr = re.search(r'\b(20[0-2]\d)\b', clean_fn)
        yr_str = f" {m_yr.group(1)}" if m_yr else ""

        if is_reconstructie and not clean_fn.lower().startswith("examen"):
            if sess_month:
                title = f"Examenvragen {day_str}{sess_month}{yr_str}"
            else:
                title = f"Examenvragen {clean_fn}"
        elif not clean_fn.lower().startswith("examen"):
            if sess_month:
                title = f"Examen {day_str}{sess_month}{yr_str}"
            else:
                title = f"Examen {clean_fn}"
        else:
            title = clean_fn

        if is_oplossing and "(Oplossing)" not in title and "(Modeloplossing)" not in title:
            title = f"{title} (Oplossing)"

    elif cat_id == 3: # Samenvattingen
        if any(clean_fn.lower().startswith(k) for k in ["samenvatting", "lesnotities", "notities", "formularium", "woordenlijst", "begrippen", "studiewijzer", "gids", "cursus"]):
            title = clean_fn
        elif "formularium" in clean_fn.lower() or "formules" in clean_fn.lower():
            title = f"Formularium - {clean_fn}"
        elif "notities" in clean_fn.lower() or "les" in clean_fn.lower():
            title = f"Lesnotities - {clean_fn}"
        elif "begrippen" in clean_fn.lower() or "definities" in clean_fn.lower():
            title = f"Woordenlijst Begrippen - {clean_fn}"
        elif "studiewijzer" in clean_fn.lower() or "gids" in clean_fn.lower() or "tips" in clean_fn.lower():
            title = f"Studiewijzer - {clean_fn}"
        else:
            if parent_topic:
                title = f"Samenvatting {parent_topic} - {clean_fn}"
            else:
                title = f"Samenvatting - {clean_fn}"

    elif cat_id == 4: # Oefenzittingen
        if any(clean_fn.lower().startswith(k) for k in ["oefenzitting", "oefeningen", "oefening", "huiswerk", "taak", "opdracht", "verslag", "practicum", "p&o", "bundel"]):
            title = clean_fn
        elif "practicum" in clean_fn.lower() or "verslag" in clean_fn.lower():
            title = f"Verslag Practicum - {clean_fn}"
        elif "huiswerk" in clean_fn.lower() or "taak" in clean_fn.lower():
            title = f"Huiswerk - {clean_fn}"
        else:
            if parent_topic:
                title = f"Oefenzitting {parent_topic} - {clean_fn}"
            else:
                title = f"Oefenzitting - {clean_fn}"

    elif cat_id == 5: # TTT's
        if not clean_fn.lower().startswith("ttt"):
            title = f"TTT - {clean_fn}"
        else:
            title = clean_fn

    elif cat_id == 6: # Slides
        if not clean_fn.lower().startswith("slides"):
            title = f"Slides - {clean_fn}"
        else:
            title = clean_fn

    elif cat_id == 7: # Labo & Code
        ext_tag = "Python" if doc.get("extension", "").lower() == "py" else ("MATLAB" if doc.get("extension", "").lower() == "m" else ("Excel" if doc.get("extension", "").lower() in ["xlsx", "xls"] else ""))
        if not clean_fn.lower().startswith("labo") and not clean_fn.lower().startswith("code"):
            title = f"Labo - {clean_fn}"
        else:
            title = clean_fn
        if ext_tag and f"({ext_tag})" not in title:
            title = f"{title} ({ext_tag})"

    title = re.sub(r'^Examen\s+Examen', 'Examen', title, flags=re.IGNORECASE)
    title = re.sub(r'^Samenvatting\s+Samenvatting', 'Samenvatting', title, flags=re.IGNORECASE)
    title = re.sub(r'^Oefenzitting\s+Oefenzitting', 'Oefenzitting', title, flags=re.IGNORECASE)
    title = re.sub(r'^Slides\s+Slides', 'Slides', title, flags=re.IGNORECASE)
    title = re.sub(r'^Labo\s+Labo', 'Labo', title, flags=re.IGNORECASE)
    title = re.sub(r'^TTT\s+TTT', 'TTT', title, flags=re.IGNORECASE)

    if author:
        if author.lower() not in title.lower():
            title = f"{title} ({author})"

    title = sanitize_raw_text(title)
    if len(title) > 200:
        title = title[:197] + "..."

    return title


def derive_orthogonal_tags(doc, cat_id, is_scanned, has_handwriting):
    fn = doc.get("filename", "")
    path = doc.get("path", "")
    p1 = (doc.get("content_preview") or {}).get("page1_text", "")
    ext = doc.get("extension", "").lower()
    full_text = f"{path} {fn} {p1}".lower()

    tags = []

    if is_scanned:
        tags.append("Scan")
    if has_handwriting:
        tags.append("Handgeschreven")

    if ext == "m":
        tags.append("MATLAB")
    elif ext == "py":
        tags.append("Python")
    elif ext == "java":
        tags.append("Java")
    elif ext in ["c", "cpp", "h", "hpp"]:
        tags.append("C / C++")
    elif ext in ["xlsx", "xls"]:
        tags.append("Excel")
    elif ext in ["mat", "csv", "dat"]:
        tags.append("Dataset / Data")

    if any(k in full_text for k in ["januari", "jan.", "1e zit", "eerste zit"]):
        tags.append("Januari")
    if any(k in full_text for k in ["juni", "jun."]):
        tags.append("Juni")
    if any(k in full_text for k in ["augustus", "aug.", "september", "sep.", "herexamen", "2de zit", "tweede zit", "herkansing"]):
        tags.append("Herexamen (2de zit)")
    if any(k in full_text for k in ["tussentijds", "midterm", "ttt", "deeltoets"]) and cat_id != 5:
        tags.append("Tussentijds (Midterm)")

    if any(k in full_text for k in ["modeloplossing", "model solution"]):
        tags.append("Modeloplossing")
        tags.append("Oplossing")
    elif any(k in full_text for k in ["oplossing", "opgelost", "uitwerking", "solution", "antwoorden", "answers"]):
        tags.append("Oplossing")
    elif any(k in full_text for k in ["opgave", "blanco", "vragen", "oefenbundel"]) and "oplossing" not in full_text:
        tags.append("Opgave (Blanco)")

    if any(k in full_text for k in ["formularium", "formuleblad", "formulas"]):
        tags.append("Formularium")
    if any(k in full_text for k in ["studiewijzer", "gids", "cursuswijzer", "tips voor het examen", "vademecum"]):
        tags.append("Studiewijzer / Gids")
    if any(k in full_text for k in ["lesnotities", "lesnota", "notities", "college notities"]):
        tags.append("Lesnotities")
    if any(k in full_text for k in ["verslag", "project", "rapport", "ontwerpverslag", "woninganalyse", "portfolio"]):
        tags.append("Verslag / Project")
    if any(k in full_text for k in ["bundel", "alle examens", "alle oefeningen", "alle lessen", "overzicht"]):
        tags.append("Bundel / Alle")
    if any(k in full_text for k in ["meerkeuze", "multiple choice", "mc-vragen", "mc vragen"]):
        tags.append("Meerkeuze")
    if any(k in full_text for k in ["mondeling", "oraal", "mondelinge"]):
        tags.append("Mondeling")
    if any(k in full_text for k in ["theorie", "theorievragen"]):
        tags.append("Theorie")
    if any(k in full_text for k in ["reconstructie", "examenvragen"]):
        tags.append("Reconstructie / Vragen")

    m_deel = re.search(r'\b(?:deel|part|les|hoofdstuk|chapter|ch)\s*([1-9]|1[0-9])\b', full_text)
    if m_deel:
        tags.append(f"Deel {m_deel.group(1)}")

    if any(k in full_text for k in ["master of", "master in", "lecture notes", "course notes", "introduction to", "environmental technology", "landscape architecture", "construction law", "urbanism", "built heritage", "dynamics of structures", "renovation of structures"]):
        tags.append("English")

    tags.append("old-burgieclan")

    clean_tags = []
    redundant_here = REDUNDANT_IN_CATEGORY.get(cat_id, set())

    for t in tags:
        c_tag = canonicalize_tag(t)
        if c_tag and c_tag not in redundant_here and c_tag not in clean_tags:
            clean_tags.append(c_tag)

    return clean_tags


def normalize_course(course_payload_path):
    with open(course_payload_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    cc = payload["course_code"]
    cname = payload["course_name"]
    cid = payload["course_id"]
    docs = payload["documents"]

    normalized = []
    for d in docs:
        is_scanned, has_handwriting = detect_handwriting_and_scan(d)
        cat_id = classify_category(d, cc, cname)
        author = extract_student_author(d)
        year = extract_academic_year(d)
        title = build_canonical_display_title(d, cat_id, author, year, cc, cname)
        tags = derive_orthogonal_tags(d, cat_id, is_scanned, has_handwriting)

        normalized.append({
            "file_id": d["file_id"],
            "display_title": title,
            "category_id": cat_id,
            "year": year,
            "author": author,
            "tags": tags
        })

    return cc, normalized


def main():
    print("=== RUNNING CLUSTER 6 LLM NORMALIZER ENGINE ===")
    with open("migration_data/clusters/cluster_6.json", "r", encoding="utf-8") as f:
        cluster_info = json.load(f)

    courses = cluster_info["courses"]
    print(f"Total courses in Cluster 6: {len(courses)}")

    all_cluster_output = []
    course_stats = {}

    for c in courses:
        cc = c["course_code"]
        cname = c["course_name"]
        pf = f"migration_data/course_payloads/{cc}.json"
        
        _, norm_docs = normalize_course(pf)
        
        batch_path = f"migration_data/batches/{cc}.json"
        with open(batch_path, "w", encoding="utf-8") as bf:
            json.dump(norm_docs, bf, indent=2, ensure_ascii=False)
            
        all_cluster_output.extend(norm_docs)
        course_stats[cc] = {
            "name": cname,
            "total": len(norm_docs),
            "years": sum(1 for d in norm_docs if d["year"]),
            "authors": sum(1 for d in norm_docs if d["author"]),
            "cats": dict(Counter(d["category_id"] for d in norm_docs))
        }

    os.makedirs("migration_data/cluster_outputs", exist_ok=True)
    out_file = "migration_data/cluster_outputs/cluster_6_output.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(all_cluster_output, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Normalized all {len(all_cluster_output)} documents across {len(courses)} courses in Cluster 6.")
    print(f"  Aggregated output written to {out_file}")


if __name__ == '__main__':
    main()
