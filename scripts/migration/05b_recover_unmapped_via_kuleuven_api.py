#!/usr/bin/env python3
"""
05b_recover_unmapped_via_kuleuven_api.py
Deep recursive path inspection & KU Leuven API resolution for all unmapped files.
"""

import json
import urllib.request
import urllib.parse
import re
import os

# Comprehensive dictionary of course equivalents and KU Leuven codes
KNOWN_MANUAL_EQUIVALENTS = {
    'surface technology': 'H04M1A',
    'oppervlaktetechnologie': 'H04M1A',
    'Wegen, bruggen en tunnels': 'H01C6B',
    'Statistische methoden voor biomedische': 'H0H61A',
    'Environmental and Transportation': 'H04J7A',
    'Landscape Architecture': 'H01O2A',
    'Modern Data Analytics': 'H02D1A',
    'Human resource management': 'D0M18A',
    'Audio and Speech Processing': 'H02A8A',
    'cvg3': 'H01Q8A',
    'cvg 3': 'H01Q8A',
    'Constructie van gebouwen 3': 'H01Q8A',
    'Numerical Techniques': 'H04U3A',
    'Marketing': 'D0M14A',
    'Bouwmaterialen: bindmiddelen': 'H01C2B',
    'Materialen gebruik & degradatie': 'H01I6A',
    'Niet-conventionele bewerkingsmethoden': 'H04T7A',
    'Mechanisch gedrag van materialen': 'H01J6A',
    'Beton 1': 'H01D4B',
    'Thermo en kinetica': 'H01J3A',
    'Constructie van gebouwen 4': 'H01U1A',
    'cvg 2': 'H01D2A',
    'cvg2': 'H01D2A',
    'thud': 'H01B4B',
    'Management accounting': 'H01S0A',
    'Decision Making': 'D0M15A',
    'GIS': 'H09M0A',
    'Traffic Engineering': 'H09M1A',
    'Advanced Programming Languages for AI': 'H02A5A',
    'Computer Integrated Manufacturing': 'H04U0A',
    'Structurele materialen': 'H01I8A',
    'Productinnovatie en industriële marketing': 'D0M14A',
    'Additive Manufacturing': 'H04V3A',
    'Aanvullende natuurkunde': 'H01A4A',
    'Analyse (met boek Pearson)': 'H01A0B',
    'Systeemtheorie': 'H08U4A',
    'Bedrijfskunde & entrepreneurship': 'H01F2A',
    'Hydraulica': 'H08T9A',
    'Anatomie': 'H0H08A',
    'Advanced Nano-Electronic Components': 'H06A1A',
    'Physics of Nuclear Reactors': 'H04Q0A',
    'Constructiematerialen': 'H9XA1A',
    'Electromagnetic Interference': 'H01M4A',
    'EMC': 'H01M4A',
    'Cell Biology': 'H03F0A',
    'human biotechnology': 'H01T4A',
    'bioethics': 'H03G0A',
    'Fundamenten van VR en AR': 'H02C8A',
    'Software for Real-time and Embedded Systems': 'H02A9A',
    'Superconductivity': 'H06B0A',
    'Analyse II': 'H01A2B',
    'Analyse 2': 'H01A2B',
    'oefeningen CVG': 'H01D0A',
    'architectuurtheorie 3': 'H01B4B',
    'Sanitaire bouwwerken': 'H01D4B',
    'Materials physics and technology for nanoelectronics': 'H06C0A',
    'Failure Analysis': 'H01I6A',
    'Wegenbouw': 'H01C6B',
    'Ingenieur en bouwkunst': 'H01A0A',
    'Ontwerp van contructiecomponenten: beton': 'H01D4B',
    'Verkeersstroomtheorie': 'H09M1A',
    'Gids voor eerstejaars': 'H01A0B',
    'Programmahervorming_B1': 'H01A0B',
    'Anki Flashcards Semester 1': 'H01A0B',
    'Anki Flashcards Semester 2': 'H01A2B',
    'Anki Flashcards Semester 3': 'H01B0B',
    'Anki Flashcards Semester 4 WTK': 'H01B8A',
    'Anki Flashcards Semester 5 WTK': 'H08W4A',
    'Anki Flashcards Semester 6 WTK': 'H08W5A',
    'Anki Flashcards Semester 4 ELT': 'H01L4A',
    'Anki Flashcards Semester 5 ELT': 'H01L6A',
    'Anki Flashcards Semester 6 ELT': 'H01M0A',
    'Anki Flashcards Semester 5 Gemeenschappelijk': 'H01F2A',
    'mogelijke examenvragen': 'H01A0B',
    'alleexamenvragenjanuari2015': 'H01B0B',
    'Examens B1RA sem1': 'H01A0B',
    'Declarative Problem Solving Paradigms in AI': 'H02A1A',
    'Natural language processing': 'H02C1A',
    'Programming langueages and programming methodologies': 'H02A5A',
    'Scripting langueages': 'H02A7A',
    'Uncertainty in artificial intelligence': 'H02A3A',
    'Security of Network and Computer Infrastructure': 'H05E1B',
    'SNCI': 'H05E1B',
    'Open Channel Flow': 'H01C8B',
    'BEESD': 'H04O6A',
    'BIM': 'H01G8B',
    'Seminarie Individueel': 'H01B4B',
    'Wonen': 'H01B4B',
    'Cel- en Weefselbiologie': 'H01T0A',
    'Ternary phase diagrams': 'H01J3A',
    'Engineering Statistics': 'H01B2B',
    'CVG (2012-2013)': 'H01D2A',
    'notities Existenz': 'H01U1A',
    'Existenz': 'H01U1A',
    'Sanitaire bouwwerken': 'H01D4B',
    'Verkeersstroomtheorie': 'H09M1A',
    'Wegenbouw': 'H01C6B',
    'mogelijke examenvragen': 'H01A0B',
    'alleexamenvragenjanuari2015': 'H01B0B',
    'Examens B1RA': 'H01A0B',
    'imaging 2': 'H01V0A',
    'MIA': 'H01V0A',
    'DimensioneleMeettechniek': 'H04T1A',
    'GevorderdeVerspanendeTechnieken': 'H04T5A',
    'Kruth': 'H04T5A',
    'Lauwers': 'H04T5A',
    'E&P': 'H01J6A',
    'EnP': 'H01J6A',
    'CAD-CAM': 'H04U0A',
    'CADCAM': 'H04U0A',
    'h04W8': 'H04U0A',
    'Feature_extractie': 'H04U0A',
    'Production systems': 'H04U0A',
    'Natuurkunde 1 (prof Indekeu': 'H01A4A',
    'Natuurkunde 1': 'H01A4A',
    'computergeintegreerde_productie': 'H04U0A',
    'Derde semester': 'H04U0A',
    'DEP': 'H01T4A',
    'exam (for int students': 'H03F0A',
}


