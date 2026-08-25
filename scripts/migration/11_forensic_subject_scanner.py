#!/usr/bin/env python3
"""
11_forensic_subject_scanner.py
Forensic semantic mismatch scanner across all 15,125 documents.
"""

import json
import re
from collections import defaultdict

with open('migration_data/manifest_final_standardized_validated.json') as f:
    docs = json.load(f)

print(f"Scanning all {len(docs)} documents for semantic and subject mismatches...")

# Map of major subject keywords to their canonical course codes
SUBJECT_SIGNATURES = [
    (r'\bthermo(?:dynamica)?\b', ['H01B4B', 'H01K9A', 'H01J3A', 'H01B4A', 'H00Q0A', 'H0H00A', 'H06T0A', 'H0R12A', 'H01J7A'], 'Thermodynamica'),
    (r'\bfluidum(?:mechanica)?\b|\bfluid mechanics\b', ['H08W4A', 'H08W5A', 'H01I4A', 'H06X4B', 'H0R12A', 'H01J7A', 'H00D0B', 'H06T0A'], 'Fluidummechanica'),
    (r'\bsterkteleer\s*1\b', ['H08Z8A', 'H01B0B', 'H01B0A'], 'Sterkteleer 1'),
    (r'\bsterkteleer\s*2\b', ['H0H06A', 'H08W1A', 'H01C8A', 'H01C8B'], 'Sterkteleer 2'),
    (r'\bsterkteleer\s*3\b', ['H0H51A', 'H08W3A'], 'Sterkteleer 3'),
    (r'\blineaire algebra\b', ['H01A8A', 'H01A8B'], 'Lineaire algebra'),
    (r'\borganische scheikunde\b|\borganische chemie\b', ['H01C6A'], 'Organische Scheikunde'),
    (r'\bwijsbegeerte\b|\bfilosofie\b|\bphilosophy\b', ['H01C4C', 'H01C4B', 'H03G0A'], 'Wijsbegeerte'),
    (r'\bgeologie\b|\bgeology\b', ['H0V09A', 'H01E4A'], 'Geologie'),
    (r'\beindige elementen\b|\bfinite elements?\b', ['H04M0B', 'H04U6A', 'H04U3A'], 'Eindige elementen'),
    (r'\bnumerieke wiskunde\b', ['H01D8B', 'H04U3A', 'H04U4A', 'H9X34A'], 'Numerieke wiskunde'),
    (r'\brotsmechanica\b|\brock mechanics\b', ['H01N5A'], 'Rotsmechanica'),
    (r'\bgrondmechanica\b|\bsoil mechanics\b', ['H0N71B'], 'Grondmechanica'),
    (r'\bbouwfysica\b|\bbuilding physics\b', ['H01H3B', 'H04F1A'], 'Bouwfysica'),
    (r'\bbouwmechanica\b', ['H01I0B'], 'Bouwmechanica'),
    (r'\bbouwakoestiek\b|\bacoustics\b', ['H0P86A', 'H06M6A'], 'Bouwakoestiek'),
    (r'\bcelbiologie\b|\bcell biology\b', ['H03F0A', 'H0R25A', 'H01T0A', 'H0H08A'], 'Celbiologie'),
    (r'\banatomie\b|\banatomy\b', ['H0H08A'], 'Anatomie'),
    (r'\bdatabases?\b|\bgegevensbanken\b', ['H0N65B', 'H01O9A'], 'Databases'),
    (r'\belectronic transport\b', ['H0G03A'], 'Electronic Transport'),
    (r'\bsignaalverwerking\b|\bsignalen en systemen\b', ['H01L6A', 'H02A8A', 'H09M0A'], 'Signaalverwerking'),
]

mismatches = []

for d in docs:
    cc = d.get('course_code')
    cname = d.get('course_name', '')
    p = d.get('path', '')
    fn = d.get('filename', '')
    title = d.get('canonical_title', '')
    
    full_text = f"{fn} {title} {p}".lower()
    
    for pattern, allowed_codes, subject_name in SUBJECT_SIGNATURES:
        if re.search(pattern, full_text, re.IGNORECASE):
            if cc not in allowed_codes:
                if not any(k in cname.lower() for k in subject_name.lower().split('/')):
                    # Exclude general folders
                    if not any(k in full_text for k in ['p&o', 'bachelorproef', 'schakel', 'anki', 'flashcard', 'samenvatting overzicht']):
                        mismatches.append({
                            'subject': subject_name,
                            'assigned_code': cc,
                            'assigned_name': cname,
                            'path': p,
                            'filename': fn,
                            'title': title
                        })

print(f"Total flagged subject/course discrepancies: {len(mismatches)}")

by_group = defaultdict(list)
for m in mismatches:
    key = (m['assigned_code'], m['assigned_name'], m['subject'])
    by_group[key].append(m)

for (cc, cname, subj), items in sorted(by_group.items(), key=lambda x: -len(x[1])):
    print(f"=== Assigned to [{cc}] {cname} | Detected Subject: \"{subj}\" ({len(items)} docs) ===")
    for item in items[:3]:
        print(f"   • Path: {item['path']}")
        print(f"     Title: {item['title']}")
    print()
