#!/usr/bin/env python3
"""
08h_dry_run_5_courses.py
Extracts representative pilot datasets across 5 diverse course categories:
1. H09D9A: English Master's course with lecture notes & professor names
2. H01G7A: 2nd Bachelor mechanics with mixed exams & student authors
3. H01A0B: 1st Bachelor calculus with high-volume midterms (TTTs) & formularia
4. H01B6B: Code-heavy informatics course (MATLAB / Python / C scripts)
5. H01B0B: Image-heavy math course (Photo sequences / handwritten image sets)
"""

import json
import os
from collections import defaultdict

def main():
    in_file = "migration_data/manifest_final_for_import.json"
    with open(in_file, "r", encoding="utf-8") as f:
        records = json.load(f)

    target_courses = {
        "H09D9A": {"name": "Management Challenges in the Chemical Industry", "limit": 10},
        "H01G7A": {"name": "Toegepaste mechanica, deel 3", "limit": 25},
        "H01A0B": {"name": "Analyse, deel 1", "limit": 25},
        "H01B6B": {"name": "Informatica", "limit": 25},
        "H01B0B": {"name": "Toegepaste algebra", "limit": 30}
    }

    selected = []
    counts = defaultdict(int)
    
    for r in records:
        cc = r.get("course_code")
        if cc in target_courses and counts[cc] < target_courses[cc]["limit"]:
            selected.append(r)
            counts[cc] += 1

    print(f"=== Selected {len(selected)} documents across 5 representative test courses ===")
    for cc, info in target_courses.items():
        print(f"  - [{cc}] {info['name']}: {counts[cc]} documents")

    out_file = "migration_data/pilot_5_courses_input.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(selected, f, indent=2, ensure_ascii=False)
    print(f"\nSaved pilot input dataset to {out_file}")

if __name__ == '__main__':
    main()
