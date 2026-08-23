#!/usr/bin/env python3
"""
08f_ai_batch_refiner.py
Formats course batches with extracted Page 1 content and drives AI reasoning to produce
canonical titles, orthogonal tags, academic years, authors, and verified categories.
"""

import json
import os
import re
from collections import defaultdict

SYSTEM_INSTRUCTION = """You are an expert academic archivist for VTK (the engineering student association at KU Leuven).
Your task is to standardize legacy document metadata from an old Seafile repository into the new Burgieclan platform.

For each document in the provided course batch, you are given:
- file_id
- original_path and original_filename
- extension and file_size
- extracted Page 1 text snippet (and fallback Page 2-3 text if available)
- is_scanned_handwritten flag (True if photo scan or image-only PDF)

You must produce a JSON array of objects with the exact schema:
[
  {
    "file_id": "<file_id>",
    "canonical_title": "<Standardized human-readable title>",
    "category_id": <2 for Examens, 3 for Samenvattingen, 4 for Oefenzittingen, 5 for TTT's>,
    "academic_year": "<YYYY - YYYY format, e.g. 2018 - 2019, or 2024 - 2025>",
    "author": "<Student author name or null>",
    "tags": ["<Array of orthogonal tags>"]
  }
]

RULES FOR CANONICAL TITLES:
- Exams: "Examen [Dag] [Maand] [Jaar] [- Deel X] [(Oplossing|Modeloplossing|Opgave)] [(Auteur)]"
  Example: "Examen 19 Juni 2017 - Deel 1 (Oplossing)" or "Examen Januari 2021 (Opgave)"
- Exercises: "Oefenzitting [Nr / Onderwerp] [(Oplossing|Code|Verslag)] [(Auteur)]"
  Example: "Oefenzitting 3 - Pompen en Compressoren (Oplossing)"
- Summaries: "Samenvatting [- Deel X] [- Onderwerp] [(Auteur)]"
  Example: "Samenvatting Deel 2 - Matrixmethodes (Student 083)"
- Slides: "Slides [- Hoofdstuk/Les X] [- Onderwerp] [(Prof. Naam)]"
  Example: "Slides Les 5 - Management Challenges (Prof. Dejaeger)"
- Formularia: "Formularium [- Onderwerp] [(Auteur)]"
- Code/Lab: "Labo [Nr/Onderwerp] - [Scriptnaam] [(Taal)]"
- Keep student authors at the end in parentheses e.g. "(Student 053)".

RULES FOR ORTHOGONAL TAGS (Do NOT tag 'Oefeningen' under Oefenzittingen or 'Samenvatting' under Samenvattingen):
- Solution status: 'Oplossing', 'Modeloplossing', 'Opgave (Blanco)'
- Exam sessions (for Examens): 'Januari', 'Juni', 'Augustus / September (2de zit)', 'Tussentijds (Midterm)'
- Medium / Format: 'Handgeschreven', 'Code / Script', 'Slides'
- Content nature: 'Theorie', 'Examenvragen', 'Lesnotities', 'Verslag / Project', 'Formularium', 'Meerkeuze', 'Mondeling'
- Scope: 'Deel 1', 'Deel 2', 'Deel 3'
- Language: 'English'
"""

def prepare_course_prompt(course_code, course_name, documents):
    prompt = f"### Course: [{course_code}] {course_name}\n"
    prompt += f"Total Documents in this batch: {len(documents)}\n\n"
    prompt += "Documents to standardize:\n"
    
    docs_payload = []
    for d in documents:
        preview = d.get('content_preview', {})
        p1 = preview.get('page1_text', '')[:250]
        fallback = preview.get('fallback_text', '')[:150]
        
        entry = {
            "file_id": d.get("file_id"),
            "path": d.get("path"),
            "filename": d.get("filename"),
            "ext": d.get("extension"),
            "size_kb": round(d.get("size_bytes", 0) / 1024, 1),
            "is_scanned": preview.get("is_scanned_handwritten", False),
            "page1_text": p1 if p1 else None,
            "fallback_text": fallback if fallback else None
        }
        docs_payload.append(entry)
        
    prompt += json.dumps(docs_payload, indent=2, ensure_ascii=False)
    prompt += "\n\nOutput only valid JSON array matching the schema."
    return prompt

def main():
    print("AI Batch Refiner prepared.")

if __name__ == '__main__':
    main()