def search_kuleuven_opo(code):
    url = 'https://dataservice.kuleuven.be/opo/_search'
    payload = {
        'size': 2,
        'query': {
            'query_string': {
                'query': code,
                'fields': ['activitySet.ectsCode^10', 'studySchemeCourseId^10', 'courseTitleSet.description^5']
            }
        }
    }
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'User-Agent': 'Burgieclan-Migration/1.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception:
        return {'hits': {'hits': []}}


def resolve_file(item, catalog):
    path = item['path']
    filename = item['filename']
    full_str = f"{path}/{filename}"
    
    # 1. Check known manual equivalents against all path segments
    for pattern, code in KNOWN_MANUAL_EQUIVALENTS.items():
        if pattern.lower() in full_str.lower():
            if code in catalog['courses_by_code']:
                c = catalog['courses_by_code'][code]
                return c['id'], c['code'], c['name'], 'known_manual_equivalent'
            else:
                return None, code, pattern, 'missing_kuleuven_course'
                
    # 2. Extract potential 6-char codes from any path segment
    segments = [s.strip() for s in path.split('/') if s.strip()]
    for seg in reversed(segments):
        codes = re.findall(r'\b([A-Z0-9]{6})\b', seg, re.IGNORECASE)
        for code in codes:
            code_up = code.upper()
            if code_up in catalog['courses_by_code']:
                c = catalog['courses_by_code'][code_up]
                return c['id'], c['code'], c['name'], 'code_in_path_segment'
            elif code_up.startswith('H') or code_up.startswith('G') or code_up.startswith('D') or code_up.startswith('B'):
                return None, code_up, seg, 'missing_kuleuven_course'
                
    # 3. Check fuzzy matches against existing catalog
    for seg in reversed(segments):
        seg_lower = seg.lower()
        if len(seg_lower) < 5 or any(k in seg_lower for k in ['semester', 'bach', 'master', 'fase', 'phase', 'options', 'optie', 'uitdovend']):
            continue
        for c in catalog['courses']:
            if len(c['name_nl']) > 6 and (seg_lower in c['name_nl'].lower() or c['name_nl'].lower() in seg_lower):
                return c['id'], c['code'], c['name'], 'substring_name_match'
            if len(c['name_en']) > 6 and (seg_lower in c['name_en'].lower() or c['name_en'].lower() in seg_lower):
                return c['id'], c['code'], c['name'], 'substring_name_match'
                
    return None, None, None, 'unresolved'


