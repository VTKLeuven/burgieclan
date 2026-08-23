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

VOCAB_FILE = "migration_data/tag_vocabulary.json"

# Category ids as stored in the database. Every one of these must be offered to the
# model: omitting 6 and 7 forces slides and lab/code documents into a wrong category.
CATEGORY_IDS = {
    2: "Examens",
    3: "Samenvattingen",
    4: "Oefenzittingen",
    5: "TTT's",
    6: "Slides / Lesmateriaal",
    7: "Labo & Code",
}


def render_tag_vocabulary(vocab_file=VOCAB_FILE):
    """
    Renders the allowed-tag section of the prompt straight from tag_vocabulary.json.

    The prompt and the validator (08i) therefore cannot drift: any tag the model is
    told to emit is a tag 08i will accept, and vice versa.
    """
    with open(vocab_file, "r", encoding="utf-8") as f:
        vocab = json.load(f)

    lines = []
    for group, tags in vocab.get("groups", {}).items():
        label = group.replace("_", " ").title()
        lines.append(f"- {label}: " + ", ".join(f"'{t}'" for t in tags))

    for group, spec in vocab.get("patterns", {}).items():
        label = group.replace("_", " ").title()
        lines.append(f"- {label}: {spec['prompt_hint']}")

    notes = vocab.get("notes", [])
    if notes:
        lines.append("")
        for note in notes:
            lines.append(f"NOTE: {note}")

    redundant = vocab.get("redundant_in_category", {})
    if redundant:
        lines.append("")
        lines.append("NEVER emit these tags for these categories - they only restate the category:")
        for cat_id, tags in sorted(redundant.items(), key=lambda kv: int(kv[0])):
            name = CATEGORY_IDS.get(int(cat_id), cat_id)
            lines.append(f"  - category {cat_id} ({name}): " + ", ".join(f"'{t}'" for t in tags))

    return "\n".join(lines)


def build_system_instruction(vocab_file=VOCAB_FILE):
    """Builds the full system prompt with the tag vocabulary injected from disk."""
    return _SYSTEM_INSTRUCTION_TEMPLATE.replace(
        "{{TAG_VOCABULARY}}", render_tag_vocabulary(vocab_file)
    )


_SYSTEM_INSTRUCTION_TEMPLATE = """You are an expert academic archivist for VTK (the engineering student association at KU Leuven).
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
    "display_title": "<Standardized human-readable title>",
    "category_id": <2 Examens | 3 Samenvattingen | 4 Oefenzittingen | 5 TTT's | 6 Slides / Lesmateriaal | 7 Labo & Code>,
    "year": "<YYYY - YYYY, e.g. 2018 - 2019, or null>",
    "author": "<Student author name or null>",
    "tags": ["<Array of orthogonal tags>"]
  }
]

The keys are exactly `display_title` and `year`. Do not emit `canonical_title` or
`academic_year` - the importer does not read those names.

Set `year` to null unless the year is explicitly present in the filename, path or page
text. Never infer it from context or from how old a document looks.

RULES FOR CANONICAL TITLES:
- Exams: "Examen [Dag] [Maand] [Jaar] [- Deel X] [(Oplossing|Modeloplossing|Opgave)] [(Auteur)]"
  Example: "Examen 19 Juni 2017 - Deel 1 (Oplossing)" or "Examen Januari 2021 (Opgave)"
- Exercises: "Oefenzitting [Nr / Onderwerp] [(Oplossing|Code|Verslag)] [(Auteur)]"
  Example: "Oefenzitting 3 - Pompen en Compressoren (Oplossing)"
- Summaries: "Samenvatting [- Deel X] [- Onderwerp] [(Auteur)]"
  Example: "Samenvatting Deel 2 - Matrixmethodes (Nick Hosewol)"
- Slides: "Slides [- Hoofdstuk/Les X] [- Onderwerp] [(Prof. Naam)]"
  Example: "Slides Les 5 - Management Challenges (Prof. Dejaeger)"
- Formularia: "Formularium [- Onderwerp] [(Auteur)]"
- Code/Lab: "Labo [Nr/Onderwerp] - [Scriptnaam] [(Taal)]"
- Keep student authors at the end in parentheses e.g. "(Kato Kenis)".

RULES FOR ORTHOGONAL TAGS
Use ONLY tags from this vocabulary, spelled exactly as written. Any other tag is discarded.
Tags describe properties the category does not already state.

{{TAG_VOCABULARY}}
"""

SYSTEM_INSTRUCTION = build_system_instruction()

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
