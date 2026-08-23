#!/usr/bin/env python3
"""
generate_canary_h01a0b.py
Expert AI Normalization generator for H01A0B (Analyse, deel 1).
"""

import json
import os
import re

def main():
    with open("migration_data/course_payloads/H01A0B.json", "r", encoding="utf-8") as f:
        payload = json.load(f)

    docs = payload["documents"]
    print(f"Loaded {len(docs)} documents for H01A0B.")

    output = []
    
    for i, d in enumerate(docs):
        fid = d["file_id"]
        path = d.get("path", "")
        fn = d.get("filename", "")
        ext = d.get("extension", "").lower()
        prev = d.get("content_preview") or {}
        p1 = prev.get("page1_text") or ""
        fb = prev.get("fallback_text") or ""
        sc = prev.get("is_scanned_handwritten", False)
        
        display_title = ""
        category_id = 3
        year = None
        author = None
        tags = []

        # -------------------------------------------------------------
        # Category & Title & Year & Author logic
        # -------------------------------------------------------------
        
        # 1. Guides & General
        if fn == "Studiewijzer Analyse I 2020-2021.pdf":
            display_title = "Studiewijzer Analyse 1 (2020 - 2021)"
            category_id = 3
            year = "2020 - 2021"
            tags = ["Studiewijzer / Gids"]
            
        elif fn == "Gids voor eerstejaars - 2020-2021 (Student 040).pdf":
            display_title = "Gids voor Eerstejaars (Student 040)"
            category_id = 3
            year = "2020 - 2021"
            author = "Student 040"
            tags = ["Studiewijzer / Gids"]
            
        elif fn == "Programmahervorming_B1_(vanaf_2018-2019).pdf":
            display_title = "Overzicht Programmahervorming B1 (2018 - 2019)"
            category_id = 3
            year = "2018 - 2019"
            tags = ["Studiewijzer / Gids"]
            
        elif fn == "Anki Flashcards Semester 1 (Student 039 2021-2022).apkg":
            display_title = "Anki Flashcards Semester 1 (Student 039)"
            category_id = 3
            year = "2021 - 2022"
            author = "Student 039"
            tags = ["Studiewijzer / Gids"]

        # 2. Samenvattingen
        elif fn == "Handleiding oefeningen 2016-2017 (Student 121).pdf":
            display_title = "Handleiding Oefeningen (Student 121)"
            category_id = 3
            year = "2016 - 2017"
            author = "Student 121"
            tags = ["Handgeschreven", "Scan"]
            
        elif fn == "Nuttige Taylorveeltermen (Student 094).pdf":
            display_title = "Formularium Nuttige Taylorveeltermen (Student 094)"
            category_id = 3
            author = "Student 094"
            tags = ["Formularium"]
            
        elif fn == "Samenvatting & Formules 2016-2017 (Student 009).pdf":
            display_title = "Samenvatting & Formules (Student 009)"
            category_id = 3
            year = "2016 - 2017"
            author = "Student 009"
            tags = ["Formularium", "Handgeschreven", "Scan"]
            
        elif fn == "Samenvatting 2009-2010 (Student 061).pdf":
            display_title = "Samenvatting Analyse 1 (Student 061)"
            category_id = 3
            year = "2009 - 2010"
            author = "Student 061"
            tags = ["Handgeschreven", "Scan"]
            
        elif fn == "Samenvatting 2024-2025 (Student 034).pdf":
            display_title = "Samenvatting Analyse 1 (Student 034)"
            category_id = 3
            year = "2024 - 2025"
            author = "Student 034"
            tags = ["Handgeschreven", "Scan"]
            
        elif fn == "samenvatting_analyse1 (Student065).pdf":
            display_title = "Samenvatting Analyse 1 (Student 065)"
            category_id = 3
            author = "Student 065"
            tags = ["Handgeschreven", "Scan"]
            
        elif fn == "Samenvatting_H6.pdf":
            display_title = "Samenvatting Hoofdstuk 6"
            category_id = 3
            tags = ["Deel 6"]
            
        elif fn == "Schema's 2024-2025 (Student 034).pdf":
            display_title = "Schema's Analyse 1 (Student 034)"
            category_id = 3
            year = "2024 - 2025"
            author = "Student 034"
            tags = ["Formularium", "Handgeschreven", "Scan"]
            
        elif "Samenvatting 2016-2017 (Student 105)" in path:
            display_title = "Samenvatting Analyse 1 (Student 105)"
            category_id = 3
            year = "2016 - 2017"
            author = "Student 105"
            tags = ["Scan", "Handgeschreven"]
            
        elif fn == "Samenvatting_analyse.pdf":
            display_title = "Samenvatting Wiskundige Analyse"
            category_id = 3
            tags = ["Theorie"]

        # 3. Transparanten / Slides (Category 6)
        elif fn == "limiet.pdf" and "Transparanten" in path:
            display_title = "Transparant Limiet en Taylorveelterm"
            category_id = 6
            tags = ["Theorie"]
            
        elif "Karl Deckers' Transparanten" in path:
            category_id = 6
            tags = ["Theorie"]
            if fn == "oefz1.pdf":
                display_title = "Transparanten Oefenzitting 1 - Functies (Karl Deckers)"
            elif fn == "oefz2.pdf":
                display_title = "Transparanten Oefenzitting 2 - Krommen en Oppervlakken (Karl Deckers)"
            elif fn == "oefz3.pdf":
                display_title = "Transparanten Oefenzitting 3 - Definities en Rijen (Karl Deckers)"
            elif fn == "oefz4.pdf":
                display_title = "Transparanten Oefenzitting 4 - Afgeleiden (Karl Deckers)"
            elif fn == "oefz5.pdf":
                display_title = "Transparanten Oefenzitting 5 - Richtingsafgeleide (Karl Deckers)"
            elif fn == "oefz6.pdf":
                display_title = "Transparanten Oefenzitting 6 - Integratiemethodes (Karl Deckers)"
            elif fn == "oefz7.pdf":
                display_title = "Transparanten Oefenzitting 7 - Dubbele Integralen (Karl Deckers)"
            elif fn == "oefz8&9.pdf":
                display_title = "Transparanten Oefenzitting 8 & 9 - Differentiaalvergelijkingen (Karl Deckers)"

        # 4. TTT's (Category 5)
        elif re.match(r"^TTT 2006 Opgaven\.pdf$", fn):
            display_title = "TTT Oktober 2006 (Opgave)"
            category_id = 5
            year = "2006 - 2007"
            tags = ["Opgave (Blanco)"]
        elif re.match(r"^TTT 2006 Oplossing\.pdf$", fn):
            display_title = "TTT Oktober 2006 (Modeloplossing)"
            category_id = 5
            year = "2006 - 2007"
            tags = ["Modeloplossing"]
        elif re.match(r"^TTT 2007 Opgaven\.pdf$", fn):
            display_title = "TTT Oktober 2007 (Opgave)"
            category_id = 5
            year = "2007 - 2008"
            tags = ["Opgave (Blanco)"]
        elif re.match(r"^TTT 2007 Oplossing\.pdf$", fn):
            display_title = "TTT Oktober 2007 (Modeloplossing)"
            category_id = 5
            year = "2007 - 2008"
            tags = ["Modeloplossing"]
        elif re.match(r"^TTT 2008 Opgaven\.pdf$", fn):
            display_title = "TTT Oktober 2008 (Opgave)"
            category_id = 5
            year = "2008 - 2009"
            tags = ["Opgave (Blanco)"]
        elif re.match(r"^TTT 2008 Oplossing\.pdf$", fn):
            display_title = "TTT Oktober 2008 (Modeloplossing)"
            category_id = 5
            year = "2008 - 2009"
            tags = ["Modeloplossing"]
        elif re.match(r"^TTT 2009 Opgaven\.pdf$", fn):
            display_title = "TTT Oktober 2009 (Opgave)"
            category_id = 5
            year = "2009 - 2010"
            tags = ["Opgave (Blanco)"]
        elif re.match(r"^TTT 2009 Oplossing\.pdf$", fn):
            display_title = "TTT Oktober 2009 (Modeloplossing)"
            category_id = 5
            year = "2009 - 2010"
            tags = ["Modeloplossing"]
        elif re.match(r"^TTT 2010 Opgaven\.pdf$", fn):
            display_title = "TTT November 2010 (Opgave)"
            category_id = 5
            year = "2010 - 2011"
            tags = ["Opgave (Blanco)"]
        elif re.match(r"^TTT 2010 Oplossing\.pdf$", fn):
            display_title = "TTT November 2010 (Modeloplossing)"
            category_id = 5
            year = "2010 - 2011"
            tags = ["Modeloplossing"]
        elif re.match(r"^TTT 2011 Opgaven\.pdf$", fn):
            display_title = "TTT November 2011 (Opgave)"
            category_id = 5
            year = "2011 - 2012"
            tags = ["Opgave (Blanco)"]
        elif re.match(r"^TTT 2011 Oplossing\.pdf$", fn):
            display_title = "TTT November 2011 (Modeloplossing)"
            category_id = 5
            year = "2011 - 2012"
            tags = ["Modeloplossing"]
        elif fn == "TTT 2018 Opgave.pdf":
            display_title = "TTT 29 Oktober 2018 (Opgave)"
            category_id = 5
            year = "2018 - 2019"
            tags = ["Opgave (Blanco)"]
        elif fn == "TTT 2018 Oplossing.pdf":
            display_title = "TTT 9 November 2018 (Modeloplossing)"
            category_id = 5
            year = "2018 - 2019"
            tags = ["Modeloplossing"]
        elif fn == "TTT 2019 Opgave.pdf":
            display_title = "TTT 8 November 2019 (Opgave)"
            category_id = 5
            year = "2019 - 2020"
            tags = ["Opgave (Blanco)"]
        elif fn == "TTT 2019 Oplossing.pdf":
            display_title = "TTT 8 November 2019 (Modeloplossing)"
            category_id = 5
            year = "2019 - 2020"
            tags = ["Modeloplossing"]
        elif fn == "TTT 2020 Opgave.pdf":
            display_title = "TTT 6 November 2020 (Opgave)"
            category_id = 5
            year = "2020 - 2021"
            tags = ["Opgave (Blanco)"]
        elif fn == "TTT 2020 Oplossing met uitgebreide feedback.pdf":
            display_title = "TTT 6 November 2020 (Oplossing met Uitgebreide Feedback)"
            category_id = 5
            year = "2020 - 2021"
            tags = ["Oplossing"]
        elif fn == "TTT 2020 Oplossing.pdf":
            display_title = "TTT 6 November 2020 (Modeloplossing)"
            category_id = 5
            year = "2020 - 2021"
            tags = ["Modeloplossing"]
        elif fn == "TTT 2021 Opgaven.pdf":
            display_title = "TTT 5 November 2021 (Opgave)"
            category_id = 5
            year = "2021 - 2022"
            tags = ["Opgave (Blanco)"]
        elif fn == "TTT 2021 oplossingen.pdf":
            display_title = "TTT 5 November 2021 (Modeloplossing)"
            category_id = 5
            year = "2021 - 2022"
            tags = ["Modeloplossing"]
        elif "Oplossingen Partieel Examen 2012" in path:
            category_id = 5
            year = "2011 - 2012"
            display_title = "Oplossingen Partieel Examen 2012"
            tags = ["Scan", "Oplossing"]
        elif fn == "oplossingen partieel examen 2011.pdf":
            display_title = "Partieel Examen 2011 (Oplossing)"
            category_id = 5
            year = "2010 - 2011"
            tags = ["Oplossing", "Scan"]
        elif fn == "verbeterde oplossingen partieel examen 2011.pdf":
            display_title = "Partieel Examen 2011 - Verbeterde Versie (Oplossing)"
            category_id = 5
            year = "2010 - 2011"
            tags = ["Oplossing", "Scan"]

        # 5. Examens (Category 2)
        elif fn == "Examen 2019-01-28 Blanco.pdf":
            display_title = "Examen 28 Januari 2019 (Opgave)"
            category_id = 2
            year = "2018 - 2019"
            tags = ["Januari", "Opgave (Blanco)"]
        elif fn == "Examen 2019-01-28 Oplossing.pdf":
            display_title = "Examen 28 Januari 2019 (Modeloplossing)"
            category_id = 2
            year = "2018 - 2019"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen 2020-01-27 Blanco.pdf":
            display_title = "Examen 27 Januari 2020 (Opgave)"
            category_id = 2
            year = "2019 - 2020"
            tags = ["Januari", "Opgave (Blanco)"]
        elif fn == "Examen 2020-01-27 Oplossing.pdf":
            display_title = "Examen 27 Januari 2020 (Modeloplossing)"
            category_id = 2
            year = "2019 - 2020"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen 2020-08-17 Oplossing.pdf":
            display_title = "Examen 17 Augustus 2020 (Herexamen) (Modeloplossing)"
            category_id = 2
            year = "2019 - 2020"
            tags = ["Herexamen (2de zit)", "Modeloplossing"]
        elif fn == "Examen_2020-08-17_Blanco.pdf":
            display_title = "Examen 17 Augustus 2020 (Herexamen) (Opgave)"
            category_id = 2
            year = "2019 - 2020"
            tags = ["Herexamen (2de zit)", "Opgave (Blanco)"]
        elif fn == "Examen_2020-08-17_Theorie_Blanco.pdf":
            display_title = "Examen 17 Augustus 2020 - Theorie (Herexamen) (Opgave)"
            category_id = 2
            year = "2019 - 2020"
            tags = ["Herexamen (2de zit)", "Theorie", "Opgave (Blanco)"]
        elif fn == "Examen 2021-01-24 Blanco.pdf":
            display_title = "Examen 24 Januari 2021 (Opgave)"
            category_id = 2
            year = "2020 - 2021"
            tags = ["Januari", "Opgave (Blanco)"]
        elif fn == "Examen 2021-01-24 Oplossing.pdf":
            display_title = "Examen 24 Januari 2021 (Modeloplossing)"
            category_id = 2
            year = "2020 - 2021"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen 2022-01-26 Oplossing.pdf":
            display_title = "Examen 26 Januari 2022 (Modeloplossing)"
            category_id = 2
            year = "2021 - 2022"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen_2022-01-26_Blanco.pdf":
            display_title = "Examen 26 Januari 2022 (Opgave)"
            category_id = 2
            year = "2021 - 2022"
            tags = ["Januari", "Opgave (Blanco)", "Scan"]
        elif fn == "Examen_2022-01-26_theorie_blanco.pdf":
            display_title = "Examen 26 Januari 2022 - Theorie (Opgave)"
            category_id = 2
            year = "2021 - 2022"
            tags = ["Januari", "Theorie", "Opgave (Blanco)"]
        elif fn == "Examen 2022-09-02 Oplossing.pdf":
            display_title = "Examen 2 September 2022 (Herexamen) (Modeloplossing)"
            category_id = 2
            year = "2021 - 2022"
            tags = ["Herexamen (2de zit)", "Modeloplossing"]
        elif fn == "Examen_2022-09-02_Blanco.pdf":
            display_title = "Examen 2 September 2022 (Herexamen) (Opgave)"
            category_id = 2
            year = "2021 - 2022"
            tags = ["Herexamen (2de zit)", "Opgave (Blanco)", "Scan"]
        elif fn == "Examen_2022-09-02_theorie_blanco.pdf":
            display_title = "Examen 2 September 2022 - Theorie (Herexamen) (Opgave)"
            category_id = 2
            year = "2021 - 2022"
            tags = ["Herexamen (2de zit)", "Theorie", "Opgave (Blanco)"]
        elif fn == "Examen 2023-08-17 Oplossing.pdf":
            # Page 1 text: "1 september 2023, Modeloplossing"
            display_title = "Examen 1 September 2023 (Herexamen) (Modeloplossing)"
            category_id = 2
            year = "2022 - 2023"
            tags = ["Herexamen (2de zit)", "Modeloplossing"]
        elif fn == "Examen_2023-01-25_Blanco.pdf":
            display_title = "Examen 25 Januari 2023 (Opgave)"
            category_id = 2
            year = "2022 - 2023"
            tags = ["Januari", "Opgave (Blanco)", "Scan"]
        elif fn == "Examen_2023-01-25_Oplossing.pdf":
            display_title = "Examen 25 Januari 2023 (Modeloplossing)"
            category_id = 2
            year = "2022 - 2023"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen_2024-01-29_Blanco.pdf":
            display_title = "Examen 29 Januari 2024 (Opgave)"
            category_id = 2
            year = "2023 - 2024"
            tags = ["Januari", "Opgave (Blanco)"]
        elif fn == "Examen_2025-01-22_Blanco.pdf":
            display_title = "Examen 22 Januari 2025 (Opgave)"
            category_id = 2
            year = "2024 - 2025"
            tags = ["Januari", "Opgave (Blanco)"]
        elif fn == "LegeExamenOpgavesAnalyse_v2.pdf":
            display_title = "Bundel Lege Examenopgaves Analyse (v2)"
            category_id = 2
            tags = ["Bundel / Alle", "Opgave (Blanco)", "Scan"]
        elif fn == "LegeExamenOpgavesAnayse.pdf":
            display_title = "Bundel Lege Examenopgaves Analyse"
            category_id = 2
            tags = ["Bundel / Alle", "Opgave (Blanco)", "Scan"]
            
        elif fn == "Examen 2007-01 Oplossing.pdf":
            display_title = "Examen Januari 2007 (Modeloplossing)"
            category_id = 2
            year = "2006 - 2007"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen 2008-01 Oplossing.pdf":
            display_title = "Examen Januari 2008 (Modeloplossing)"
            category_id = 2
            year = "2007 - 2008"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen 2009-01 Oplossing.pdf":
            display_title = "Examen Januari 2009 (Modeloplossing)"
            category_id = 2
            year = "2008 - 2009"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen 2010-01 Oplossing.pdf":
            display_title = "Examen Januari 2010 (Modeloplossing)"
            category_id = 2
            year = "2009 - 2010"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen 2011-01 Oplossing.pdf":
            display_title = "Examen Januari 2011 (Modeloplossing)"
            category_id = 2
            year = "2010 - 2011"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen 2012-01 Oplossing.pdf":
            display_title = "Examen Januari 2012 (Modeloplossing)"
            category_id = 2
            year = "2011 - 2012"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen 2013-01 Oplossing.pdf":
            display_title = "Examen Januari 2013 (Modeloplossing)"
            category_id = 2
            year = "2012 - 2013"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen 2014-01-21 Oplossing.pdf":
            display_title = "Examen 21 Januari 2014 (Modeloplossing)"
            category_id = 2
            year = "2013 - 2014"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen 2015-01-12 Oplossing.pdf":
            display_title = "Examen 12 Januari 2015 (Modeloplossing)"
            category_id = 2
            year = "2014 - 2015"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen 2015-01-20 Oplossing.pdf":
            display_title = "Examen 20 Januari 2015 (Modeloplossing)"
            category_id = 2
            year = "2014 - 2015"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen 2016-01-23 Oplossing.pdf":
            display_title = "Examen 23 Januari 2016 (Modeloplossing)"
            category_id = 2
            year = "2015 - 2016"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen 2017-01-16 Oplossing.pdf":
            display_title = "Examen 16 Januari 2017 (Modeloplossing)"
            category_id = 2
            year = "2016 - 2017"
            tags = ["Januari", "Modeloplossing"]
        elif fn == "Examen 2018-01-23 Oplossing.pdf":
            display_title = "Examen 23 Januari 2018 (Modeloplossing)"
            category_id = 2
            year = "2017 - 2018"
            tags = ["Januari", "Modeloplossing"]
            
        elif fn == "Examens B1RA sem1.pdf":
            display_title = "Examenvragen B1RA Semester 1 (2012 - 2013)"
            category_id = 2
            year = "2012 - 2013"
            tags = ["Reconstructie / Vragen", "Deel 1"]
        elif fn == "Analyse_examen_oef.pdf":
            display_title = "Examenoefeningen Analyse"
            category_id = 2
            tags = ["Oefeningen (Examen)", "Scan"]
        elif fn == "examenvragen analyse.doc":
            display_title = "Examenvragen Analyse"
            category_id = 2
            tags = ["Reconstructie / Vragen"]
        elif fn == "voorbeeldexamenvragen_aangevuld.doc":
            display_title = "Voorbeeldexamenvragen Aangevuld"
            category_id = 2
            tags = ["Reconstructie / Vragen"]
        elif fn == "mogelijke examenvragen(2).pdf":
            display_title = "Mogelijke Examenvragen Analyse 1"
            category_id = 2
            tags = ["Reconstructie / Vragen", "Scan"]
        elif fn == "Theorievragen Analyse 1.docx":
            display_title = "Theorievragen Analyse 1"
            category_id = 2
            tags = ["Reconstructie / Vragen", "Theorie"]
        elif "Opls. Examens 2012" in path:
            category_id = 2
            year = "2011 - 2012"
            display_title = "Opls Examens 2012"
            tags = ["Scan", "Oplossing"]

        # 6. Maple Worksheets (Labo & Code - Category 7)
        elif ext == "mw":
            category_id = 7
            year = "2011 - 2012"
            # Parse exercise number
            # e.g. 1.10.mw -> Oefening 1.10
            # 1.21.d.mw -> Oefening 1.21(d)
            # 5.53.o.mw -> Oefening 5.53(o)
            m_oz = re.search(r'Oefenzitting\s*(\d+)', path)
            oz_num = m_oz.group(1) if m_oz else ""
            
            clean_name = fn.replace(".mw", "")
            # Format parts like 1.21.d -> 1.21(d)
            subparts = clean_name.split(".")
            if len(subparts) == 3 and len(subparts[2]) == 1:
                oef_str = f"Oefening {subparts[0]}.{subparts[1]}({subparts[2]})"
            else:
                oef_str = f"Oefening {clean_name}"
                
            if oz_num:
                display_title = f"Oefenzitting {oz_num} - {oef_str} (Maple)"
            else:
                display_title = f"{oef_str} (Maple)"
            tags = ["Oplossing"]

        # 7. Oefenzittingen (Category 4)
        elif fn == "Examenoefeningen in de oefbundel.docx":
            display_title = "Examenoefeningen in de Oefeningenbundel"
            category_id = 4
            tags = ["Oefeningen (Examen)"]
        elif fn == "oefeningen_analyse1 (Student065).pdf":
            display_title = "Oefeningen Analyse 1 (Student 065)"
            category_id = 4
            author = "Student 065"
            tags = ["Handgeschreven", "Scan", "Oplossing"]
        elif fn == "Extra oef analyse 1 Student 134.zip":
            display_title = "Extra Oefeningen Analyse 1 (Student 134)"
            category_id = 4
            author = "Student 134"
            tags = []
        elif fn == "Oefenzittingen 2009-2010 (Laurens de Poorter).pdf":
            display_title = "Oefenzittingen Analyse 1 (Student 061)"
            category_id = 4
            year = "2009 - 2010"
            author = "Student 061"
            tags = ["Handgeschreven", "Scan", "Oplossing"]
        elif fn == "Oefenzitting 8 & 9 - Oplossingen.pdf":
            display_title = "Oefenzitting 8 & 9 - Differentiaalvergelijkingen (Modeloplossing)"
            category_id = 4
            year = "2011 - 2012"
            tags = ["Modeloplossing"]
            
        elif "2020-2021" in path and "Oplossingen - Oefenzitting" in fn:
            category_id = 4
            year = "2020 - 2021"
            if fn == "Oplossingen - Oefenzitting 1.pdf":
                display_title = "Oefenzitting 1 - Inleidende Begrippen (Modeloplossing)"
            elif fn == "Oplossingen - Oefenzitting 2.pdf":
                display_title = "Oefenzitting 2 - Analytische Meetkunde (Modeloplossing)"
            elif fn == "Oplossingen - Oefenzitting 3.pdf":
                display_title = "Oefenzitting 3 - Rijen, Limieten en Continuïteit (Modeloplossing)"
            elif fn == "Oplossingen - Oefenzitting 4.pdf":
                display_title = "Oefenzitting 4 - Differentieerbaarheid in 1 Veranderlijke (Modeloplossing)"
            elif fn == "Oplossingen - Oefenzitting 5.pdf":
                display_title = "Oefenzitting 5 - Differentieerbaarheid in Meerdere Veranderlijken (Modeloplossing)"
            elif fn == "Oplossingen - Oefenzitting 6.pdf":
                display_title = "Oefenzitting 6 - Enkelvoudige Integratie (Modeloplossing)"
            elif fn == "Oplossingen - Oefenzitting 7.pdf":
                display_title = "Oefenzitting 7 - Meervoudige Integratie (Modeloplossing)"
            elif fn == "Oplossingen - Oefenzitting 8.pdf":
                display_title = "Oefenzitting 8 - Meervoudige Integratie en Transformatie (Modeloplossing)"
            elif fn == "Oplossingen - Oefenzitting 9.pdf":
                display_title = "Oefenzitting 9 - Oneigenlijke Integralen (Modeloplossing)"
            tags = ["Modeloplossing", "MATLAB"]
            
        elif fn == "Oefenzitting 1 - Oplossingen.pdf":
            display_title = "Oefenzitting 1 - Getallen, Functies en Rijen (Modeloplossing)"
            category_id = 4
            year = "2011 - 2012"
            tags = ["Modeloplossing"]
        elif fn == "Oefenzitting 3 - Oplossingen.pdf":
            display_title = "Oefenzitting 3 - Limieten en Continuïteit (Modeloplossing)"
            category_id = 4
            year = "2011 - 2012"
            tags = ["Modeloplossing"]
        elif fn == "Oefenzitting 4 - Oplossingen.pdf":
            display_title = "Oefenzitting 4 - Afgeleiden van Functies in 1 Veranderlijke (Modeloplossing)"
            category_id = 4
            year = "2011 - 2012"
            tags = ["Modeloplossing"]
        elif fn == "Oefenzitting 5 - Oplossingen.pdf":
            display_title = "Oefenzitting 5 - Afgeleiden van Functies in Meerdere Veranderlijken (Modeloplossing)"
            category_id = 4
            year = "2011 - 2012"
            tags = ["Modeloplossing"]
        elif fn == "Oefenzitting 6 - Oplossingen.pdf":
            display_title = "Oefenzitting 6 - Integratiemethodes (Modeloplossing)"
            category_id = 4
            year = "2011 - 2012"
            tags = ["Modeloplossing"]
        elif fn == "Oefenzitting 7 - Oplossingen.pdf":
            display_title = "Oefenzitting 7 - Herhaalde Enkelvoudige Integratie (Modeloplossing)"
            category_id = 4
            year = "2011 - 2012"
            tags = ["Modeloplossing"]
        elif fn == "oefening_553o_568b.pdf":
            display_title = "Oefenzitting 7 - Oefening 5.53(o) en 5.68(b) (Oplossing)"
            category_id = 4
            year = "2011 - 2012"
            tags = ["Oplossing", "Scan", "Handgeschreven"]
        elif fn == "Analyseoef4.JPG":
            display_title = "Oefenzitting 4 - Extra Oefeningen"
            category_id = 4
            tags = ["Scan"]
            
        # Adams Calculus Solutions Manual
        elif "Oplossingen boek" in path:
            category_id = 4
            tags = ["Oplossing", "English"]
            chapter_names = {
                "00.pdf": "Hoofdstuk P (Preliminaries)",
                "01.pdf": "Hoofdstuk 1 (Limits and Continuity)",
                "02.pdf": "Hoofdstuk 2 (Differentiation)",
                "03.pdf": "Hoofdstuk 3 (Transcendental Functions)",
                "04.pdf": "Hoofdstuk 4 (Applications of Derivatives)",
                "05.pdf": "Hoofdstuk 5 (Integration)",
                "06.pdf": "Hoofdstuk 6 (Techniques of Integration)",
                "07.pdf": "Hoofdstuk 7 (Applications of Integration)",
                "08.pdf": "Hoofdstuk 8 (Conics, Parametric and Polar Curves)",
                "09.pdf": "Hoofdstuk 9 (Sequences, Series, and Power Series)",
                "10.pdf": "Hoofdstuk 10 (Vectors and Coordinate Geometry in 3-Space)",
                "11.pdf": "Hoofdstuk 11 (Vector Functions and Curves)",
                "12.pdf": "Hoofdstuk 12 (Partial Differentiation)",
                "13.pdf": "Hoofdstuk 13 (Applications of Partial Derivatives)",
                "14.pdf": "Hoofdstuk 14 (Multiple Integration)",
                "15.pdf": "Hoofdstuk 15 (Vector Fields)",
                "16.pdf": "Hoofdstuk 16 (Vector Calculus)",
                "17a.pdf": "Hoofdstuk 17 Deel 1 (Ordinary Differential Equations)",
                "17b.pdf": "Hoofdstuk 17 Deel 2 (Ordinary Differential Equations)",
            }
            ch_name = chapter_names.get(fn, f"Hoofdstuk {fn.replace('.pdf', '')}")
            display_title = f"Boek Adams Calculus - Oplossingen {ch_name}"
            if "17a" in fn:
                tags.append("Deel 1")
            elif "17b" in fn:
                tags.append("Deel 2")
                
        # 1 BIRA Oefenzittingen images & PDFs
        elif "1 BIRA/Analyse (met boek Pearson)/Analyse/Oefenzittingen" in path:
            category_id = 4
            m_oz = re.search(r'Oefenzitting\s*(\d+)', path)
            oz_num = m_oz.group(1) if m_oz else ""
            if fn == "Modeloplossing.pdf":
                if oz_num == "2":
                    display_title = "Oefenzitting 2 - Limieten (Modeloplossing)"
                elif oz_num == "3":
                    display_title = "Oefenzitting 3 - Vlakdelen Wentelen (Modeloplossing)"
                elif oz_num == "4":
                    display_title = "Oefenzitting 4 - Snijdende Oppervlakken (Modeloplossing)"
                else:
                    display_title = f"Oefenzitting {oz_num} (Modeloplossing)"
                tags = ["Modeloplossing"]
            else:
                display_title = f"Oefenzittingen - Oefenzitting {oz_num}"
                tags = ["Scan", "Oplossing", "Handgeschreven"]
                
        else:
            # Fallback
            display_title = fn.replace(f".{ext}", "")
            display_title = re.sub(r'[_.\-]+', ' ', display_title).strip()
            category_id = d.get("category_id", 3)
            tags = d.get("tags", [])

        # Construct final object
        entry = {
            "file_id": fid,
            "display_title": display_title,
            "category_id": category_id,
            "year": year,
            "author": author,
            "tags": tags
        }
        output.append(entry)

    out_file = "migration_data/canary_h01a0b_ai_output.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Generated {len(output)} records to {out_file}")

if __name__ == "__main__":
    main()
