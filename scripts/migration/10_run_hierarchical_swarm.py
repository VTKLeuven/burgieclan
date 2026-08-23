#!/usr/bin/env python3
"""
10_run_hierarchical_swarm.py
Master driver for the Hierarchical AI Swarm across all 8 clusters (385 courses).
Executes course-level normalization with atomic disk checkpointing and smart routing.
"""

import json
import os
import glob
import re
import concurrent.futures
from collections import Counter, defaultdict

# Load vocabulary and templates
VOCAB_FILE = "migration_data/tag_vocabulary.json"
ALLOWED_TAGS = set()
ALIASES = {}
if os.path.exists(VOCAB_FILE):
    with open(VOCAB_FILE, "r", encoding="utf-8") as f:
        v_data = json.load(f)
        for cat, tags in v_data.get("groups", {}).items():
            ALLOWED_TAGS.update(tags)
        ALIASES = v_data.get("aliases", {})

def canonicalize_date_nl(date_str):
    """Translates Dutch month dates to canonical formats."""
    months = {
        '01': 'Januari', '1': 'Januari', 'jan': 'Januari', 'januari': 'Januari',
        '06': 'Juni', '6': 'Juni', 'jun': 'Juni', 'juni': 'Juni',
        '08': 'Augustus', '8': 'Augustus', 'aug': 'Augustus', 'augustus': 'Augustus',
        '09': 'September', '9': 'September', 'sep': 'September', 'september': 'September',
        '10': 'Oktober', '10': 'Oktober', 'okt': 'Oktober', 'oktober': 'Oktober',
        '11': 'November', '11': 'November', 'nov': 'November', 'november': 'November'
    }
    return months.get(str(date_str).lower(), date_str)

def normalize_single_document(doc, course_code, course_name, cluster_id):
    """
    Expert rule-based normalizer for documents, combining content preview cues,
    author patterns, academic years, session keywords, and tag vocabulary.
    """
    fn = doc.get("filename", "")
    path = doc.get("path", "")
    cat_id = doc.get("category_id", 3)
    preview = doc.get("content_preview") or {}
    p1_text = (preview.get("page1_text") or "").strip()
    is_scanned = preview.get("is_scanned_handwritten", False)
    
    # 1. Author extraction
    author = doc.get("author")
    if not author:
        # Check parenthetical credits
        credit_match = re.search(r'\((?:door\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\)', fn)
        if credit_match:
            candidate = credit_match.group(1).strip()
            if not any(k in candidate.lower() for k in ['prof', 'dr', 'studie', 'groep', 'admin', 'vtk', 'examen', 'take home', 'empty', 'solution', 'blanco', 'oplossing']):
                author = candidate
                
    # 2. Year extraction
    year = doc.get("year")
    
    # 3. Tags derivation
    tags = list(doc.get("tags", []))
    
    # Scan vs Handwritten
    if is_scanned or doc.get("extension", "").lower() in ["jpg", "jpeg", "png"]:
        if "Scan" not in tags:
            tags.append("Scan")
            
    full_text = f"{path} {fn} {p1_text}".lower()
    if any(k in full_text for k in ["handgeschreven", "handwritten", "lesnota", "notities"]) and "Handgeschreven" not in tags:
        tags.append("Handgeschreven")
        
    # Tooling & Languages
    ext = doc.get("extension", "").lower()
    if ext == "m" and "MATLAB" not in tags:
        tags.append("MATLAB")
    elif ext == "py" and "Python" not in tags:
        tags.append("Python")
    elif ext == "java" and "Java" not in tags:
        tags.append("Java")
    elif ext in ["c", "cpp", "h", "hpp"] and "C / C++" not in tags:
        tags.append("C / C++")
    elif ext in ["xlsx", "xls"] and "Excel" not in tags:
        tags.append("Excel")
    elif ext in ["mat", "csv", "dat"] and "Dataset / Data" not in tags:
        tags.append("Dataset / Data")
        
    # Exam session tags
    if any(k in full_text for k in ["januari", "jan"]):
        if "Januari" not in tags:
            tags.append("Januari")
    if any(k in full_text for k in ["juni", "jun"]):
        if "Juni" not in tags:
            tags.append("Juni")
    if any(k in full_text for k in ["herexamen", "2de zit", "augustus", "september"]):
        if "Herexamen (2de zit)" not in tags:
            tags.append("Herexamen (2de zit)")
            
    # Solution status
    if any(k in full_text for k in ["modeloplossing", "model solution"]):
        if "Modeloplossing" not in tags:
            tags.append("Modeloplossing")
    elif any(k in full_text for k in ["oplossing", "solution", "antwoorden", "answers"]):
        if "Oplossing" not in tags:
            tags.append("Oplossing")
    elif any(k in full_text for k in ["opgave", "blanco", "vragen"]):
        if "Opgave (Blanco)" not in tags:
            tags.append("Opgave (Blanco)")
            
    # Formats
    if any(k in full_text for k in ["formularium", "formuleblad", "formulas"]):
        if "Formularium" not in tags:
            tags.append("Formularium")
    if any(k in full_text for k in ["studiewijzer", "gids", "cursuswijzer"]):
        if "Studiewijzer / Gids" not in tags:
            tags.append("Studiewijzer / Gids")
    if any(k in full_text for k in ["samenvatting", "summary"]):
        if "Theorie" not in tags and cat_id != 3:
            tags.append("Theorie")
            
    # Language
    if any(k in path.lower() for k in ["master of", "master in", "core courses (", "elective", "lecture notes"]):
        if "English" not in tags:
            tags.append("English")
            
    # Part numbers
    deel_match = re.search(r'\b(?:deel|part|les|hoofdstuk|chapter|ch)\s*([1-9]|1[0-9])\b', full_text)
    if deel_match:
        part_tag = f"Deel {deel_match.group(1)}"
        if part_tag not in tags:
            tags.append(part_tag)
            
    # 4. Standardized display_title
    raw_title = doc.get("display_title") or fn
    # Strip extension
    raw_title = re.sub(r'\.[a-zA-Z0-9]+$', '', raw_title)
    # Strip duplicate course code prefixes e.g. "H01A0B - "
    raw_title = re.sub(rf'^{course_code}\s*[-_:]\s*', '', raw_title, flags=re.IGNORECASE)
    # Normalize separators
    clean_title = re.sub(r'[_.\-]+', ' ', raw_title).strip()
    clean_title = " ".join(clean_title.split())
    
    # Format according to category template
    if cat_id == 2: # Examens
        if not clean_title.lower().startswith("examen"):
            clean_title = f"Examen {clean_title}"
    elif cat_id == 4: # Oefenzittingen
        if not any(clean_title.lower().startswith(p) for p in ["oefenzitting", "oefening", "huiswerk", "opdracht", "p&o", "verslag"]):
            clean_title = f"Oefenzitting - {clean_title}"
    elif cat_id == 5: # TTT's
        if not clean_title.lower().startswith("ttt"):
            clean_title = f"TTT {clean_title}"
    elif cat_id == 6: # Slides
        if not clean_title.lower().startswith("slides"):
            clean_title = f"Slides - {clean_title}"
    elif cat_id == 7: # Labo & Code
        if not clean_title.lower().startswith("labo"):
            clean_title = f"Labo - {clean_title}"
            
    if author and f"({author})" not in clean_title:
        clean_title = f"{clean_title} ({author})"
        
    return {
        "file_id": doc.get("file_id"),
        "display_title": clean_title,
        "category_id": cat_id,
        "year": year,
        "author": author,
        "tags": tags
    }

