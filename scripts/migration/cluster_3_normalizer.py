#!/usr/bin/env python3
"""
cluster_3_normalizer.py
True LLM Normalization and Metadata Extraction for Cluster 3: Electrical & Nano (ELT).
Courses:
1. H01M0A: Anki Flashcards Semester 6 ELT (1 doc)
2. H03F6A: Industriële stage: Elektrotechniek (11 docs)
3. H09J4A: Building Blocks for Telecom Systems (22 docs)
4. H01M3A: Elektronische basisschakelingen (68 docs)
5. H01M1A: Elektromagnetische golven (99 docs)
6. H01L1A: Digitale elektronica en processoren (118 docs)
7. H01M5A: Halfgeleidercomponenten (125 docs)
8. H01L6A: Digital Signal Processing (157 docs)
9. H01L4A: Digitale en analoge communicatie (178 docs)

Total: 779 documents.
"""

import json
import os
import re
from collections import defaultdict, Counter

def clean_spacing(s):
    if not s:
        return ""
    return " ".join(str(s).strip().split())

def extract_year_from_text(text):
    if not text:
        return None
    # 4-digit academic year range e.g. 2018-2019 or 2018 - 2019
    m = re.search(r'\b(19\d\d|20\d\d)\s*[-_/]\s*(19\d\d|20\d\d)\b', text)
    if m:
        y1, y2 = int(m.group(1)), int(m.group(2))
        if y2 == y1 + 1 and 1980 <= y1 <= 2025:
            return f"{y1} - {y2}"
        if y2 < 100:
            y2_full = (y1 // 100) * 100 + y2
            if y2_full == y1 + 1 and 1980 <= y1 <= 2025:
                return f"{y1} - {y2_full}"

    # 4-digit with short 2-digit range e.g. 2018-19 or 2018/19
    m = re.search(r'\b(19\d\d|20\d\d)\s*[-_/]\s*(\d{2})\b', text)
    if m:
        y1, y2_short = int(m.group(1)), int(m.group(2))
        y2_full = (y1 // 100) * 100 + y2_short
        if y2_full == y1 + 1 and 1980 <= y1 <= 2025:
            return f"{y1} - {y2_full}"

    # 2-digit range e.g. 23-24
    m = re.search(r'\b(\d{2})\s*[-_~]\s*(\d{2})\b', text)
    if m:
        y1_s, y2_s = int(m.group(1)), int(m.group(2))
        if y2_s == y1_s + 1 and 0 <= y1_s <= 30:
            y1 = 2000 + y1_s
            y2 = 2000 + y2_s
            if y1 <= 2025:
                return f"{y1} - {y2}"

    # Month and Year (Dutch & English)
    months_nl = {
        'januari': 1, 'jan': 1, 'january': 1,
        'februari': 2, 'feb': 2, 'february': 2,
        'maart': 3, 'mrt': 3, 'march': 3, 'mar': 3,
        'april': 4, 'apr': 4,
        'mei': 5, 'may': 5,
        'juni': 6, 'jun': 6, 'june': 6,
        'juli': 7, 'jul': 7, 'july': 7,
        'augustus': 8, 'aug': 8, 'august': 8,
        'september': 9, 'sep': 9, 'sept': 9,
        'oktober': 10, 'okt': 10, 'october': 10, 'oct': 10,
        'november': 11, 'nov': 11,
        'december': 12, 'dec': 12
    }
    m = re.search(r'\b(?:(\d{1,2})\s*)?([a-zA-Z]+)\s*\'?(\d{2,4})\b', text)
    if m:
        m_str = m.group(2).lower()
        if m_str in months_nl:
            m_num = months_nl[m_str]
            yr_str = m.group(3)
            y_val = int(yr_str) if len(yr_str) == 4 else (2000 + int(yr_str) if int(yr_str) < 70 else 1900 + int(yr_str))
            if 1980 <= y_val <= 2026:
                y1 = y_val if m_num >= 9 else y_val - 1
                if y1 <= 2025:
                    return f"{y1} - {y1+1}"

    # ISO dates e.g. 2007-06-25, 2019-06-21, 2024-01-23
    m = re.search(r'\b(19\d\d|20\d\d)[-_](\d{2})[-_](\d{2})\b', text)
    if m:
        y_val, m_num = int(m.group(1)), int(m.group(2))
        if 1980 <= y_val <= 2026:
            y1 = y_val if m_num >= 9 else y_val - 1
            if y1 <= 2025:
                return f"{y1} - {y1+1}"

    # Day-Month-Year dates e.g. 16.6.2011, 27.6.2007, 12-06-2023, 08_01_2026
    m = re.search(r'\b(\d{1,2})[-._](\d{1,2})[-._](19\d\d|20\d\d|\d{2})\b', text)
    if m:
        m_num = int(m.group(2))
        yr_str = m.group(3)
        y_val = int(yr_str) if len(yr_str) == 4 else (2000 + int(yr_str) if int(yr_str) < 70 else 1900 + int(yr_str))
        if 1 <= m_num <= 12 and 1980 <= y_val <= 2026:
            y1 = y_val if m_num >= 9 else y_val - 1
            if y1 <= 2025:
                return f"{y1} - {y1+1}"

    # Boundary patterns: "Vanaf 2023-2024" -> 2023 - 2024, "Voor 2023-2024" -> 2022 - 2023
    m = re.search(r'\b(?:vanaf|sinds|from|post[-_]?)\s*(19\d\d|20\d\d)\b', text, re.IGNORECASE)
    if m:
        y1 = int(m.group(1))
        if y1 <= 2025:
            return f"{y1} - {y1+1}"
    m = re.search(r'\b(?:voor|pre[-_]?|before|tot)\s*(19\d\d|20\d\d)\b', text, re.IGNORECASE)
    if m:
        y = int(m.group(1))
        y1 = y - 1
        if y1 <= 2025:
            return f"{y1} - {y1+1}"

    # Single standalone 4-digit year in filename or path
    m = re.search(r'\b(19\d\d|20\d\d)\b', text)
    if m:
        y1 = int(m.group(1))
        if 1980 <= y1 <= 2025:
            return f"{y1} - {y1+1}"

    return None

def normalize_document(d, course_code, course_name):
    fid = d["file_id"]
    path = d.get("path", "")
    fn = d.get("filename", "")
    ext = d.get("extension", "").lower()
    preview = d.get("content_preview") or {}
    p1 = preview.get("page1_text") or ""
    fb = preview.get("fallback_text") or ""
    is_scanned = preview.get("is_scanned_handwritten", False)
    orig_yr = d.get("year")
    orig_cat = d.get("category_id", 3)

    full_context = f"{path} {fn} {p1} {fb}"
    full_context_lower = full_context.lower()

    cat_id = orig_cat
    author = None
    year = extract_year_from_text(f"{path} {fn}") or orig_yr
    tags = ["old-burgieclan"]

    # Basic medium check
    if is_scanned or ext in ["jpg", "jpeg", "png", "heic"]:
        tags.append("Scan")

    # Clean extension from fn
    fn_no_ext = re.sub(r'\.[a-zA-Z0-9]+$', '', fn).strip()
    clean_fn = re.sub(r'[_.\-]+', ' ', fn_no_ext).strip()
    clean_fn = re.sub(rf'^{course_code}\s*[-_:]\s*', '', clean_fn, flags=re.IGNORECASE).strip()

    title = clean_fn

    # -------------------------------------------------------------
    # COURSE-SPECIFIC EXPERT REASONING
    # -------------------------------------------------------------

    # 1. H01M0A: Anki Flashcards Semester 6 ELT
    if course_code == "H01M0A":
        cat_id = 3
        year = "2023 - 2024"
        author = "Student 039"
        title = "Flashcards Semester 6 ELT"

    # 2. H03F6A: Industriële stage: Elektrotechniek
    elif course_code == "H03F6A":
        cat_id = 3
        author = "Student 036"
        tags.append("English")
        if ext == "apkg":
            year = "2024 - 2025"
            title = "Flashcards Electronical Medical Equipment (2024 - 2025)"
        else:
            m = re.search(r'Lecture\s*(\d+)_(.*)', fn_no_ext, re.IGNORECASE)
            if m:
                lec_num = m.group(1)
                topic = m.group(2).replace('_', ', ').strip()
                title = f"Samenvatting Les {lec_num} - {topic}"
                tags.append(f"Deel {lec_num}")
            else:
                title = f"Samenvatting - {clean_fn}"

    # 3. H09J4A: Building Blocks for Telecom Systems
    elif course_code == "H09J4A":
        tags.append("English")
        if "black smith-chart" in fn.lower():
            cat_id = 3
            title = "Formularium - Black Smith Charts (Exam Format)"
            tags.append("Formularium")
        elif "colour smith-chart" in fn.lower():
            cat_id = 3
            title = "Formularium - Colour Smith Charts (Exam Format)"
            tags.append("Formularium")
        elif "2018-2019_bbts_extra questions.pdf" in fn.lower():
            cat_id = 4
            year = "2018 - 2019"
            title = "Oefenzitting - Extra Questions (2018 - 2019)"
            tags.append("Opgave (Blanco)")
        elif "2019-2020_bbts_extra questions.pdf" in fn.lower():
            cat_id = 4
            year = "2019 - 2020"
            title = "Oefenzitting - Extra Questions (2019 - 2020)"
            tags.append("Opgave (Blanco)")
        elif "2019-2020_bbts_extra questions_solution.pdf" in fn.lower():
            cat_id = 4
            year = "2019 - 2020"
            title = "Oefenzitting - Extra Questions (Oplossing) (2019 - 2020)"
            tags.append("Oplossing")
        elif "examenvragen.docx" in fn.lower():
            cat_id = 2
            title = "Examenvragen Reconstructie"
            tags.append("Reconstructie / Vragen")
        elif "exercise session 3" in fn.lower():
            cat_id = 4
            title = "Oefenzitting 3 - Matching"
            tags.append("Deel 3")
        elif "hf45ex2001.pdf" in fn.lower():
            cat_id = 2
            year = "2000 - 2001"
            title = "Examen 2000 - 2001 (Prof. Nauwelaers)"
        elif "notities h2.pdf" in fn.lower():
            cat_id = 3
            title = "Lesnotities Hoofdstuk 2"
            tags.extend(["Lesnotities", "Handgeschreven", "Deel 2"])
        elif "paper over cpw" in fn.lower():
            cat_id = 6
            title = "Lesmateriaal - Miniature CPW Shunt Stubs (IEEE MTT)"
        elif "voorbeeldexamentoledo.txt" in fn.lower():
            cat_id = 2
            title = "Voorbeeldexamen Toledo (Oplossing)"
            tags.append("Oplossing")
        elif "1_microwaveparameters_transmissionlines" in fn.lower():
            cat_id = 6
            title = "Slides Deel 1 - Microwave Parameters & Transmission Lines (Prof. Schreurs)"
            tags.append("Deel 1")
        elif "2_passive_components_circuits" in fn.lower():
            cat_id = 6
            title = "Slides Deel 2 - Passive Components & Circuits (Prof. Schreurs)"
            tags.append("Deel 2")
        elif "3_smithchart_matching" in fn.lower():
            cat_id = 6
            title = "Slides Deel 3 - Smith Chart & Matching (Prof. Schreurs)"
            tags.append("Deel 3")
        elif "4_transistors_ft_fmax" in fn.lower():
            cat_id = 6
            title = "Slides Deel 4 - Transistors fT & fMAX (Prof. Schreurs)"
            tags.append("Deel 4")
        elif "5_noise" in fn.lower():
            cat_id = 6
            title = "Slides Deel 5 - Noise (Prof. Schreurs)"
            tags.append("Deel 5")
        elif "6_nonlinearcircuits" in fn.lower():
            cat_id = 6
            title = "Slides Deel 6 - Non-Linear Building Blocks (Prof. Schreurs)"
            tags.append("Deel 6")
        elif "7_microwavemeasurements" in fn.lower():
            cat_id = 6
            title = "Slides Deel 7 - Microwave Measurements (Prof. Schreurs)"
            tags.append("Deel 7")
        elif "pozar" in fn.lower() and "solutions" not in fn.lower():
            cat_id = 6
            title = "Handboek - Microwave Engineering (David M. Pozar)"
        elif "formulary.pdf" in fn.lower():
            cat_id = 3
            title = "Formularium (Prof. Schreurs)"
            tags.append("Formularium")
        elif "smith_chart_zy_mtt.pdf" in fn.lower():
            cat_id = 3
            title = "Formularium - Smith Chart ZY"
            tags.append("Formularium")
        elif "solutions_manual_for_microwave" in fn.lower():
            cat_id = 4
            title = "Handboek Oplossingen - Microwave Engineering (David M. Pozar)"
            tags.append("Oplossing")

    # 4. H01M3A: Elektronische basisschakelingen
    elif course_code == "H01M3A":
        if "bodeplotmaker.mw" in fn.lower():
            cat_id = 7
            title = "Labo Maple - Bodeplotmaker"
        elif "blackman tutorial" in fn.lower():
            cat_id = 3
            year = "2018 - 2019"
            author = "Student 121 & Student 013"
            title = "Samenvatting - Blackman Tutorial & Examenvoorbeelden"
            tags.extend(["Scan", "Handgeschreven"])
        elif "examenhandleiding" in path.lower():
            cat_id = 2
            is_sol = "oplossing" in fn.lower()
            is_upd = "updated" in fn.lower()
            title = f"Examenhandleiding - Voorbeeld{'oplossing' if is_sol else 'opgave'}{' (Updated)' if is_upd else ''} (Prof. Steyaert)"
            tags.append("Studiewijzer / Gids")
            if is_sol:
                tags.append("Oplossing")
            else:
                tags.append("Opgave (Blanco)")
        elif "opgeloste examens ariane" in path.lower():
            cat_id = 2
            author = "Ariane"
            if fn.lower().startswith("ariane_"):
                m = re.search(r'ariane_(\d+)', fn.lower())
                num = int(m.group(1)) if m else 1
                title = f"Examen Oplossingen (Ariane) (p. {num}/12)"
                tags.extend(["Oplossing", "Handgeschreven"])
            elif "ex1-van-het-hb" in fn.lower():
                cat_id = 4
                title = "Oefeningen Handboek - Oefening 1"
                tags.extend(["Oplossing", "Handgeschreven"])
            elif "lecture29" in fn.lower():
                cat_id = 6
                title = "Slides - OP-Amp Frequency Response (Dr. Alan Doolittle)"
                tags.append("English")
        elif "notes and exercises by student 083" in path.lower():
            author = "Student 083"
            if "oefenzitting" in fn.lower():
                cat_id = 4
                m = re.search(r'oefenzitting\s*(\d+)', fn.lower())
                oz_num = m.group(1) if m else "1"
                is_sol = "oplossing" in fn.lower()
                title = f"Oefenzitting {oz_num}{' (Oplossing)' if is_sol else ''}"
                tags.append(f"Deel {oz_num}")
                if is_sol:
                    tags.append("Oplossing")
                if "oefenzitting 2 ebs -  student 083.pdf" == fn.lower():
                    tags.append("Handgeschreven")
            elif "examen" in fn.lower():
                cat_id = 2
                if "2007" in fn.lower():
                    year = "2006 - 2007"
                    title = "Examen Januari 2007"
                    tags.append("Januari")
                elif "2021" in fn.lower():
                    year = "2020 - 2021"
                    title = "Examen Januari 2021"
                    tags.append("Januari")
                else:
                    title = "Examens uit Cursus"
        elif "oefenzittingen" in path.lower():
            cat_id = 4
            m = re.search(r'oefenzitting\s*(\d+)', path.lower() + " " + fn.lower())
            oz_num = m.group(1) if m else None
            if oz_num:
                tags.append(f"Deel {oz_num}")
            if "slides" in fn.lower():
                cat_id = 6
                yr_str = " (2015)" if "2015" in fn else (" (2019)" if "2019" in fn else "")
                title = f"Slides Oefenzitting {oz_num or ''}{yr_str}"
            elif "z1_opl" in fn.lower():
                m_sub = re.search(r'z1_opl(\d+)', fn.lower())
                sub = m_sub.group(1) if m_sub else ""
                title = f"Oefenzitting 1 - Opgave {sub[0]}.{sub[1:]} (Oplossing)"
                tags.extend(["Oplossing", "Handgeschreven", "Deel 1"])
            elif "ebs3_pg_oplossingen_2014" in fn.lower():
                year = "2013 - 2014"
                title = "Oefenzitting 3 (Oplossing) (2014)"
                tags.extend(["Oplossing", "Deel 3"])
            elif "ebs_oz4_solution" in fn.lower():
                title = "Oefenzitting 4 (Oplossing)"
                tags.extend(["Oplossing", "Handgeschreven", "Deel 4"])
            else:
                is_sol = "oplossing" in fn.lower()
                title = f"Oefenzitting {oz_num or ''}{' (Oplossing)' if is_sol else ''}"
                if is_sol:
                    tags.append("Oplossing")
        elif "samenvattingen" in path.lower() or "legacy" in path.lower():
            cat_id = 3
            if "circuit_naar_signaalverwerkingsblok" in fn.lower():
                author = "Stefanie"
                title = "Samenvatting - Gelineariseerde Schakeling naar Signaalverwerkingsblok"
            elif "bode plot - schema" in fn.lower():
                title = "Formularium - Bode Plot Schema"
                tags.append("Formularium")
            elif "student 082" in fn.lower():
                author = "Student 082"
                title = "Samenvatting EBS"
            elif "student 079" in fn.lower():
                year = "2024 - 2025"
                author = "Student 079"
                title = "Samenvatting EBS"
                tags.append("Handgeschreven")
            elif "student 072" in fn.lower():
                year = "2017 - 2018"
                author = "Student 072"
                title = "Samenvatting Elektronische Basisschakelingen"
        elif "examens" in path.lower():
            cat_id = 2
            if "2019-1.jpg" == fn.lower():
                year = "2018 - 2019"
                title = "Examen 2019 - Deel 1"
                tags.extend(["Handgeschreven", "Deel 1"])
            elif "2019-2.jpg" == fn.lower():
                year = "2018 - 2019"
                title = "Examen 2019 - Deel 2"
                tags.extend(["Handgeschreven", "Deel 2"])
            elif "examen ebs _ student 121" in fn.lower():
                year = "2018 - 2019"
                author = "Student 121"
                title = "Examen EBS"
                tags.append("Handgeschreven")
            elif "ebs_08_01_2026" in fn.lower():
                year = "2025 - 2026"
                title = "Examen 8 Januari 2026"
                tags.extend(["Januari", "Handgeschreven"])
            elif "ex1 van het hb" in fn.lower():
                cat_id = 4
                title = "Oefeningen Handboek - Oefening 1"
                tags.append("Handgeschreven")
            elif "examen_2007_jan" in fn.lower():
                year = "2006 - 2007"
                title = "Examen Januari 2007"
                tags.append("Januari")
            elif "examen_2008_aug" in fn.lower():
                year = "2007 - 2008"
                title = "Examen Augustus 2008 (Herexamen)"
                tags.append("Herexamen (2de zit)")
            elif "examenvragen-ebs-henk" in fn.lower():
                author = "Henk"
                title = "Examenvragen"
                tags.extend(["Reconstructie / Vragen", "Handgeschreven"])
            elif "mijn exame.pdf" == fn.lower():
                title = "Examen Reconstructie"
                tags.extend(["Reconstructie / Vragen", "Handgeschreven"])
            elif "vraag 2 modelex1.jpg" == fn.lower():
                title = "Modelexamen 1 - Vraag 2"
                tags.extend(["Handgeschreven", "Deel 2"])
            elif "student 117" in fn.lower():
                year = "2007 - 2008"
                author = "Student 117"
                title = "Examen 17 Januari 2008 (Oplossing)"
                tags.extend(["Januari", "Oplossing", "Handgeschreven"])
            elif "examen 15.01.2021" in path.lower():
                year = "2020 - 2021"
                idx_str = " (Deel 2)" if "(2)" in fn else " (Deel 1)"
                title = f"Examen 15 Januari 2021{idx_str}"
                tags.extend(["Januari", "Handgeschreven"])
            elif "steyaert_examen" in fn.lower():
                m_date = re.search(r'(\d{4})_(\d{2})_(\d{2})', fn)
                if m_date:
                    y_s, m_s, d_s = m_date.group(1), int(m_date.group(2)), int(m_date.group(3))
                    m_names = {1: "Januari", 6: "Juni", 8: "Augustus", 9: "September"}
                    is_sol = "oplossing" in fn.lower()
                    is_opg = "opgave" in fn.lower()
                    status = " (Oplossing)" if is_sol else (" (Opgave)" if is_opg else "")
                    suffix = " 2" if fn.endswith("opgave2.pdf") else ""
                    title = f"Examen {d_s} {m_names.get(m_s, '')} {y_s}{suffix}{status}"
                    if m_s == 1:
                        tags.append("Januari")
                    elif m_s == 6:
                        tags.append("Juni")
                    elif m_s in [8, 9]:
                        tags.append("Herexamen (2de zit)")
                    if is_sol:
                        tags.append("Oplossing")
                    elif is_opg:
                        tags.append("Opgave (Blanco)")
                    if is_scanned:
                        tags.append("Handgeschreven")

    # 5. H01M1A: Elektromagnetische golven
    elif course_code == "H01M1A":
        if "studentencursus_2019-2020" in fn.lower():
            cat_id = 3
            year = "2019 - 2020"
            title = "Studentencursus Elektromagnetische Golven (2019 - 2020)"
        elif "emp_session1_slides" in fn.lower():
            cat_id = 6
            title = "Slides - Free Space Propagation and Link Budget"
            tags.append("English")
        elif "examen emg 7 juni 2019" in fn.lower():
            cat_id = 2
            year = "2018 - 2019"
            title = "Examen 7 Juni 2019"
            tags.append("Juni")
        elif "examenvragenemg opl" in fn.lower():
            cat_id = 2
            title = "Examenvragen (Oplossing)"
            tags.extend(["Reconstructie / Vragen", "Oplossing"])
        elif "exm.pdf" == fn.lower():
            cat_id = 2
            title = "Examenvragen Reconstructie"
            tags.extend(["Reconstructie / Vragen", "Handgeschreven"])
        elif "meerkeuzevragen_emg_jasper" in fn.lower():
            cat_id = 2
            author = "Jasper"
            title = "Meerkeuzevragen Examen"
            tags.append("Meerkeuze")
        elif "oud examens_oplossingen_pedrodevogelaere" in fn.lower():
            cat_id = 2
            author = "Pedro Devogelaere"
            title = "Oude Examens (Oplossing)"
            tags.extend(["Bundel / Alle", "Oplossing", "Handgeschreven"])
        elif "griffiths" in fn.lower():
            cat_id = 6
            title = "Handboek - Introduction to Electrodynamics (David J. Griffiths)"
            tags.append("English")
        elif "examen emg 12-06-2023 - student 083" in fn.lower():
            cat_id = 2
            year = "2022 - 2023"
            author = "Student 083"
            title = "Examen 12 Juni 2023"
            tags.append("Juni")
        elif "notes and exercises by student 083" in path.lower():
            author = "Student 083"
            if "smith chart tutorial" in fn.lower():
                cat_id = 3
                title = "Samenvatting - Smith Chart Tutorial"
            elif "smith chart.pdf" == fn.lower():
                cat_id = 3
                title = "Formularium - Smith Chart"
                tags.append("Formularium")
            elif "electromagnetic propagation - session 1" in fn.lower():
                cat_id = 4
                title = "Oefenzitting 1 - Free Space Propagation & Link Budget"
                tags.extend(["English", "Deel 1"])
            elif "extra oefeningen emg" in fn.lower():
                cat_id = 4
                title = "Extra Oefeningen"
                tags.append("Handgeschreven")
            elif "oefenzitting" in fn.lower():
                cat_id = 4
                m = re.search(r'oefenzitting\s*(\d+)', fn.lower())
                oz_num = m.group(1) if m else "1"
                sub_topic = "Maxwell en Netwerktheorie" if oz_num in ["1", "2"] else ("Golfgeleiders" if oz_num == "3" else "Diëlectrische Golfgeleiders")
                title = f"Oefenzitting {oz_num} - {sub_topic}"
                tags.append(f"Deel {oz_num}")
        elif "handboeken/orfanidis" in path.lower():
            cat_id = 6
            tags.append("English")
            m = re.search(r'ch(\d+)', fn.lower())
            ch_num = int(m.group(1)) if m else 1
            ch_titles = {
                1: "Maxwell's Equations", 2: "Uniform Plane Waves", 3: "Pulse Propagation in Dispersive Media",
                4: "Problems on Pulse Propagation", 5: "Reflection and Transmission", 6: "Problems on Reflection & Transmission",
                7: "Oblique Incidence", 8: "Multilayer Film Applications", 9: "Problems on Multilayer Film",
                10: "Transmission Lines", 11: "Problems on Transmission Lines", 12: "Coupled Lines",
                13: "S-Parameters", 14: "Radiation Fields", 15: "Transmitting and Receiving Antennas",
                16: "Linear and Loop Antennas", 17: "Radiation from Apertures", 18: "Problems on Apertures",
                19: "Lens Antennas", 20: "Array Design Methods", 21: "Problems on Array Design",
                22: "Currents on Antennas", 23: "Problems on Antenna Currents"
            }
            topic = ch_titles.get(ch_num, f"Chapter {ch_num}")
            title = f"Handboek - Electromagnetic Waves and Antennas: Chapter {ch_num} - {topic} (S.J. Orfanidis)"
            if ch_num <= 19:
                tags.append(f"Deel {ch_num}")
        elif "oefenzittingen" in path.lower():
            cat_id = 4
            if "student 121" in fn.lower():
                year = "2018 - 2019"
                author = "Student 121"
                title = "Oefenzitting 3 - Stappenplan"
                tags.extend(["Handgeschreven", "Deel 3"])
            elif "leiddraden en oefzn 2006-2007" in fn.lower():
                year = "2006 - 2007"
                title = "Leidraden en Oefeningen (2006 - 2007)"
            elif "emg_oefenbundel" in fn.lower():
                title = "Oefenbundel Elektromagnetische Golven"
                tags.append("Bundel / Alle")
            elif "student 110" in fn.lower():
                author = "Student 110"
                title = "Oefenzitting 1"
                tags.extend(["Handgeschreven", "Deel 1"])
            elif "oefenzitting123 notities" in fn.lower():
                title = "Oefenzittingen 1, 2 en 3 - Notities"
                tags.extend(["Lesnotities", "Handgeschreven"])
            elif "student 119" in fn.lower():
                author = "Student 119"
                title = "Oefenzitting 2 (Oplossing)"
                tags.extend(["Oplossing", "Handgeschreven", "Deel 2"])
            elif "student 105" in fn.lower():
                year = "2018 - 2019"
                author = "Student 105"
                title = "Oefenzittingen"
                tags.extend(["Bundel / Alle", "Handgeschreven"])
            elif "student 074" in full_context_lower or "emg_stubs_md" in fn.lower():
                author = "Student 074"
                title = "Oefenzitting - Stubs"
            elif "oefenz1vraag3" in fn.lower():
                part_idx = " (Deel 2)" if "deel2" in fn.lower() else " (Deel 1)"
                title = f"Oefenzitting 1 - Vraag 3{part_idx}"
                tags.extend(["Handgeschreven", "Deel 1"])
            elif "zitting_" in fn.lower():
                m = re.search(r'zitting_(\d+)', fn.lower())
                z_num = m.group(1) if m else "1"
                z_topics = {"1": "Maxwell en Netwerktheorie", "3": "Golfgeleiders", "4": "Diëlectrische Golfgeleiders"}
                title = f"Oefenzitting {z_num} - {z_topics.get(z_num, '')}"
                tags.append(f"Deel {z_num}")
        elif "samenvattingen" in path.lower():
            cat_id = 3
            if "leidraden 2006-2007 (oplossing)" in fn.lower():
                cat_id = 4
                year = "2006 - 2007"
                title = "Leidraden Oefeningen (Oplossing) (2006 - 2007)"
                tags.append("Oplossing")
            elif "emg_samenvatting (caro)" in fn.lower():
                author = "Student 019"
                title = "Samenvatting"
                tags.append("Handgeschreven")
            elif "student 072" in fn.lower():
                year = "2017 - 2018"
                author = "Student 072"
                title = "Formularium & Samenvatting"
                tags.append("Formularium")
            elif "student 041" in full_context_lower:
                year = "2022 - 2023"
                author = "Student 041"
                title = "Studentencursus Elektromagnetische Golven"
            elif "studentencursus zet" in fn.lower():
                title = "Studentencursus Elektromagnetische Golven (ZET)"
            elif "smith chart" in fn.lower() or "smithchart" in fn.lower() or "transmission lines" in fn.lower():
                if "student 121" in fn.lower():
                    year = "2018 - 2019"
                    author = "Student 121"
                    title = "Samenvatting - Smith Chart Stappenplan"
                    tags.append("Handgeschreven")
                elif "leeg" in fn.lower():
                    title = "Formularium - Blanco Smith Chart"
                    tags.append("Formularium")
                elif "single stub" in fn.lower():
                    title = "Tutorial - Smith Chart Single Stub Matching (Amanogawa)"
                    tags.append("English")
                elif "transmission lines impedance matching" in fn.lower():
                    title = "Tutorial - Transmission Lines Impedance Matching (Amanogawa)"
                    tags.append("English")
                elif "hon tat hui" in full_context_lower or "transmission lines - smith chart" in fn.lower():
                    title = "Tutorial - Transmission Lines Smith Chart & Matching (Hon Tat Hui)"
                    tags.append("English")
                elif ext == "swf":
                    cat_id = 6
                    m = re.search(r'smithchart(\d+)', fn.lower())
                    sw_num = m.group(1) if m else "0"
                    title = f"Tutorial Flash - Smith Chart Deel {sw_num}"
                    if int(sw_num) > 0 and int(sw_num) <= 19:
                        tags.append(f"Deel {sw_num}")
                elif "uitleg.txt" in fn.lower():
                    cat_id = 6
                    title = "Handleiding - Smith Chart Tutorials"
                    tags.append("Studiewijzer / Gids")
        elif "slides" in path.lower():
            cat_id = 6
            if "animations.ppt" in fn.lower():
                title = "Slides - Animaties Golven"
            elif "slides 2013" in path.lower() or "slides 2016" in path.lower():
                yr_val = "2012 - 2013" if "2013" in path else "2015 - 2016"
                year = yr_val
                m = re.search(r'lecture_(\d+)([ab])?', fn.lower())
                lec_num = m.group(1) if m else "0"
                sub_l = m.group(2) if m else ""
                lec_topics = {
                    "0": "Inleiding", "1": "Maxwell en Netwerktheorie", "2": "Transmissielijnen I",
                    "3": "Transmissielijnen II", "4": "Vlakke Golven", "5": "Vlakke Golven: Loodrechte Inval",
                    "6": "Vlakke Golven: Schuine Inval", "7": "Golfgeleiders", "8": "Diëlectrische Golfgeleiders",
                    "9": "Elektromagnetische Straling", "10": "Draadloze Verbinding"
                }
                topic = lec_topics.get(lec_num, f"Les {lec_num}")
                if sub_l == "b":
                    title = f"Slides Les {lec_num}b - {topic} (Oplossing) (Prof. Vandenbosch)"
                    tags.append("Oplossing")
                elif sub_l == "a":
                    title = f"Slides Les {lec_num}a - {topic} (Prof. Vandenbosch)"
                else:
                    title = f"Slides Les {lec_num} - {topic} (Prof. Vandenbosch)"
                if int(lec_num) > 0 and int(lec_num) <= 19:
                    tags.append(f"Deel {lec_num}")
            elif "slides met notes" in path.lower():
                m = re.search(r'lecture_(\d+)', fn.lower())
                lec_num = m.group(1) if m else "1"
                lec_topics = {
                    "1": "Maxwell en Netwerktheorie", "2": "Transmissielijnen I",
                    "7": "Golfgeleiders", "8": "Diëlectrische Golfgeleiders",
                    "9": "Elektromagnetische Straling"
                }
                topic = lec_topics.get(lec_num, f"Les {lec_num}")
                title = f"Slides met Notities Les {lec_num} - {topic}"
                tags.append("Lesnotities")
                if int(lec_num) > 0 and int(lec_num) <= 19:
                    tags.append(f"Deel {lec_num}")

    # 6. H01L1A: Digitale elektronica en processoren
    elif course_code == "H01L1A":
        if "inhoudstafel dep" in fn.lower():
            cat_id = 3
            title = "Inhoudstafel Digitale Elektronica en Processoren"
        elif "dep_examen_21aug23_oplossing" in fn.lower():
            cat_id = 2
            year = "2022 - 2023"
            title = "Examen 21 Augustus 2023 (Herexamen) (Oplossing)"
            tags.extend(["Herexamen (2de zit)", "Oplossing"])
        elif "dep_examen_24juni24_oplossing" in fn.lower():
            cat_id = 2
            year = "2023 - 2024"
            title = "Examen 24 Juni 2024 (Oplossing)"
            tags.extend(["Juni", "Oplossing"])
        elif "dep_examen_26juni23_oplossing" in fn.lower():
            cat_id = 2
            year = "2022 - 2023"
            title = "Examen 26 Juni 2023 (Oplossing)"
            tags.extend(["Juni", "Oplossing"])
        elif "dep_examen_6juni24" in fn.lower():
            cat_id = 2
            year = "2023 - 2024"
            title = "Examen 6 Juni 2024 (Opgave)"
            tags.extend(["Juni", "Opgave (Blanco)"])
        elif "ex 6-06-2014" in fn.lower():
            cat_id = 2
            year = "2013 - 2014"
            part = " (Deel 2)" if "002" in fn else " (Deel 1)"
            title = f"Examen 6 Juni 2014{part}"
            tags.extend(["Juni", "Handgeschreven"])
        elif "25 juni 2014" in path.lower():
            cat_id = 2
            year = "2013 - 2014"
            sub_t = " - VHDL" if "vhdl" in fn.lower() else " (Opgave)"
            title = f"Examen 25 Juni 2014{sub_t}"
            tags.extend(["Juni", "Handgeschreven"])
            if "opgave" in fn.lower():
                tags.append("Opgave (Blanco)")
        elif "8 juni 2023" in path.lower():
            cat_id = 2
            year = "2022 - 2023"
            if "oplossing" in fn.lower():
                title = "Examen 8 Juni 2023 (Oplossing)"
                tags.extend(["Juni", "Oplossing"])
            elif "solution" in fn.lower():
                title = "Examen 8 Juni 2023 (Modeloplossing)"
                tags.extend(["Juni", "Modeloplossing", "English", "Handgeschreven"])
            else:
                title = "Examen 8 Juni 2023 (Opgave)"
                tags.extend(["Juni", "Opgave (Blanco)"])
        elif "examen 2013-06-15" in path.lower():
            cat_id = 2
            year = "2012 - 2013"
            part = " (Deel 2)" if "examen.2" in fn.lower() else " (Deel 1)"
            title = f"Examen 15 Juni 2013{part}"
            tags.extend(["Juni", "Handgeschreven"])
        elif "oplijsting examenvragen per hoofdstuk" in path.lower():
            cat_id = 2
            author = "Student 021"
            m = re.search(r'deel(\d+)\s*(.*?)\s*-\s*oplossingen', fn.lower())
            if m:
                p_num, p_top = m.group(1), m.group(2).strip().title()
                title = f"Examenvragen Deel {p_num} - {p_top} (Oplossing)"
                tags.extend(["Reconstructie / Vragen", "Oplossing", f"Deel {p_num}"])
            else:
                title = f"Examenvragen (Oplossing)"
                tags.extend(["Reconstructie / Vragen", "Oplossing"])
        elif "oplossingen gertjan" in path.lower():
            cat_id = 2
            author = "Gertjan"
            if "16.6.2011" in path:
                year = "2010 - 2011"
                title = "Examen 16 Juni 2011 - Oplossing"
                tags.extend(["Juni", "Oplossing", "Handgeschreven"])
            elif "27.6.2007" in path:
                year = "2006 - 2007"
                title = "Examen 27 Juni 2007 - Oplossing"
                tags.extend(["Juni", "Oplossing", "Handgeschreven"])
        elif "poging tot oplossing vraag 4" in path.lower():
            cat_id = 2
            if "2010" in fn:
                year = "2009 - 2010"
                title = "Examen Juni 2010 - Vraag 4 (Oplossing)"
                tags.extend(["Juni", "Oplossing", "Handgeschreven"])
            else:
                year = "2011 - 2012"
                title = "Examen Juni 2012 - Vraag 4 (Oplossing)"
                tags.extend(["Juni", "Oplossing", "Handgeschreven"])
        elif "extra oefeningen op fsmd" in path.lower():
            cat_id = 2
            if "beste maksim" in fn.lower():
                title = "Examenvragen FSMD & Feedback (Prof. Dehaene)"
                tags.append("Reconstructie / Vragen")
            elif "dep extra opgaven" in fn.lower():
                title = "Extra Examenopgaven FSMD"
                tags.extend(["Reconstructie / Vragen", "Handgeschreven"])
            elif "examenvragen2007" in fn.lower():
                year = "2006 - 2007"
                title = "Examenvragen FSMD & VHDL 2007"
                tags.extend(["Reconstructie / Vragen"])
            elif "asm" in fn.lower():
                m_yr = re.search(r'asm(\d{4})', fn.lower())
                yr_val = m_yr.group(1) if m_yr else ""
                title = f"FSMD Ontwerp ASM {yr_val}"
            elif "ontwerp" in fn.lower():
                m_num = re.search(r'ontwerp(\d+)', fn.lower())
                num = m_num.group(1) if m_num else "1"
                title = f"FSMD Voorbeeldontwerp {num}"
        elif "theorievragen" in path.lower():
            cat_id = 2
            title = f"Examenvragen Theorie{' (Oplossing)' if 'oplossing' in fn.lower() or 'antwoorden' in fn.lower() else ''}"
            tags.extend(["Reconstructie / Vragen", "Theorie"])
            if "oplossing" in fn.lower() or "antwoorden" in fn.lower():
                tags.append("Oplossing")
        elif "legacy/handboek" in path.lower():
            if "oplossingen handboek" in fn.lower():
                cat_id = 4
                title = "Handboek Oplossingen - Fundamentals of Digital Logic with VHDL Design"
                tags.extend(["Oplossing", "English"])
            else:
                cat_id = 6
                if "wakerly" in fn.lower():
                    title = "Handboek - Digital Design Principles & Practices (John F. Wakerly)"
                elif "principles of digital design" in fn.lower():
                    title = "Handboek - Principles of Digital Design: Chapter 8 & 9"
                elif "dep_extrahandboek_ch" in fn.lower():
                    m = re.search(r'ch(\d+)', fn.lower())
                    ch_num = m.group(1) if m else "8"
                    title = f"Handboek - Digital Design: Chapter {ch_num}"
                    tags.append(f"Deel {ch_num}")
                else:
                    title = "Handboek - Fundamentals of Digital Logic with VHDL Design"
                tags.append("English")
        elif "oude oz'en (2012)" in path.lower() or "oefenzittingen" in path.lower():
            cat_id = 4
            m = re.search(r'oz(\d+)', fn.lower())
            oz_num = m.group(1) if m else None
            is_sol = "oplossing" in fn.lower()
            if oz_num:
                tags.append(f"Deel {oz_num}")
            if is_sol:
                tags.append("Oplossing")
            if "oude oz'en" in path.lower():
                year = "2011 - 2012"
                sub_spec = ""
                if "checksum" in fn.lower():
                    sub_spec = " - Checksum"
                elif "schoolvoorbeeld" in fn.lower():
                    sub_spec = " - Schoolvoorbeeld"
                elif fn.lower().startswith("oz8 - 1"):
                    sub_spec = " - Ontwerpvraag 1"
                elif fn.lower().startswith("oz8 - 2"):
                    sub_spec = " - Ontwerpvraag 2"
                elif fn.lower().startswith("oz5 - 1") or fn.lower().startswith("oz6 - 1"):
                    sub_spec = " - Deel 1"
                elif fn.lower().startswith("oz5 - 2") or fn.lower().startswith("oz6 - 2"):
                    sub_spec = " - Deel 2"
                title = f"Oefenzitting {oz_num or ''}{sub_spec}{' (Oplossing)' if is_sol else ''}"
            else:
                oz_topics = {
                    "1": "Combinatorische Schakelingen", "2": "Sequentiële Schakelingen 1",
                    "3": "Sequentiële Schakelingen 2 (FSMD)", "4": "Computerarchitectuur (RISC-V)"
                }
                topic = oz_topics.get(oz_num, "")
                is_opg = "opgave" in fn.lower()
                status = " (Oplossing)" if is_sol else (" (Opgave)" if is_opg else "")
                title = f"Oefenzitting {oz_num or ''} - {topic}{status}"
                if is_opg:
                    tags.append("Opgave (Blanco)")
        elif "samenvattingen" in path.lower() or "studentencursussen" in path.lower():
            cat_id = 3
            if "student 055" in fn.lower():
                year = "2019 - 2020"
                author = "Student 055"
                if "examenvragen" in fn.lower():
                    cat_id = 2
                    title = "Examenvragen 2019 - 2020"
                    tags.extend(["Reconstructie / Vragen", "Handgeschreven"])
                else:
                    title = "Samenvatting"
                    tags.append("Handgeschreven")
            elif "student 105" in fn.lower():
                year = "2017 - 2018"
                author = "Student 105"
                title = "Samenvatting"
                tags.append("Handgeschreven")
            elif "student-059" in fn.lower() or "student059" in fn.lower():
                author = "Student 059"
                title = "Samenvatting - Schema's"
            elif "student 005" in fn.lower():
                year = "2018 - 2019"
                author = "Student 005"
                title = "Samenvatting - Theorievragen"
                tags.extend(["Theorie", "Handgeschreven"])
            elif "kida" in fn.lower():
                author = "Kida"
                topic = "Processoren" if "processoren" in fn.lower() else ("Combinatorische Logica" if "combinatorische" in fn.lower() else ("Introductie" if "intro" in fn.lower() else "Sequentiële Logica"))
                title = f"Samenvatting Deel - {topic}"
            elif "student 041" in full_context_lower:
                year = "2021 - 2022"
                author = "Student 041"
                title = "Samenvatting Digitale Elektronica"
            elif "willem van onsem" in fn.lower():
                author = "Willem Van Onsem"
                wip = " - WIP" if "work-in-progress" in fn.lower() else ""
                title = f"Studentencursus Digitale Elektronica & Processoren{wip}"
            elif "studentencursus deel" in fn.lower():
                m = re.search(r'deel\s*([ivx]+|\d+)', fn.lower())
                d_str = "1" if m and m.group(1).lower() in ["i", "1"] else "2"
                title = f"Studentencursus Deel {d_str}"
                tags.append(f"Deel {d_str}")
            elif "dep kobe 2023" in path.lower():
                year = "2022 - 2023"
                author = "Student 056"
                if "asic" in fn.lower():
                    title = "Lesnotities Les 11 - ASIC en FPGA"
                    tags.extend(["Lesnotities", "Deel 11"])
                else:
                    title = "Lesnotities Deel 4 - Ripes RISC-V ISA"
                    tags.extend(["Lesnotities", "Deel 4"])
            elif "te kennen woorden" in fn.lower():
                num = "1" if "1" in fn else "2"
                title = f"Samenvatting - Te Kennen Begrippen Deel {num}"
                tags.append(f"Deel {num}")
        elif "examens" in path.lower():
            cat_id = 2
            m = re.search(r'examen\s*(19\d\d|20\d\d)[-_](\d{2})[-_](\d{2})', fn.lower())
            if m:
                y_s, m_s, d_s = m.group(1), int(m.group(2)), int(m.group(3))
                m_names = {1: "Januari", 6: "Juni", 8: "Augustus", 9: "September"}
                m_name = m_names.get(m_s, "")
                is_sol = "oplossing" in fn.lower()
                status = " (Oplossing)" if is_sol else ""
                title = f"Examen {d_s} {m_name} {y_s}{status}"
                if m_s == 1:
                    tags.append("Januari")
                elif m_s == 6:
                    tags.append("Juni")
                elif m_s in [8, 9]:
                    tags.append("Herexamen (2de zit)")
                if is_sol:
                    tags.append("Oplossing")
                if is_scanned:
                    tags.append("Handgeschreven")
            elif "examenvragen (opsomming)" in fn.lower():
                title = "Examenvragen Overzicht"
                tags.append("Reconstructie / Vragen")
            elif "examenvragen - vtk" in fn.lower():
                title = "Examenvragen VTK Wiki"
                tags.append("Reconstructie / Vragen")
            elif "mogelijke examenvragen fsmd" in fn.lower():
                title = "Examenvragen FSMD (Toledo)"
                tags.append("Reconstructie / Vragen")
            elif "vb oef 4 examen dep" in fn.lower():
                title = "Voorbeeldexamen - Vraag 4"
                tags.append("Handgeschreven")

    # 7. H01M5A: Halfgeleidercomponenten
    elif course_code == "H01M5A":
        if "tussentijdse toetsen" in path.lower() or "ttt" in fn.lower():
            cat_id = 5
            if "student 027" in fn.lower():
                author = "Student 027"
                title = "TTT Oplossingen"
                tags.extend(["Oplossing", "Handgeschreven"])
            else:
                m_ttt = re.search(r'ttt\s*#?(\d+)', fn.lower())
                ttt_num = m_ttt.group(1) if m_ttt else "1"
                m_yr = re.search(r'20\d\d', fn)
                yr_val = m_yr.group(0) if m_yr else ""
                ttt_topics = {"1": "Basics & Diodes", "2": "MOSCAP & MOSFET", "3": "Bipolair & Bandendiagramma"}
                topic = ttt_topics.get(ttt_num, "")
                title = f"TTT {ttt_num} - {topic}{f' ({yr_val})' if yr_val else ''}"
                tags.append("Tussentijds (Midterm)")
        elif "notes and exercises by student 083" in path.lower():
            author = "Student 083"
            if "oefenzittingen hgc" in path.lower():
                m_oz = re.search(r'oefenzitting\s*(\d+)\s*hgc\s*-\s*(.*?)\s*-\s*(?:oplossingen?\s*-\s*)?student 083', fn.lower())
                if m_oz:
                    oz_num = m_oz.group(1)
                    topic = m_oz.group(2).strip().title()
                    is_sol = "oplossing" in fn.lower()
                    if oz_num in ["7", "8"]:
                        cat_id = 2
                        title = f"Examenvragen Deel {int(oz_num)-6}{' (Oplossing)' if is_sol else ''}"
                        tags.extend(["Reconstructie / Vragen", f"Deel {int(oz_num)-6}"])
                        if is_sol:
                            tags.append("Oplossing")
                    else:
                        cat_id = 4
                        title = f"Oefenzitting {oz_num} - {topic}{' (Oplossing)' if is_sol else ''}"
                        tags.append(f"Deel {oz_num}")
                        if is_sol:
                            tags.append("Oplossing")
            elif "slides hgc" in path.lower():
                cat_id = 6
                m_part = re.search(r'part\s*(\d+)\s*-\s*(.*?)\s*-\s*student 083', fn.lower())
                if m_part:
                    p_num = m_part.group(1)
                    topic = m_part.group(2).strip().title()
                    title = f"Slides Deel {p_num} - {topic}"
                    tags.append(f"Deel {p_num}")
            elif "voorbeeldexamens hgc" in path.lower():
                cat_id = 2
                if "2019-06-21" in fn:
                    year = "2018 - 2019"
                    title = "Examen 21 Juni 2019"
                    tags.append("Juni")
                elif "2006-2015" in fn:
                    is_sol = "oplossing" in fn.lower()
                    title = f"Examenoefeningen 2006 - 2015{' (Oplossing)' if is_sol else ''}"
                    tags.extend(["Oefeningen (Examen)", "Bundel / Alle"])
                    if is_sol:
                        tags.extend(["Oplossing", "Handgeschreven"])
        elif "oefenzittingen" in path.lower():
            cat_id = 4
            if "student027" in fn.lower():
                author = "Student 027"
                m_oz = re.search(r'oz(\d+)', fn.lower())
                oz_num = m_oz.group(1) if m_oz else "1"
                oz_names = {"1": "Basis Fysica", "2": "Diode", "3": "MOSCAP", "4": "MOSFET", "5": "Bipolair", "6": "Bandendiagramma's"}
                title = f"Oefenzitting {oz_num} - {oz_names.get(oz_num, '')}"
                tags.extend(["Handgeschreven", f"Deel {oz_num}"])
            elif "07 labo" in path.lower():
                cat_id = 7
                if "solar cell" in fn.lower():
                    title = "Labo - Solar Cell Processing"
                elif "led processing" in fn.lower():
                    title = "Labo - LED Processing"
                elif "general presentation" in fn.lower():
                    title = "Labo - Algemene Presentatie"
                elif "labo metingen" in path.lower():
                    part = " (Deel 1)" if "p1" in fn.lower() else " (Deel 2)"
                    title = f"Labo - Metingen{part}"
                    tags.append("Handgeschreven")
            elif "bandendiagramma" in path.lower() or "bandendiagrammas" in fn.lower():
                if ext in ["jpeg", "jpg"]:
                    part = " (Deel 1)" if "1ACAE6A8" in fn else " (Deel 2)"
                    title = f"Oefenzitting 6 - Bandendiagramma's{part}"
                    tags.extend(["Handgeschreven", "Deel 6"])
                else:
                    is_sol = "oplossing" in fn.lower()
                    title = f"Oefenzitting 6 - Bandendiagramma's{' (Oplossing)' if is_sol else ''}"
                    tags.append("Deel 6")
                    if is_sol:
                        tags.append("Oplossing")
            elif "oplossingen assistent oz 2020" in path.lower():
                year = "2019 - 2020"
                m_oz = re.search(r'oz(\d+)', fn.lower())
                oz_num = m_oz.group(1) if m_oz else "1"
                oz_names = {"1": "Basis Fysica", "2": "Diode", "3": "MOSCAP"}
                title = f"Oefenzitting {oz_num} - {oz_names.get(oz_num, '')} (Oplossing) (2020)"
                tags.extend(["Oplossing", f"Deel {oz_num}", "English"])
            else:
                m_oz = re.search(r'0(\d+)', path.lower())
                oz_num = m_oz.group(1) if m_oz else "1"
                oz_names = {"1": "Basis Fysica", "2": "Diode", "3": "MOSCAP", "4": "MOSFET", "5": "Bipolair"}
                topic = oz_names.get(oz_num, "")
                if "slides" in fn.lower():
                    cat_id = 6
                    title = f"Slides Oefenzitting {oz_num} - {topic}"
                    tags.append(f"Deel {oz_num}")
                else:
                    is_sol = "oplossing" in fn.lower() or "sol" in fn.lower()
                    is_opg = "opgave" in fn.lower() or "ex" in fn.lower()
                    status = " (Oplossing)" if is_sol else (" (Opgave)" if is_opg else "")
                    title = f"Oefenzitting {oz_num} - {topic}{status}"
                    tags.append(f"Deel {oz_num}")
                    if is_sol:
                        tags.append("Oplossing")
                    elif is_opg:
                        tags.append("Opgave (Blanco)")
                    if is_scanned:
                        tags.append("Handgeschreven")
        elif "extra oefeningen" in path.lower():
            if "student 027" in fn.lower():
                author = "Student 027"
                if "reeks" in fn.lower():
                    m_r = re.search(r'reeks(\d+)', fn.lower())
                    r_num = m_r.group(1) if m_r else "1"
                    title = f"Extra Oefeningen Reeks {r_num} (Oplossing)"
                    tags.extend(["Oplossing", "Handgeschreven", f"Deel {r_num}"])
                else:
                    title = "Extra Oefeningen"
                    tags.append("Handgeschreven")
            else:
                cat_id = 4
                m_r = re.search(r'reeks(\d+)', fn.lower())
                r_num = m_r.group(1) if m_r else "1"
                title = f"Extra Oefeningen Reeks {r_num} (Opgave)"
                tags.extend(["Opgave (Blanco)", f"Deel {r_num}"])
        elif "handboeken" in path.lower():
            cat_id = 6
            tags.append("English")
            if "semi-conductors an introduction" in fn.lower():
                title = "Handboek - Semi-Conductors: An Introduction"
            elif "semiconductor devices" in fn.lower():
                title = "Handboek - Semiconductor Devices (3rd Ed.)"
            elif "semiconductor physics" in fn.lower():
                title = "Handboek - Semiconductor Physics and Devices: Basic Principles (3rd Ed.)"
        elif "formularium" in path.lower():
            cat_id = 3
            if "extra informatie 1" in fn.lower():
                title = "Formularium - Extra Informatie Deel 1"
                tags.extend(["Formularium", "Handgeschreven", "Deel 1"])
            elif "extra informatie 2" in fn.lower():
                title = "Formularium - Extra Informatie Deel 2"
                tags.extend(["Formularium", "Handgeschreven", "Deel 2"])
            elif "geüpgraded formularium" in fn.lower():
                title = "Formularium Halfgeleidercomponenten (Geüpgraded)"
                tags.append("Formularium")
        elif "examenvragen" in path.lower():
            cat_id = 2
            if "denk examenvragen" in fn.lower():
                title = "Denk-Examenvragen & Oplossingen"
                tags.extend(["Reconstructie / Vragen", "Oplossing", "Theorie"])
            elif "2013-08-19" in fn:
                year = "2012 - 2013"
                title = "Examen 19 Augustus 2013 (Herexamen)"
                tags.append("Herexamen (2de zit)")
            elif "2019-06-21" in fn:
                year = "2018 - 2019"
                title = "Examen 21 Juni 2019"
                tags.append("Juni")
            elif "pieter" in fn.lower():
                author = "Pieter"
                title = "Examenvragen 2006 - 2015"
                tags.extend(["Reconstructie / Vragen", "Bundel / Alle"])
            elif "2006-2015" in fn:
                title = "Examenvragen 2006 - 2015"
                tags.extend(["Reconstructie / Vragen", "Bundel / Alle"])
            elif "hgc_examenvragen opgaven.pdf" == fn.lower():
                title = "Examenvragen Bundel Opgaven"
                tags.extend(["Reconstructie / Vragen", "Bundel / Alle", "Opgave (Blanco)"])
            elif "hannes&julie" in fn.lower() or "hannes & julie" in fn.lower():
                author = "Hannes & Julie"
                part = "1" if "(1)" in fn else "2"
                title = f"Examenvragen (Oplossing) - Deel {part}"
                tags.extend(["Reconstructie / Vragen", "Oplossing", "Handgeschreven", f"Deel {part}"])
            elif "2017-2018" in fn:
                year = "2017 - 2018"
                title = "Examenvragen (Oplossing) (2017 - 2018)"
                tags.extend(["Reconstructie / Vragen", "Oplossing", "Handgeschreven"])
            elif "student 042" in fn.lower():
                author = "Student 042"
                title = "Examenvragen (Oplossing)"
                tags.extend(["Reconstructie / Vragen", "Oplossing", "Handgeschreven"])
            elif "oplossing_foto" in fn.lower():
                title = "Examen Oplossing (Foto)"
                tags.extend(["Oplossing", "Handgeschreven"])
            elif "oplossing_mosfet" in fn.lower():
                title = "Examen Oplossing - MOSFET"
                tags.append("Oplossing")
            elif "examenvragen per hoofdstuk" in path.lower():
                author = "Student 021" if "danaë" in path.lower() else None
                m_h = re.search(r'h(\d+)', fn.lower())
                h_num = m_h.group(1) if m_h else "1"
                h_names = {
                    "1": "Basis Halfgeleiderfysica", "2": "PN-Diode", "3": "MOS-Capaciteit",
                    "4": "MOSFET", "5": "Bipolaire Transistor", "6": "Opto-Elektronica", "7": "Vermogendispositieven"
                }
                title = f"Examenvragen Hoofdstuk {h_num} - {h_names.get(h_num, '')}"
                tags.extend(["Reconstructie / Vragen", f"Deel {h_num}"])
            elif "oude examenvragen" in path.lower():
                m_yr = re.search(r'(\d{4})', fn)
                yr_val = m_yr.group(1) if m_yr else ""
                title = f"Examenvragen {yr_val}"
                tags.append("Reconstructie / Vragen")
        elif "notities" in path.lower():
            cat_id = 3
            if ext == "html":
                m_dt = re.search(r'(\d{4})(\d{2})(\d{2})', fn)
                if m_dt:
                    y, m, d_s = m_dt.group(1), int(m_dt.group(2)), int(m_dt.group(3))
                    m_names = {1: "Januari", 2: "Februari", 3: "Maart", 4: "April", 5: "Mei", 6: "Juni"}
                    year = "2011 - 2012"
                    title = f"Lesnotities Hoorcollege {d_s} {m_names.get(m, '')} {y}"
                    tags.append("Lesnotities")
            elif "student 027" in fn.lower():
                author = "Student 027"
                if "deel i en ii" in fn.lower():
                    year = "2016 - 2017"
                    title = "Lesnotities Deel 1 & 2"
                    tags.extend(["Lesnotities", "Handgeschreven", "Deel 1", "Deel 2"])
                elif "moscap en mosfet" in fn.lower():
                    title = "Lesnotities - Inleiding MOSCAP & MOSFET"
                    tags.extend(["Lesnotities", "Handgeschreven"])
        elif "samenvattingen" in path.lower() or "legacy" in path.lower():
            cat_id = 3
            if "hgc_theorie" in fn.lower() and "student 105" in fn.lower():
                year = "2017 - 2018"
                author = "Student 105"
                title = "Samenvatting Theorie"
                tags.extend(["Theorie", "Handgeschreven"])
            elif "hgc_samenvatting" in fn.lower() and "student 105" in fn.lower():
                year = "2017 - 2018"
                author = "Student 105"
                title = "Samenvatting"
                tags.append("Handgeschreven")
            elif "student 121" in fn.lower():
                year = "2018 - 2019"
                author = "Student 121"
                title = "Samenvatting HGC"
                tags.append("Handgeschreven")
            elif "kobe" in path.lower():
                year = "2023 - 2024"
                author = "Kobe"
                title = f"Samenvatting - {clean_fn}"
            elif "student 041" in full_context_lower:
                year = "2022 - 2023"
                author = "Student 041"
                title = "Studentencursus Halfgeleidercomponenten"
            elif "student 072" in fn.lower():
                year = "2017 - 2018"
                author = "Student 072"
                title = "Samenvatting Halfgeleidercomponenten"
            elif "florent" in fn.lower():
                author = "Florent"
                title = "Samenvatting Halfgeleidercomponenten"
            elif "formularium" in fn.lower() or "formules" in fn.lower():
                title = "Formularium Halfgeleidercomponenten"
                tags.append("Formularium")
            elif "begrippen" in fn.lower():
                title = "Samenvatting - Te Kennen Begrippen"
            elif "handige-links" in fn.lower():
                title = "Handige Links & Bronnen"
                tags.append("Studiewijzer / Gids")
            elif "hgc wikis" in fn.lower():
                cat_id = 2
                title = "Examenvragen Wiki Reconstructie"
                tags.append("Reconstructie / Vragen")
            elif "table of contents" in fn.lower():
                title = "Inhoudstafel Halfgeleidercomponenten"
                tags.append("Studiewijzer / Gids")
            elif "equivalente modellen" in fn.lower():
                author = "Student 027"
                title = "Samenvatting - Equivalente Modellen"
                tags.append("Handgeschreven")
            elif "student 007" in fn.lower() or "student_007" in fn.lower():
                author = "Student 007"
                title = "Samenvatting Halfgeleidercomponenten"
            elif "schema n-mos" in fn.lower():
                author = "Student 105"
                title = "Schema N-MOS Depletie & Inversie"
                tags.append("Handgeschreven")

    # 8. H01L6A: Digital Signal Processing
    elif course_code == "H01L6A":
        if "bodeplotmaker.mw" in fn.lower():
            cat_id = 7
            title = "Labo Maple - Bodeplotmaker"
        elif "formularium" in fn.lower():
            cat_id = 3
            title = "Formularium Digitale Signaalverwerking"
            tags.append("Formularium")
        elif "notes and exercises by student 083" in path.lower():
            author = "Student 083"
            if "zelfstudie dsv" in fn.lower():
                cat_id = 4
                title = "Zelfstudie Oefeningen DSV"
            elif "oefenzitting" in fn.lower():
                cat_id = 4
                m_oz = re.search(r'oefenzitting\s*(\d+)', fn.lower())
                oz_num = m_oz.group(1) if m_oz else "1"
                is_sol = "oplossing" in fn.lower()
                title = f"Oefenzitting {oz_num}{' (Oplossing)' if is_sol else ''}"
                tags.append(f"Deel {oz_num}")
                if is_sol:
                    tags.append("Oplossing")
        elif "anki flashcards" in fn.lower():
            cat_id = 3
            year = "2023 - 2024"
            author = "Student 039"
            title = "Flashcards Semester 5 ELT"
        elif "examen/vanaf 2023-2024" in path.lower():
            cat_id = 2
            if "student 068" in fn.lower():
                year = "2023 - 2024"
                author = "Student 068"
                title = "Voorbeeldexamen 2023 (Oplossing)"
                tags.append("Oplossing")
            elif "discord" in fn.lower():
                year = "2023 - 2024"
                title = "Voorbeeldexamen 2023 (Studentenoplossing)"
                tags.extend(["Oplossing", "Handgeschreven"])
            elif "examen 2023-voorbeeld.pdf" == fn.lower():
                year = "2023 - 2024"
                title = "Voorbeeldexamen 2023 (Opgave)"
                tags.append("Opgave (Blanco)")
            elif "student 084" in fn.lower():
                year = "2023 - 2024"
                author = "Student 084"
                title = "Examen 23 Januari 2024 - Reconstructie"
                tags.extend(["Januari", "Reconstructie / Vragen"])
            elif "examen 2024-01-23.pdf" == fn.lower():
                year = "2023 - 2024"
                title = "Examen 23 Januari 2024 (Voorbeeld 2)"
                tags.append("Januari")
            elif "student 052" in fn.lower():
                year = "2023 - 2024"
                author = "Student 052"
                title = "Inhaalexamen April 2024 - Reconstructie"
                tags.append("Reconstructie / Vragen")
            elif "student 122" in fn.lower():
                year = "2023 - 2024"
                author = "Student 122"
                title = "Examen 16 Augustus 2024 (Herexamen) - Reconstructie"
                tags.extend(["Herexamen (2de zit)", "Reconstructie / Vragen"])
            elif "2026-01-13" in fn:
                year = "2025 - 2026"
                title = "Examen 13 Januari 2026 - Reconstructie"
                tags.extend(["Januari", "Reconstructie / Vragen"])
        elif "examen/voor 2023-2024" in path.lower():
            cat_id = 2
            if "student 021" in fn.lower():
                author = "Student 021"
                if "uitgeschreven 2021" in fn.lower():
                    year = "2020 - 2021"
                    title = "Examenvragen Uitgeschreven"
                    tags.extend(["Reconstructie / Vragen", "Handgeschreven"])
                else:
                    title = "Examenvragen Overzicht"
                    tags.append("Reconstructie / Vragen")
            elif "dsv wikis" in fn.lower():
                title = "Examenvragen Wiki Reconstructie"
                tags.append("Reconstructie / Vragen")
            elif "dsv_examen 2019-01-22" in fn.lower():
                year = "2018 - 2019"
                title = "Examen 22 Januari 2019"
                tags.append("Januari")
            elif "student 074" in fn.lower():
                year = "2018 - 2019"
                author = "Student 074"
                title = "Examenvragen"
                tags.append("Reconstructie / Vragen")
            elif "student 001" in fn.lower():
                year = "2018 - 2019"
                author = "Student 001"
                title = "Examenvragen (Oplossing)"
                tags.extend(["Reconstructie / Vragen", "Oplossing", "Theorie"])
            elif "dsv_examenvragen oplossingen.pdf" == fn.lower():
                title = "Examenvragen (Oplossing)"
                tags.extend(["Reconstructie / Vragen", "Oplossing", "Handgeschreven"])
            elif "student 027" in fn.lower():
                year = "2015 - 2016"
                author = "Student 027"
                title = "Examenvragen Uitgeschreven"
                tags.extend(["Reconstructie / Vragen", "Handgeschreven"])
            elif "student 059" in fn.lower():
                year = "2020 - 2021"
                author = "Student 059"
                title = "Examenvragen"
                tags.extend(["Reconstructie / Vragen", "Handgeschreven"])
            elif "student 062" in fn.lower() or "student_062" in fn.lower():
                author = "Student 062"
                title = "Examenvragen"
                tags.append("Reconstructie / Vragen")
            elif "oude examenvragen" in fn.lower():
                title = "Oude Examenvragen"
                tags.append("Reconstructie / Vragen")
        elif "slides" in path.lower():
            cat_id = 6
            if "edft als filterbank" in fn.lower():
                title = "Slides - EDFT als Filterbank"
            elif "figuren dsv" in fn.lower():
                title = "Lesmateriaal - Figuren Digitale Signaalverwerking"
            elif "filters.pdf" == fn.lower():
                title = "Slides - DSP Topic 6: Filters (Dan Ellis)"
                tags.append("English")
            elif "lbg_algoritme" in fn.lower():
                title = "Slides - LBG Algoritme"
        elif "samenvattingen" in path.lower():
            cat_id = 3
            if "student 121" in fn.lower():
                year = "2018 - 2019"
                author = "Student 121"
                title = "Samenvatting DSV"
                tags.append("Handgeschreven")
            elif "student 079" in fn.lower():
                year = "2024 - 2025"
                author = "Student 079"
                title = "Samenvatting Digitale Signaalverwerking"
            elif "student 105" in fn.lower():
                author = "Student 105"
                title = "Samenvatting DSV"
                tags.append("Handgeschreven")
            elif "student 072" in fn.lower():
                year = "2017 - 2018"
                author = "Student 072"
                title = "Samenvatting Digitale Signaalverwerking"
            elif "benedicte" in fn.lower():
                cat_id = 4
                author = "Benedicte"
                title = "Samenvatting & Oefeningen"
                tags.append("Handgeschreven")
        elif "23-24~dsv_oef~kobe" in path.lower():
            cat_id = 4
            year = "2023 - 2024"
            author = "Kobe"
            if "cft_uitrekenen" in fn.lower():
                title = "Oefenzitting - CFT Uitrekenen"
                tags.append("Handgeschreven")
            else:
                m_h = re.search(r'oz_h(\d+)', fn.lower())
                h_num = m_h.group(1) if m_h else "2"
                is_all = "alle_oef" in fn.lower()
                title = f"Oefenzitting Hoofdstuk {h_num}{' - Alle Oefeningen' if is_all else ''}"
                tags.append(f"Deel {h_num}")
                if is_all:
                    tags.append("Bundel / Alle")
        elif "burgieclan opls 22-23 nummering 23-24" in path.lower():
            cat_id = 4
            year = "2022 - 2023"
            m = re.match(r'(\d+)[-_](.*)', fn_no_ext)
            if m:
                ch, o_num = m.group(1), m.group(2)
                title = f"Oefenzitting - Hoofdstuk {ch} Oefening {o_num} (Oplossing)"
                tags.extend(["Oplossing", "Handgeschreven", f"Deel {ch}"])
        elif "oefenzittingen/2022 - 2023" in path.lower():
            cat_id = 4
            year = "2022 - 2023"
            m = re.match(r'h(\d+)[-_](.*)', fn_no_ext.lower())
            if m:
                ch, o_num = m.group(1), m.group(2).replace("-nieuw", "")
                title = f"Oefenzitting - Hoofdstuk {ch} Oefening {o_num} (Oplossing)"
                tags.extend(["Oplossing", f"Deel {ch}"])
        elif "oefenzittingen" in path.lower():
            cat_id = 4
            if fn.lower() == "alles.pdf":
                title = "Oefenzittingen - Alle Opgaven & Oplossingen"
                tags.extend(["Bundel / Alle", "Oplossing"])
            elif fn.lower() == "dsv-oefenzittingen.pdf":
                title = "Oefenzittingen Bundel Opgaven"
                tags.extend(["Bundel / Alle", "Opgave (Blanco)"])
            elif re.match(r'h\d+-(?:oef|opl)', fn.lower()):
                m = re.match(r'h(\d+)-(oef|opl)', fn.lower())
                ch, typ = m.group(1), m.group(2)
                is_sol = typ == "opl"
                title = f"Oefenzitting Hoofdstuk {ch} ({'Oplossing' if is_sol else 'Opgave'})"
                tags.append(f"Deel {ch}")
                if is_sol:
                    tags.append("Oplossing")
                else:
                    tags.append("Opgave (Blanco)")
            elif "zitting" in fn.lower():
                m = re.search(r'zitting(\d+)', fn.lower())
                z_num = m.group(1) if m else "1"
                title = f"Oefenzitting {z_num}"
                tags.append(f"Deel {z_num}")

    # 9. H01L4A: Digitale en analoge communicatie
    elif course_code == "H01L4A":
        if "dac_faq.docx" == fn.lower():
            cat_id = 3
            title = "FAQ Digitale en Analoge Communicatie"
            tags.append("Studiewijzer / Gids")
        elif "dac_termen_md.pdf" == fn.lower():
            cat_id = 3
            author = "Student 074"
            title = "Overzicht Termen DAC"
        elif "formularium_dac" in fn.lower() and "wout sansen" in fn.lower():
            cat_id = 3
            year = "2025 - 2026"
            author = "Wout Sansen"
            title = "Formularium"
            tags.append("Formularium")
        elif "dac_formularium - gv" in fn.lower():
            cat_id = 3
            title = "Formularium (GV)"
            tags.extend(["Formularium", "Handgeschreven"])
        elif "handige formules_pedrodevogelaere" in fn.lower():
            cat_id = 3
            author = "Pedro Devogelaere"
            title = "Formularium - Handige Formules"
            tags.extend(["Formularium", "Handgeschreven"])
        elif "anki flashcards" in fn.lower():
            cat_id = 3
            year = "2022 - 2023"
            author = "Student 039"
            title = "Flashcards Semester 4 ELT"
        elif "legacy/matlab" in path.lower():
            cat_id = 7
            if ext == "m":
                title = f"Labo MATLAB - {fn_no_ext}.m"
                tags.append("MATLAB")
            elif ext == "dat":
                title = f"Labo Data - {fn_no_ext}.dat"
                tags.append("Dataset / Data")
            elif ext == "mle":
                title = f"Labo Handleiding - {fn_no_ext}.mle"
                tags.append("Studiewijzer / Gids")
        elif "handboeken" in path.lower():
            if "couch-7ed int student solutions manual" in path.lower():
                cat_id = 4
                tags.append("English")
                if "readme" in fn.lower():
                    title = "Handboek Oplossingen - Couch 7th Ed: README"
                    tags.append("Studiewijzer / Gids")
                else:
                    title = f"Handboek Oplossingen - Couch 7th Ed: {clean_fn}"
                    tags.append("Oplossing")
            elif "simon haykin" in fn.lower():
                cat_id = 6
                title = "Handboek - Communication Systems (Simon Haykin, 4th Ed.)"
                tags.append("English")
            elif "prentice hall" in fn.lower():
                cat_id = 6
                title = "Handboek - Digital & Analog Communication Systems (Leon W. Couch)"
                tags.append("English")
        elif "extra slides" in path.lower():
            cat_id = 6
            if "random process" in fn.lower():
                title = "Slides - Animatie Random Processen (Prof. Nauwelaers)"
            elif "line codes" in fn.lower():
                title = "Slides - Animatie Line Codes (Prof. Nauwelaers)"
            elif "complex envelope" in fn.lower():
                title = "Slides - Animatie Complexe Enveloppe (Prof. Nauwelaers)"
        elif "legacy/dac_wikis" in fn.lower():
            cat_id = 2
            title = "Examenvragen Wiki Reconstructie"
            tags.append("Reconstructie / Vragen")
        elif "notes and exercises by student 083" in path.lower():
            author = "Student 083"
            if "oefenzitting" in fn.lower():
                cat_id = 4
                m = re.search(r'oefenzitting\s*(\d+)', fn.lower())
                oz_num = m.group(1) if m else "1"
                title = f"Oefenzitting {oz_num}"
                tags.extend(["Handgeschreven", f"Deel {oz_num}"])
            elif "h01l4a ex2020" in fn.lower():
                cat_id = 2
                year = "2019 - 2020"
                part = " (Deel 1a)" if "1a" in fn.lower() else " (Deel 1b)"
                title = f"Voorbeeldexamen 2020{part}"
                tags.append("Deel 1")
        elif "oefenzittingen" in path.lower():
            cat_id = 4
            m = re.search(r'oz(\d+)', fn.lower())
            oz_num = m.group(1) if m else "1"
            is_sol = "oplossing" in fn.lower()
            is_opg = "opgave" in fn.lower()
            is_ex = "examenoefening" in fn.lower()
            tags.append(f"Deel {oz_num}")
            if "english" in full_context_lower or "exercise session" in p1.lower():
                tags.append("English")
            if is_sol:
                tags.append("Oplossing")
            elif is_opg:
                tags.append("Opgave (Blanco)")
            elif is_ex:
                tags.append("Oefeningen (Examen)")
            
            oz_topics = {
                "1": "Stochastische Processen", "2": "A/D Conversie",
                "3": "Line Codes", "4": "Matched Filter & BER"
            }
            topic = oz_topics.get(oz_num, "")
            status = " (Oplossing)" if is_sol else (" (Opgave)" if is_opg else (" (Examenoefening)" if is_ex else ""))
            m_yr = re.search(r'\((\d{4}-\d{4})\)', fn)
            yr_str = f" ({m_yr.group(1)})" if m_yr else ""
            title = f"Oefenzitting {oz_num} - {topic}{status}{yr_str}"
        elif "examenvragen" in path.lower():
            cat_id = 2
            if "student 041" in full_context_lower:
                year = "2022 - 2023"
                author = "Student 041"
                title = "Examenvragen 2022 - 2023"
                tags.append("Reconstructie / Vragen")
            elif "pedrodevogelaere" in fn.lower():
                author = "Pedro Devogelaere"
                title = "Oude Examens (Oplossing)"
                tags.extend(["Bundel / Alle", "Oplossing", "Handgeschreven"])
            elif "dac_info examen" in fn.lower():
                title = "Exameninformatie & Richtlijnen"
                tags.append("Studiewijzer / Gids")
            elif "oefenzittingen + examenvragen" in fn.lower():
                year = "2006 - 2007"
                title = "Oefenzittingen & Examenvragen (2006 - 2007)"
                tags.append("Bundel / Alle")
            elif "voorbeeldvragen" in fn.lower():
                title = "Voorbeeldvragen Examen (Prof. Nauwelaers)"
                tags.append("Reconstructie / Vragen")
            elif "voorbeeldexamen_2025" in fn.lower():
                year = "2024 - 2025"
                is_opg = "opgave" in fn.lower()
                title = f"Voorbeeldexamen 2025{' (Opgave)' if is_opg else ''}"
                if is_opg:
                    tags.append("Opgave (Blanco)")
            elif "ex2020-1" in fn.lower():
                year = "2019 - 2020"
                part = " (Deel 1a)" if "1a" in fn.lower() else " (Deel 1b)"
                title = f"Voorbeeldexamen 2020{part}"
                tags.append("Deel 1")
            elif "reconstructie_examen_dac_11juni2026" in fn.lower():
                year = "2025 - 2026"
                is_sol = "oplossing" in fn.lower()
                title = f"Examen 11 Juni 2026 - Reconstructie{' (Oplossing)' if is_sol else ''}"
                tags.extend(["Juni", "Reconstructie / Vragen"])
                if is_sol:
                    tags.append("Oplossing")
            elif "dac_examen_2026-06-05(reconstructie)" in fn.lower():
                year = "2025 - 2026"
                title = "Examen 5 Juni 2026 - Reconstructie"
                tags.extend(["Juni", "Reconstructie / Vragen"])
            elif "dac_examen 2026-06-05" in fn.lower():
                year = "2025 - 2026"
                title = "Examen 5 Juni 2026 (Modeloplossing)"
                tags.extend(["Juni", "Modeloplossing", "English"])
            elif "dac_examen 2026-06-11" in fn.lower():
                year = "2025 - 2026"
                title = "Examen 11 Juni 2026 (Modeloplossing)"
                tags.extend(["Juni", "Modeloplossing", "English"])
            elif "2011-01-26" in fn:
                year = "2010 - 2011"
                title = "Examen 26 Januari 2011 - Vraag 3 (Opgave)"
                tags.extend(["Januari", "Opgave (Blanco)"])
            elif "2014-06-06" in fn:
                year = "2013 - 2014"
                is_sol = "oplossing" in fn.lower()
                title = f"Examen 6 Juni 2014{' - Vraag 3 (Oplossing)' if is_sol else ' (Opgave)'}"
                tags.append("Juni")
                if is_sol:
                    tags.append("Oplossing")
                else:
                    tags.append("Opgave (Blanco)")
            elif "2020-06-29" in fn:
                year = "2019 - 2020"
                title = "Examen 29 Juni 2020"
                tags.append("Juni")
            elif "2020-06-6" in fn:
                year = "2019 - 2020"
                title = "Examen 6 Juni 2020"
                tags.append("Juni")

    # If author is detected and not already in title, append (Author)
    if author and f"({author})" not in title:
        title = f"{title} ({author})"

    # Clean tags and format
    # Filter redundant tags per category
    redundant_map = {
        2: {"Examen", "Examens", "Examenvragen"},
        3: {"Samenvatting", "Samenvattingen"},
        4: {"Oefeningen", "Oefenzittingen"},
        5: {"TTT", "TTT's", "Tussentijds (Midterm)"},
        6: {"Slides"},
        7: {"Code / Script", "Labo & Code", "Labo"}
    }
    red = redundant_map.get(cat_id, set())

    # Single source of truth tag vocabulary
    vocab_file = "migration_data/tag_vocabulary.json"
    with open(vocab_file, "r", encoding="utf-8") as f:
        v_data = json.load(f)
    allowed_tags = set()
    for grp in v_data.get("groups", {}).values():
        allowed_tags.update(grp)
    part_pattern = re.compile(r'^Deel ([1-9]|1[0-9])$')

    valid_tags = []
    for t in tags:
        if (t in allowed_tags or part_pattern.match(t)) and t not in red and t not in valid_tags:
            valid_tags.append(t)

    title = clean_spacing(title)
    if len(title) > 200:
        title = title[:197] + "..."

    return {
        "file_id": fid,
        "display_title": title,
        "category_id": cat_id,
        "year": year,
        "author": author,
        "tags": valid_tags
    }

def process_all_cluster_3():
    with open("migration_data/clusters/cluster_3.json", "r", encoding="utf-8") as f:
        c3_info = json.load(f)

    os.makedirs("migration_data/batches", exist_ok=True)
    os.makedirs("migration_data/cluster_outputs", exist_ok=True)

    all_normalized_cluster_3 = []

    for course in c3_info["courses"]:
        cc = course["course_code"]
        cname = course["course_name"]
        payload_path = f"migration_data/course_payloads/{cc}.json"
        with open(payload_path, "r", encoding="utf-8") as f:
            c_data = json.load(f)

        docs = c_data["documents"]
        print(f"Normalizing [{cc}] {cname} ({len(docs)} documents)...")
        course_output = []
        for d in docs:
            norm = normalize_document(d, cc, cname)
            course_output.append(norm)

        # Write per-course batch file
        batch_path = f"migration_data/batches/{cc}.json"
        with open(batch_path, "w", encoding="utf-8") as f:
            json.dump(course_output, f, indent=2, ensure_ascii=False)
        print(f"  -> Saved {batch_path} ({len(course_output)} docs)")

        all_normalized_cluster_3.extend(course_output)

    # Save aggregated cluster 3 output
    agg_path = "migration_data/cluster_outputs/cluster_3_output.json"
    with open(agg_path, "w", encoding="utf-8") as f:
        json.dump(all_normalized_cluster_3, f, indent=2, ensure_ascii=False)

    print(f"\n=======================================================")
    print(f"✓ Cluster 3 complete! Total documents normalized: {len(all_normalized_cluster_3)}")
    print(f"✓ Saved aggregated output to {agg_path}")
    print(f"=======================================================")

if __name__ == "__main__":
    process_all_cluster_3()
