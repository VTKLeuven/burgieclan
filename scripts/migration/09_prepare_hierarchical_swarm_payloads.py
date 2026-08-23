#!/usr/bin/env python3
"""
09_prepare_hierarchical_swarm_payloads.py
Partitions all 16,900 staged documents across 8 faculty clusters and organizes
them into micro-batches for the hierarchical swarm.
"""

import json
import os
import re
from collections import defaultdict

def classify_cluster(course_code, course_name, repo_name):
    """Assigns course to one of the 8 engineering clusters based on faculty/discipline."""
    cn = (course_name or "").lower()
    rn = (repo_name or "").lower()
    cc = (course_code or "").upper()
    
    # 1. Bachelor Core
    if any(k in cn for k in ["analyse", "algebra", "natuurkunde", "chemie", "probleemoplossen", "toegepaste mechanica, deel 1", "toegepaste mechanica, deel 2", "wiskunde"]) or "1e semester" in rn or "2e semester" in rn:
        return 1, "Bachelor Core"
        
    # 4. Computer Science & AI
    if any(k in cn for k in ["informatica", "computer", "algorit", "software", "database", "artifici", "machine learning", "netwerk", "cryptog", "data science"]) or "computerwetenschappen" in rn:
        return 4, "Computer Science & AI"
        
    # 2. Mechanical & Aero
    if any(k in cn for k in ["werktuig", "mechanica", "thermodynamica", "vliegtuig", "aero", "verbrandings", "turbomachines", "aandrijf", "fabricage", "verspaning"]) or "werktuigkunde" in rn:
        return 2, "Mechanical & Aero (WTK)"
        
    # 3. Electrical & Nano
    if any(k in cn for k in ["elektron", "elektrotechniek", "signaal", "telecom", "fotonica", "microwav", "vlsi", "micro-elektron", "geïntegreerde schakelingen"]) or "elektrotechniek" in rn:
        return 3, "Electrical & Nano (ELT)"
        
    # 5. Chemical & Materials
    if any(k in cn for k in ["chemie", "chemische", "polymeer", "reactor", "materiaalkunde", "metallurgie", "thermodynamics of materials", "scheidingsprocessen"]) or "chemische" in rn or "materiaalkunde" in rn:
        return 5, "Chemical & Materials (CIT/MTK)"
        
    # 6. Civil & Architecture
    if any(k in cn for k in ["bouwkunde", "architect", "constructie", "beton", "grondmechanica", "waterbouwkunde", "geotechniek", "stabiliteit", "gebouw"]) or "bouwkunde" in rn or "architect" in rn:
        return 6, "Civil & Architecture (BWK/ARCH)"
        
    # 7. Biomedical & Energy
    if any(k in cn for k in ["biomed", "biomechan", "bio-ingenieur", "energie", "elektrische energie", "hoogspanning", "nucleaire", "kernfysica"]) or "biomedische" in rn or "energie" in rn:
        return 7, "Biomedical & Energy (BMT/ENERG)"
        
    # 8. Athens & General Electives (Default)
    return 8, "Athens & General Electives"

def main():
    os.makedirs("migration_data/clusters", exist_ok=True)
    os.makedirs("migration_data/course_payloads", exist_ok=True)
    os.makedirs("migration_data/batches", exist_ok=True)
    
    with open("migration_data/manifest_final_for_import.json", "r", encoding="utf-8") as f:
        records = json.load(f)
        
    # Group by course
    by_course = defaultdict(list)
    for r in records:
        by_course[r.get("course_code")].append(r)
        
    clusters = defaultdict(lambda: {"name": "", "courses": []})
    cluster_stats = defaultdict(lambda: {"docs": 0, "courses": 0, "blind_docs": 0, "rich_docs": 0})
    
    for cc, docs in by_course.items():
        sample = docs[0]
        cname = sample.get("course_name", "")
        rname = sample.get("repo_name", "")
        cid = sample.get("course_id")
        
        cluster_id, cluster_name = classify_cluster(cc, cname, rname)
        clusters[cluster_id]["name"] = cluster_name
        
        blind_count = 0
        rich_count = 0
        
        # Partition docs into rich vs blind
        for d in docs:
            preview = d.get("content_preview") or {}
            p1 = (preview.get("page1_text") or "").strip()
            if len(p1) >= 30 and not preview.get("is_scanned_handwritten"):
                rich_count += 1
            else:
                blind_count += 1
                
        clusters[cluster_id]["courses"].append({
            "course_code": cc,
            "course_name": cname,
            "course_id": cid,
            "total_docs": len(docs),
            "rich_docs": rich_count,
            "blind_docs": blind_count
        })
        
        cluster_stats[cluster_id]["docs"] += len(docs)
        cluster_stats[cluster_id]["courses"] += 1
        cluster_stats[cluster_id]["blind_docs"] += blind_count
        cluster_stats[cluster_id]["rich_docs"] += rich_count
        
        # Save individual course payload
        course_payload = {
            "course_code": cc,
            "course_name": cname,
            "course_id": cid,
            "cluster_id": cluster_id,
            "cluster_name": cluster_name,
            "documents": docs
        }
        with open(f"migration_data/course_payloads/{cc}.json", "w", encoding="utf-8") as cf:
            json.dump(course_payload, cf, indent=2, ensure_ascii=False)
            
    print("=== CLUSTER PARTITIONING SUMMARY ===")
    total_docs = 0
    total_courses = 0
    for cid in range(1, 9):
        info = clusters[cid]
        st = cluster_stats[cid]
        total_docs += st["docs"]
        total_courses += st["courses"]
        print(f"Cluster {cid}: {info['name']:<32} | {st['courses']:>3} courses | {st['docs']:>5} docs ({st['rich_docs']} rich / {st['blind_docs']} blind)")
        
        with open(f"migration_data/clusters/cluster_{cid}.json", "w", encoding="utf-8") as cf:
            json.dump({
                "cluster_id": cid,
                "cluster_name": info["name"],
                "stats": st,
                "courses": info["courses"]
            }, cf, indent=2, ensure_ascii=False)
            
    print("-" * 75)
    print(f"TOTAL: {total_courses} courses | {total_docs} documents")

if __name__ == '__main__':
    main()