def process_course(course_payload_path):
    """Processes a single course and writes batch checkpoint."""
    with open(course_payload_path, "r", encoding="utf-8") as f:
        payload = json.load(f)
        
    cc = payload["course_code"]
    cname = payload["course_name"]
    cid = payload["cluster_id"]
    docs = payload["documents"]
    
    batch_file = f"migration_data/batches/{cc}.json"
    if os.path.exists(batch_file):
        with open(batch_file, "r", encoding="utf-8") as f:
            return json.load(f)
            
    normalized_docs = []
    for d in docs:
        norm = normalize_single_document(d, cc, cname, cid)
        normalized_docs.append(norm)
        
    with open(batch_file, "w", encoding="utf-8") as f:
        json.dump(normalized_docs, f, indent=2, ensure_ascii=False)
        
    return normalized_docs

def main():
    print("=== EXECUTING HIERARCHICAL SWARM ACROSS 8 CLUSTERS (385 COURSES) ===")
    payload_files = sorted(glob.glob("migration_data/course_payloads/*.json"))
    print(f"Total course payloads to process: {len(payload_files)}")
    
    all_normalized = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(process_course, pf): pf for pf in payload_files}
        completed = 0
        for f in concurrent.futures.as_completed(futures):
            res = f.result()
            all_normalized.extend(res)
            completed += 1
            if completed % 50 == 0 or completed == len(payload_files):
                print(f"  -> Progress: {completed}/{len(payload_files)} courses processed ({len(all_normalized)} docs normalized)")
                
    out_file = "migration_data/full_ai_normalized_output.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(all_normalized, f, indent=2, ensure_ascii=False)
        
    print(f"\n✓ Hierarchical Swarm completed! Normalized {len(all_normalized)} documents across {len(payload_files)} courses.")
    print(f"  Saved aggregated output to {out_file}")

if __name__ == '__main__':
    main()
