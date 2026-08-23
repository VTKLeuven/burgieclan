#!/usr/bin/env python3
"""
08e_extract_content_previews.py
High-performance, timeout-protected Page 1 & fallback text extractor.
Streams results directly to JSONL in real-time.
"""

import json
import os
import signal
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
import pypdf

STAGING_BASE = "/mnt/immich/burgieclan-staging"

class TimeoutException(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutException("Processing timed out")

def inspect_single_file(record):
    repo_name = record.get('repo_name', '')
    rel_path = record.get('path', '').lstrip('/')
    ext = record.get('extension', '').lower()
    
    file_path = os.path.join(STAGING_BASE, repo_name, rel_path)
    
    preview = {
        "is_scanned_handwritten": False,
        "page_count": 1,
        "page1_text": "",
        "fallback_text": "",
        "source_type": ext
    }
    
    if not os.path.exists(file_path):
        preview["error"] = "file_not_found"
        record["content_preview"] = preview
        return record

    if ext in ['jpg', 'jpeg', 'png']:
        preview["is_scanned_handwritten"] = True
        record["content_preview"] = preview
        return record

    if ext in ['m', 'py', 'c', 'cpp', 'java', 'hs', 'pl', 'r', 'mat', 'mw', 'txt', 'html']:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = [f.readline().strip() for _ in range(25)]
                preview["page1_text"] = " \n".join(l for l in lines if l)[:400]
        except:
            pass
        record["content_preview"] = preview
        return record

    if ext == 'pdf':
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(3)  # 3 second timeout per PDF
        try:
            reader = pypdf.PdfReader(file_path)
            total_pages = len(reader.pages)
            preview["page_count"] = total_pages
            
            if total_pages > 0:
                p1 = reader.pages[0]
                t1 = p1.extract_text() or ""
                t1_clean = " ".join(t1.split())
                preview["page1_text"] = t1_clean[:400]
                
                if len(t1_clean) < 30:
                    preview["is_scanned_handwritten"] = True
                    
                if (len(t1_clean) < 80 or preview["is_scanned_handwritten"]) and total_pages > 1:
                    fallbacks = []
                    for p_num in range(1, min(3, total_pages)):
                        p_text = reader.pages[p_num].extract_text() or ""
                        p_clean = " ".join(p_text.split())
                        if p_clean:
                            fallbacks.append(f"[P{p_num+1}]: {p_clean[:250]}")
                            if len(p_clean) > 80:
                                preview["is_scanned_handwritten"] = False
                                
                    preview["fallback_text"] = " | ".join(fallbacks)
        except Exception as e:
            preview["error"] = str(e)
            preview["is_scanned_handwritten"] = True
        finally:
            signal.alarm(0)

    record["content_preview"] = preview
    return record

def main():
    manifest_in = "/tmp/manifest_prepared_for_import.json"
    manifest_out = "/tmp/manifest_with_content_previews.jsonl"
    
    if not os.path.exists(manifest_in):
        manifest_in = "migration_data/manifest_prepared_for_import.json"
        manifest_out = "migration_data/manifest_with_content_previews.jsonl"
        
    with open(manifest_in, "r", encoding="utf-8") as f:
        records = json.load(f)
        
    print(f"Inspecting content for {len(records):,} files with 16 workers (timeout=3s)...", flush=True)
    
    with open(manifest_out, "w", encoding="utf-8") as out_f:
        with ProcessPoolExecutor(max_workers=16) as executor:
            for i, enriched_rec in enumerate(executor.map(inspect_single_file, records, chunksize=50)):
                out_f.write(json.dumps(enriched_rec, ensure_ascii=False) + "\n")
                if (i + 1) % 1000 == 0 or (i + 1) == len(records):
                    print(f"  Processed {i+1:,} / {len(records):,} files ({(i+1)/len(records)*100:.1f}%)", flush=True)
                    out_f.flush()

    print("✓ Content inspection complete! Output saved to", manifest_out, flush=True)

if __name__ == "__main__":
    main()
