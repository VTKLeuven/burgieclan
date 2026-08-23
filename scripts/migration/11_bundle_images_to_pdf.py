#!/usr/bin/env python3
"""
scripts/migration/11_bundle_images_to_pdf.py

Bundles multi-image scan folders (e.g. 15 JPGs of notes/exams) into a single,
clean multi-page PDF document per set, allowing full in-browser viewing on Burgieclan.
Replaces fragmented image records with unified PDF records in the manifest.
"""

import os
import sys
import json
import hashlib
from collections import defaultdict

def natural_sort_key(s):
    import re
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def bundle_photo_sets(manifest_path, output_manifest_path):
    with open(manifest_path, 'r', encoding='utf-8') as f:
        docs = json.load(f)

    # Group image documents by their parent folder path
    photo_sets = defaultdict(list)
    other_docs = []
    
    IMAGE_EXTS = {'jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'gif'}
    
    for d in docs:
        fn = d.get('filename', '')
        ext = fn.rsplit('.', 1)[-1].lower() if '.' in fn else ''
        p = d.get('path', '')
        
        if ext in IMAGE_EXTS:
            parent = p.rsplit('/', 1)[0] if '/' in p else p
            photo_sets[(d.get('course_id'), parent)].append(d)
        else:
            other_docs.append(d)
            
    bundled_docs = []
    single_images_retained = 0
    total_sets_converted = 0
    total_images_merged = 0
    
    print(f"Total potential image folder groups: {len(photo_sets)}")
    
    for (cid, parent_folder), items in photo_sets.items():
        if len(items) <= 1:
            # Single image, keep as-is
            other_docs.extend(items)
            single_images_retained += len(items)
            continue
            
        # Multiple images in folder -> bundle into PDF
        items.sort(key=lambda x: natural_sort_key(x.get('filename', '')))
        
        folder_name = parent_folder.rstrip('/').split('/')[-1] if parent_folder else "Scan_Bundel"
        pdf_filename = f"{folder_name}.pdf"
        
        # Determine representative metadata
        first_doc = items[0]
        category_id = first_doc.get('category_id', 3)
        year = first_doc.get('year')
        author = first_doc.get('author')
        
        # Tags: combine all unique tags across pages, ensure 'Scan', 'old-burgieclan'
        tags = set()
        for it in items:
            for t in it.get('tags', []):
                if not t.startswith('Deel '): # Remove individual part tags
                    tags.add(t)
        tags.add('Scan')
        tags.add('old-burgieclan')
        
        # Title clean up
        base_title = first_doc.get('display_title', folder_name)
        # Strip page markers e.g. " (p. 1/15)"
        import re
        base_title = re.sub(r'\s*\(p\.\s*\d+/\d+\)', '', base_title).strip()
        display_title = base_title
        
        total_size = sum(it.get('file_size', 0) for it in items)
        
        # Create virtual file_id for the combined PDF
        combined_id_str = f"bundled_pdf_{cid}_{parent_folder}_{len(items)}"
        combined_file_id = hashlib.sha1(combined_id_str.encode('utf-8')).hexdigest()
        
        pdf_doc = {
            "file_id": combined_file_id,
            "course_id": cid,
            "course_code": first_doc.get("course_code"),
            "course_name": first_doc.get("course_name"),
            "filename": pdf_filename,
            "path": f"{parent_folder}/{pdf_filename}",
            "repo_name": first_doc.get("repo_name"),
            "display_title": display_title,
            "category_id": category_id,
            "year": year,
            "author": author,
            "tags": sorted(list(tags)),
            "mimetype": "application/pdf",
            "file_size": total_size,
            "is_bundled_pdf": True,
            "bundled_image_count": len(items),
            "bundled_source_files": [it.get("file_id") for it in items]
        }
        
        bundled_docs.append(pdf_doc)
        total_sets_converted += 1
        total_images_merged += len(items)
        
    final_manifest = other_docs + bundled_docs
    final_manifest.sort(key=lambda x: (x.get('course_code', ''), x.get('display_title', '')))
    
    print(f"\n=== BUNDLING SUMMARY ===")
    print(f"Original documents: {len(docs)}")
    print(f"Multi-image scan sets bundled: {total_sets_converted} sets ({total_images_merged} images -> {total_sets_converted} PDFs)")
    print(f"Single images kept: {single_images_retained}")
    print(f"Final total documents: {len(final_manifest)} (reduced by {total_images_merged - total_sets_converted})")
    
    with open(output_manifest_path, 'w', encoding='utf-8') as f:
        json.dump(final_manifest, f, indent=2, ensure_ascii=False)
        
    jsonl_path = output_manifest_path.replace('.json', '.jsonl')
    with open(jsonl_path, 'w', encoding='utf-8') as f:
        for d in final_manifest:
            f.write(json.dumps(d, ensure_ascii=False) + '\n')
            
    print(f"✓ Saved bundled manifest to {output_manifest_path} and {jsonl_path}")

if __name__ == '__main__':
    manifest_in = 'migration_data/manifest_final_standardized_validated.json'
    manifest_out = 'migration_data/manifest_final_standardized_validated.json'
    bundle_photo_sets(manifest_in, manifest_out)
