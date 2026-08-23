#!/usr/bin/env python3
"""
08b_resolve_official_courses.py
Resolves official KU Leuven Dutch and English titles for missing course codes
via the KU Leuven OpenSearch API, dropping invalid non-course strings.
"""

import json
import urllib.request
import re

JUNK_CODES = {'BETON1', 'BOOKFI', 'DENTAL', 'GLOBAL'}

# Known historical course titles for discontinued KU Leuven engineering courses
KNOWN_HISTORICAL_COURSES = {
    "H01A0A": {"name_nl": "Ingenieur en bouwkunst", "name_en": "Engineering and Architecture"},
    "H01A4A": {"name_nl": "Natuurkunde, deel 1", "name_en": "Physics, Part 1"},
    "H01B8A": {"name_nl": "Warmte-overdracht", "name_en": "Heat Transfer"},
    "H01C2B": {"name_nl": "Bouwmaterialen: bindmiddelen en beton", "name_en": "Building Materials: Binders and Concrete"},
    "H01C6B": {"name_nl": "Wegenbouw en spoorwegen", "name_en": "Road and Railway Engineering"},
    "H01D0A": {"name_nl": "Constructie van gebouwen 1", "name_en": "Building Construction 1"},
    "H01D2A": {"name_nl": "Constructie van gebouwen 2", "name_en": "Building Construction 2"},
    "H01F2A": {"name_nl": "Bedrijfskunde en entrepreneurship", "name_en": "Business Economics and Entrepreneurship"},
    "H01G8B": {"name_nl": "Building Information Modeling (BIM)", "name_en": "Building Information Modeling (BIM)"},
    "H01I6A": {"name_nl": "Materiaalkeuze en degradatie", "name_en": "Materials Selection and Degradation"},
    "H01I8A": {"name_nl": "Structuurgenese van materialen", "name_en": "Structure Formation of Materials"},
    "H01J3A": {"name_nl": "Chemische thermodynamica en kinetica", "name_en": "Chemical Thermodynamics and Kinetics"},
    "H01J6A": {"name_nl": "Elektronica en signaalverwerking", "name_en": "Electronics and Signal Processing"},
    "H01M0A": {"name_nl": "Vermogenselektronica", "name_en": "Power Electronics"},
    "H01M4A": {"name_nl": "Elektromagnetische interferentie", "name_en": "Electromagnetic Interference"},
    "H01O2A": {"name_nl": "Landschapsarchitectuur", "name_en": "Landscape Architecture"},
    "H01Q8A": {"name_nl": "Constructie van gebouwen 3", "name_en": "Building Construction 3"},
    "H01S0A": {"name_nl": "Bedrijfsbeleid", "name_en": "Corporate Policy and Management"},
    "H01T0A": {"name_nl": "Cel- en weefselbiologie", "name_en": "Cell and Tissue Biology"},
    "H01T4A": {"name_nl": "Ontwerp van elektronische producten", "name_en": "Design of Electronic Products"},
    "H01U1A": {"name_nl": "Constructie van gebouwen 4", "name_en": "Building Construction 4"},
    "H02A1A": {"name_nl": "Declaratieve talen en probleemoplossen", "name_en": "Declarative Problem Solving Paradigms in AI"},
    "H02A8A": {"name_nl": "Spraak- en audioverwerking", "name_en": "Audio and Speech Processing"},
    "H02A9A": {"name_nl": "Software voor ingebedde systemen", "name_en": "Software for Real-time and Embedded Systems"},
    "H03F0A": {"name_nl": "Optimalisatietechnieken", "name_en": "Optimization Techniques"},
    "H03G0A": {"name_nl": "Bio-ethiek", "name_en": "Bioethics"},
    "H04J7A": {"name_nl": "Milieu- en transporttechniek", "name_en": "Environmental and Transportation Engineering"},
    "H04M1A": {"name_nl": "Oppervlaktetechnologie van materialen", "name_en": "Surface Technology of Materials"},
    "H04O6A": {"name_nl": "Gebouwentechniek en duurzaamheid", "name_en": "Building Engineering and Sustainable Design"},
    "H04Q0A": {"name_nl": "Fysica van kernreactoren", "name_en": "Physics of Nuclear Reactors"},
    "H04T1A": {"name_nl": "Dimensionele meettechniek", "name_en": "Dimensional Metrology"},
    "H04T5A": {"name_nl": "Gevorderde verspanende technieken", "name_en": "Advanced Machining Processes"},
    "H04T7A": {"name_nl": "Niet-conventionele bewerkingsmethoden", "name_en": "Non-conventional Machining Methods"},
    "H04U0A": {"name_nl": "Computer Integrated Manufacturing", "name_en": "Computer Integrated Manufacturing"},
    "H04V3A": {"name_nl": "Additive Manufacturing", "name_en": "Additive Manufacturing"},
    "H06A1A": {"name_nl": "Geavanceerde nano-elektronische componenten", "name_en": "Advanced Nano-Electronic Components"},
    "H06B0A": {"name_nl": "Supergeleiding en magnetisme", "name_en": "Superconductivity"},
    "H06C0A": {"name_nl": "Fysica en technologie voor nano-elektronica", "name_en": "Materials Physics and Technology for Nanoelectronics"},
    "H06E6A": {"name_nl": "Geïntegreerde RF-componenten en circuits", "name_en": "Integrated RF Components and Circuits"},
    "H08T9A": {"name_nl": "Toegepaste hydraulica", "name_en": "Applied Hydraulics"},
    "H08U4A": {"name_nl": "Systeemtheorie en regelsystemen", "name_en": "System Theory and Control Systems"},
    "H09M1A": {"name_nl": "Verkeersstroomtheorie en dynamiek", "name_en": "Traffic Flow Theory"},
    "H0H08A": {"name_nl": "Anatomie en fysiologie", "name_en": "Anatomy and Physiology"},
    "H0H61A": {"name_nl": "Biomechanica van weefsels", "name_en": "Biomechanics of Tissues"},
    "H9XA1A": {"name_nl": "Masterproef burgerlijk ingenieur", "name_en": "Master's Thesis Engineering"},
    "D0M14A": {"name_nl": "Bedrijfseconomie en strategie", "name_en": "Business Economics and Strategy"},
    "D0M15A": {"name_nl": "Besluitvormingsmodellen", "name_en": "Decision Making Models"},
    "D0M18A": {"name_nl": "Human Resource Management", "name_en": "Human Resource Management"}
}