def main():
    print("=== Step 5b: Deep KU Leuven Resolution for Unmapped Files ===")
    
    with open('migration_data/course_catalog.json', 'r', encoding='utf-8') as f:
        catalog = json.load(f)
        
    with open('migration_data/unmapped_residue.json', 'r', encoding='utf-8') as f:
        unmapped_files = json.load(f)
        
    print(f"Deep analyzing {len(unmapped_files):,} unmapped files...")
    
    import importlib.util
    spec = importlib.util.spec_from_file_location("step4", "scripts/migration/04_deterministic_classify.py")
    step4 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(step4)
    
    recovered_entries = []
    missing_courses_to_add = {}
    true_unresolved = []
    
    for item in unmapped_files:
        c_id, c_code, c_name, res_type = resolve_file(item, catalog)
        
        if c_id: # Matched existing course
            cat_info = step4.detect_category(item['path'], item['filename'], item.get('extension', ''))
            year = step4.extract_year(item['filename'], item['path'], item.get('mtime', 0))
            title = step4.clean_title(item['filename'])
            tags = step4.extract_tags(item['filename'], item['path'])
            
            recovered_entries.append({
                **item,
                'title': title,
                'year': year,
                'category_id': cat_info[0],
                'category_name_nl': cat_info[1],
                'category_name_en': cat_info[2],
                'category_proposal': cat_info[3] if len(cat_info) > 3 else None,
                'tags': tags,
                'course_id': c_id,
                'course_code': c_code,
                'course_name': c_name,
                'match_type': f"deep_recovery_{res_type}",
                'match_score': 0.95
            })
        elif c_code: # Missing KU Leuven course to add
            if c_code not in missing_courses_to_add:
                # Query opo to get clean title
                opo_res = search_kuleuven_opo(c_code)
                hits = opo_res.get('hits', {}).get('hits', [])
                name_nl = c_name
                name_en = c_name
                if hits:
                    src = hits[0].get('_source', {})
                    for t in src.get('courseTitleSet', []):
                        if t.get('language') == 'NL' or t.get('langu') == 'NL':
                            name_nl = t.get('description', name_nl)
                        elif t.get('language') == 'EN' or t.get('langu') == 'EN':
                            name_en = t.get('description', name_en)
                missing_courses_to_add[c_code] = {
                    'code': c_code,
                    'name': name_nl,
                    'name_nl': name_nl,
                    'name_en': name_en
                }
                
            cat_info = step4.detect_category(item['path'], item['filename'], item.get('extension', ''))
            year = step4.extract_year(item['filename'], item['path'], item.get('mtime', 0))
            title = step4.clean_title(item['filename'])
            tags = step4.extract_tags(item['filename'], item['path'])
            
            recovered_entries.append({
                **item,
                'title': title,
                'year': year,
                'category_id': cat_info[0],
                'category_name_nl': cat_info[1],
                'category_name_en': cat_info[2],
                'category_proposal': cat_info[3] if len(cat_info) > 3 else None,
                'tags': tags,
                'course_id': None, # To be filled when course row is added
                'course_code': c_code,
                'course_name': missing_courses_to_add[c_code]['name_nl'],
                'match_type': f"deep_recovery_{res_type}",
                'match_score': 0.90
            })
        else:
            true_unresolved.append(item)
            
    print(f"\n=== Deep Resolution Results ===")
    print(f"Total Unmapped Processed: {len(unmapped_files):,}")
    print(f"Recovered Files:          {len(recovered_entries):,} ({len(recovered_entries)/len(unmapped_files)*100:.1f}%)")
    print(f"True Unresolved Residue:  {len(true_unresolved):,} ({len(true_unresolved)/len(unmapped_files)*100:.1f}%)")
    print(f"Missing KU Leuven Courses Discovered: {len(missing_courses_to_add)}")
    for code, info in sorted(missing_courses_to_add.items()):
        print(f"  + {code}: {info['name_nl']}")

    # Save outputs
    with open('migration_data/recovered_entries.jsonl', 'w', encoding='utf-8') as f:
        for r in recovered_entries:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
            
    with open('migration_data/missing_courses_to_add.json', 'w', encoding='utf-8') as f:
        json.dump(missing_courses_to_add, f, indent=2, ensure_ascii=False)
        
    with open('migration_data/true_unresolved.json', 'w', encoding='utf-8') as f:
        json.dump(true_unresolved, f, indent=2, ensure_ascii=False)
        
    print("\n=== Step 5b Complete ===")


if __name__ == '__main__':
    main()
