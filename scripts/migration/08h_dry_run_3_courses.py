#!/usr/bin/env python3
"""
08h_dry_run_3_courses.py
Generates the prompt payload and runs the normalizer logic on 3 representative courses:
1. H09D9A (Management Challenges in the Chemical Industry - 8 files)
2. H01G7A (Toegepaste mechanica, deel 3 - 84 files)
3. H01A0B (Analyse, deel 1 - 20 sample files)
"""

import json
import os
import csv
import re

def prepare_dry_run_dataset():
    in_file = "migration_data/manifest_final_for_import.json"
    with open(in_file, "r", encoding="utf-8") as f:
        records = json.load(f)

    courses_target = {
        "H09D9A": "Management Challenges in the Chemical Industry",
        "H01G7A": "Toegepaste mechanica, deel 3",
        "H01A0B": "Analyse, deel 1"
    }

    selected = []
    h01a0b_count = 0
    for r in records:
        cc = r.get("course_code")
        if cc == "H09D9A" or cc == "H01G7A":
            selected.append(r)
        elif cc == "H01A0B" and h01a0b_count < 25:
            selected.append(r)
            h01a0b_count += 1

    print(f"Total dry-run sample documents selected: {len(selected)}")
    by_c = {}
    for r in selected:
        by_c.setdefault(r.get("course_code"), []).append(r)
    for c, docs in by_c.items():
        print(f"  - [{c}] {courses_target.get(c)}: {len(docs)} documents")

    out_file = "migration_data/pilot_3_courses_input.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(selected, f, indent=2, ensure_ascii=False)
    print(f"Saved pilot dataset to {out_file}")

if __name__ == '__main__':
    prepare_dry_run_dataset()
