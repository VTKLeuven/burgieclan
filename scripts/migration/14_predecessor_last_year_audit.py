#!/usr/bin/env python3
"""
14_predecessor_last_year_audit.py
Analyzes all predecessor/successor course pairs and extracts:
- Predecessor Code & Name
- Successor Code & Name
- Last Active Year (from archive documents + KU Leuven history)
- Total Archive Document Count
"""

import json
from collections import defaultdict

with open('migration_data/manifest_final_standardized_validated.json') as f:
    docs = json.load(f)

# Pairs of (Predecessor Old Code, Successor New Code, Subject Name)
PREDECESSOR_PAIRS = [
    ('H01F2A', 'H0R18A', 'Bedrijfskunde en entrepreneurship -> Bedrijfskunde en ondernemen'),
    ('H01F2A', 'H0R19A', 'Bedrijfskunde en entrepreneurship -> Technische bedrijfsvoering'),
    ('H01O9A', 'H0N65B', 'Gegevensbanken -> Databases'),
    ('H01D2A', 'H01D2D', 'Informatieoverdracht en -verwerking -> Informatieoverdracht en -verwerking'),
    ('H00R8A', 'H04U3A', 'Numerieke modellering in de mechanica -> Numerical Modelling in Mechanical Engineering'),
    ('H00R7A', 'H04S6A', 'Aandrijftechniek -> Mechanical Drives'),
    ('H00S8B', 'H04B5B', 'Computer Aided Design (CAD) -> Computer Aided Design (CAD)'),
    ('H06M6A', 'H0P86A', 'Bouwfysica deel 2: Bouwakoestiek -> Bouwakoestiek'),
    ('H04Y9A', 'H0A21A', 'Tweefasenstroming -> Two-Phase Flow: Theory & Applications'),
    ('H00Q0A', 'H0H00A', 'Thermische systemen -> Thermal Systems'),
    ('H01E4A', 'H0V09A', 'Geologie -> Toegepaste geologie en mineralogie'),
    ('H01C4B', 'H01C4C', 'Wijsbegeerte en ethiek -> Wijsbegeerte en ethiek'),
    ('H08W1A', 'H0H06A', 'Sterkteleer 2 -> Sterkteleer 2'),
    ('H05S2A', 'H0E89A', 'Mobile Networks -> Mobile Networks'),
    ('H09N91A', 'H06E2A', 'Quantum Physics II -> Quantum Physics II'),
    ('H06F0A', 'H06F0B', 'Semiconductor Devices -> Semiconductor Devices'),
    ('H05B5A', 'H05A0A', 'Digitale communicatiesystemen -> Digital Communication Systems'),
    ('H07S3A', 'H03Y1A', 'Elasticiteit en plasticiteit -> Elasticiteit en plasticiteit'),
    ('H01H5A', 'H0N71B', 'Grondmechanica -> Grondmechanica'),
    ('H01J7A', 'H0R12A', 'Transportverschijnselen (CIT) -> Transportverschijnselen (Core)'),
    ('H01M8A', 'H0R57A', 'Systeemtheorie & Regeltechniek (ELT) -> Systeemtheorie & Regeltechniek (Core)'),
    ('H08W3A', 'H0H51A', 'Sterkteleer 3 -> Elasticiteits- en plasticiteitsleer (Sterkteleer 3)')
]

# Track document years per course code (and path matches)
course_years = defaultdict(set)
course_doc_counts = defaultdict(int)

for d in docs:
    p = d.get('path', '')
    fn = d.get('filename', '')
    cc = d.get('course_code')
    y = d.get('year')
    
    full_text = f"{fn} {p}"
    
    if y:
        course_years[cc].add(y)
    course_doc_counts[cc] += 1
    
    # Also check if predecessor code is mentioned in old folders
    for old_c, new_c, _ in PREDECESSOR_PAIRS:
        if old_c in full_text:
            if y:
                course_years[old_c].add(y)
            course_doc_counts[old_c] += 1

print(f"{'Predecessor (Old)':<18} | {'Successor (New)':<18} | {'Last Active Year':<18} | {'Docs':<6} | {'Subject Description'}")
print("-" * 110)

for old_code, new_code, desc in PREDECESSOR_PAIRS:
    years = sorted(list(course_years.get(old_code, set())))
    last_year = years[-1] if years else "2019 - 2020 (reform)"
    docs_count = course_doc_counts.get(old_code, 0)
    print(f"{old_code:<18} | {new_code:<18} | {last_year:<18} | {docs_count:<6} | {desc}")
