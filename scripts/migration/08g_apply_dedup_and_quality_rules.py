#!/usr/bin/env python3
"""
08g_apply_dedup_and_quality_rules.py
Applies data quality rules:
1. Deduplicates on (file_id, course_id)
2. Nullifies fallback upload-mtime years (year = None)
3. Maps expanded category taxonomy (6: Slides, 7: Labo & Code)
4. Merges Page 1 & fallback content previews
"""

import json
from collections import Counter, defaultdict
import os
import re

def main():
    print("=== Phase C: Deduplication, Quality Rules & Final Manifest Assembly ===")
    
    in_file = "migration_data/manifest_with_content_previews.jsonl"
    out_json = "migration_data/manifest_final_for_import.json"
    out_jsonl = "migration_data/manifest_final_for_import.jsonl"
    
    raw_records = []
    with open(in_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                raw_records.append(json.loads(line))
                
    print(f"Loaded {len(raw_records):,} raw records with content previews.")
    
    # 1. Deduplication on (file_id, course_id)
    seen_pairs = {}
    duplicates_dropped = 0
    clean_records = []
    
    for r in raw_records:
        fid = r.get("file_id")
        cid = r.get("course_id")
        pair_key = (fid, cid)
        
        if pair_key in seen_pairs:
            duplicates_dropped += 1
            continue
            
        seen_pairs[pair_key] = r
        clean_records.append(r)
        
    print(f"Deduplication results:")
    print(f"  - Total raw records: {len(raw_records):,}")
    print(f"  - Duplicates dropped (same file & course): {duplicates_dropped:,}")
    print(f"  - Clean unique documents: {len(clean_records):,}")
    
    # 2. Quality Rules & Categorization
    years_counter = Counter()
    categories_counter = Counter()
    tags_counter = Counter()
    authors_counter = Counter()
    
    final_records = []
    for r in clean_records:
        # Rule A: Nullify fallback upload-mtime years
        if r.get("year_source") == "mtime" or r.get("year_confidence") in ["fallback", "default"]:
            r["year"] = None
            r["year_confidence"] = "none"
        else:
            years_counter[r.get("year")] += 1
            
        # Rule B: Map expanded categories (2, 3, 4, 5, 6, 7)
        ext = r.get("extension", "").lower()
        full_lower = f"{r.get('path', '')} {r.get('filename', '')}".lower()
        
        if any(k in full_lower for k in ['/ttt/', '/ttt', 'ttt_', 'ttt-', 'tussentijdse toets', 'proefexamen', 'midterm']):
            r["category_id"] = 5
            r["category_name_nl"] = "TTT's"
            r["category_name_en"] = "TTT's"
        elif any(k in full_lower for k in ['/examen', '/examens', 'examen ', 'examen_', 'examen-', 'examens', 'tentamen', 'herkansing', '/exam/', '/exams/']) or re.search(r'\b(exam|exams|examen|examens|tentamen|herkansing|examenvragen)\b', full_lower):
            r["category_id"] = 2
            r["category_name_nl"] = "Examens"
            r["category_name_en"] = "Exams"
        elif ext in ['m', 'hs', 'pl', 'py', 'c', 'cpp', 'java', 'r', 'mat', 'mw'] or any(k in full_lower for k in ['/labo/', '/practicum/', 'matlab', 'simulink']):
            r["category_id"] = 7
            r["category_name_nl"] = "Labo & Code"
            r["category_name_en"] = "Lab & Code"
        elif ext in ['ppt', 'pptx'] or any(k in full_lower for k in ['/slides', '/transparanten', '/lesmateriaal', 'slides', 'transparanten', 'presentatie']):
            r["category_id"] = 6
            r["category_name_nl"] = "Slides / Lesmateriaal"
            r["category_name_en"] = "Lecture Slides"
        elif any(k in full_lower for k in ['/solutions', 'solutions/', '/oplossingen', 'oplossing', 'oefenzitting', 'oefeningen', 'werkcollege', 'exercises', 'problem', 'practicum', 'homework', 'assignment', 'taak', 'taken', 'verslag', 'rapport', 'project', 'p&o']) or re.search(r'\b(solution|solutions|oplossing|oplossingen|oefening|oefeningen|exercise|exercises|werkcollege|practicum|project|p&o|verslag)\b', full_lower):
            r["category_id"] = 4
            r["category_name_nl"] = "Oefenzittingen"
            r["category_name_en"] = "Exercise Sessions"
        else:
            r["category_id"] = 3
            r["category_name_nl"] = "Samenvattingen"
            r["category_name_en"] = "Summaries"
            
        categories_counter[r["category_name_nl"]] += 1
        
        # Tally tags and authors
        for t in r.get("tags", []):
            tags_counter[t] += 1
        if r.get("author"):
            authors_counter[r.get("author")] += 1
            
        final_records.append(r)

    # 3. Write final JSON & JSONL
    print(f"\nWriting {len(final_records):,} final records to {out_json}...")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(final_records, f, indent=2, ensure_ascii=False)
        
    with open(out_jsonl, "w", encoding="utf-8") as f:
        for r in final_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    # 4. Export Updated Audit Report
    audit_summary = {
        "total_documents": len(final_records),
        "total_courses": len(set(r["course_code"] for r in final_records)),
        "explicit_verified_years_count": sum(years_counter.values()),
        "null_years_count": len(final_records) - sum(years_counter.values()),
        "categories_breakdown": dict(categories_counter),
        "authors_identified_count": len(authors_counter),
        "total_authored_documents": sum(authors_counter.values()),
        "top_tags": dict(tags_counter.most_common(20))
    }
    with open("migration_data/audit_final_summary.json", "w", encoding="utf-8") as f:
        json.dump(audit_summary, f, indent=2)

    print("\n================================================================================")
    print("✓ Final Manifest Generation Complete!")
    print(f"  - Total Clean Documents: {len(final_records):,}")
    print(f"  - Duplicates Dropped: {duplicates_dropped:,}")
    print(f"  - Unique Courses: {len(set(r['course_code'] for r in final_records)):,}")
    print(f"  - Verified Academic Years: {sum(years_counter.values()):,} (Nullified mtime fallbacks: {len(final_records) - sum(years_counter.values()):,})")
    print(f"  - Categories Distribution:")
    for cat, count in categories_counter.most_common():
        print(f"      • {cat:<24}: {count:>5,d} ({count/len(final_records)*100:4.1f}%)")
    print(f"  - Authors Identified: {len(authors_counter)} creators across {sum(authors_counter.values()):,} files")
    print("================================================================================")

if __name__ == '__main__':
    main()