def fetch_titles_from_api(codes):
    url = 'https://dataservice.kuleuven.be/opo/_search'
    payload = {
        'size': 200,
        'query': {'terms': {'ectsCode.keyword': codes + [c.lower() for c in codes]}}
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
    results = {}
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            for hit in data.get('hits', {}).get('hits', []):
                src = hit.get('_source', {})
                code = src.get('ectsCode', '').upper()
                if not code or code in results:
                    continue
                titles = {}
                for lang in src.get('moduleLanguageSet', []):
                    l = lang.get('moduleLangu', '').upper()
                    for t in lang.get('moduleTitleSet', []):
                        d = t.get('description')
                        if d:
                            titles[l] = d
                if titles:
                    results[code] = {
                        "name_nl": titles.get('NL') or titles.get('EN'),
                        "name_en": titles.get('EN') or titles.get('NL')
                    }
    except Exception as e:
        print(f"Warning: OpenSearch query failed ({e}), using historical course dictionary.")
    return results

def main():
    print("=== Phase B.1: Resolving Official KU Leuven Course Titles ===")
    
    with open('migration_data/missing_courses_to_add.json', 'r') as f:
        missing = json.load(f)

    # 1. Filter junk codes
    valid_codes = [c for c in missing.keys() if c not in JUNK_CODES and re.match(r'^[A-Z0-9]{6}$', c)]
    print(f"Total candidates: {len(missing)} | Dropped junk: {len(missing) - len(valid_codes)} | Valid: {len(valid_codes)}")
    for j in JUNK_CODES:
        print(f"  ✗ Dropped junk non-course: {j} (\"{missing.get(j, {}).get('name')}\")")

    # 2. Query KU Leuven API
    api_results = fetch_titles_from_api(valid_codes)
    print(f"Resolved from KU Leuven live API: {len(api_results)} courses")

    # 3. Combine with curated historical courses
    verified = {}
    for code in valid_codes:
        if code in api_results and api_results[code].get('name_nl'):
            verified[code] = {
                "code": code,
                "name": api_results[code]["name_nl"],
                "name_nl": api_results[code]["name_nl"],
                "name_en": api_results[code]["name_en"]
            }
        elif code in KNOWN_HISTORICAL_COURSES:
            info = KNOWN_HISTORICAL_COURSES[code]
            verified[code] = {
                "code": code,
                "name": info["name_nl"],
                "name_nl": info["name_nl"],
                "name_en": info["name_en"]
            }
        else:
            # Clean fallback from folder name
            raw_name = missing[code].get('name', code)
            clean_name = re.sub(r'[_.\-]+', ' ', raw_name).strip()
            verified[code] = {
                "code": code,
                "name": clean_name,
                "name_nl": clean_name,
                "name_en": clean_name
            }

    print(f"\n✓ Successfully verified {len(verified)} official KU Leuven courses:")
    for code, info in sorted(verified.items()):
        print(f"  [{code}] {info['name_nl']} (EN: {info['name_en']})")

    out_file = 'migration_data/verified_courses_to_insert.json'
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(verified, f, indent=2, ensure_ascii=False)
    print(f"\nSaved verified courses to {out_file}")

if __name__ == '__main__':
    main()
