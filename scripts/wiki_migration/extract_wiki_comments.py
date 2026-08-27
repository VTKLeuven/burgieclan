#!/usr/bin/env python3
"""Extract course reviews from the legacy VTK MediaWiki into Burgieclan course_comment rows.

Two stages, so the slow/privileged part runs once:

    python3 scripts/wiki_migration/extract_wiki_comments.py dump    # SSH to nina + liv, cache locally
    python3 scripts/wiki_migration/extract_wiki_comments.py build   # offline, repeatable

`build` writes:
    migration_data/wiki_comments_import.json   -- rows ready for import_wiki_comments.py
    migration_data/wiki_comments_report.json   -- every page/section/block that did NOT make it, and why

Credentials come from the environment; nothing is hardcoded:
    WIKI_SSH_HOST (default it@nina)   WIKI_DB_PASSWORD (required for `dump`)
    LIV_SSH_HOST  (default it@liv)
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "migration_data"
RAW_DIR = DATA_DIR / "raw"

PAGES_CACHE = RAW_DIR / "wiki_pages.json"
COURSES_CACHE = RAW_DIR / "burgieclan_courses.json"
# Optional, built by dump_revision_dates.py: line hash -> first revision it appeared in.
LINE_DATES_CACHE = RAW_DIR / "line_first_seen.json"
IMPORT_FILE = DATA_DIR / "wiki_comments_import.json"
REPORT_FILE = DATA_DIR / "wiki_comments_report.json"
SCRIPT_DIR = Path(__file__).resolve().parent
# Reviewed decisions, not data: versioned with the code, unlike migration_data/.
ALIASES_FILE = SCRIPT_DIR / "course_code_aliases.json"
YEAR_OVERRIDES_FILE = SCRIPT_DIR / "year_overrides.json"

# Comments longer than this are flagged rather than silently imported: the frontend
# renders comment content as a single <p> (CommentRow.tsx), so a 20k-char exam dump
# is a wall of text. Flagged rows stay in the output with "oversize": true.
MAX_COMMENT_CHARS = 4000
MIN_COMMENT_CHARS = 15

# Academic year sanity window for the legacy wiki.
MIN_YEAR, MAX_YEAR = 2005, 2026

# comment_category ids. "Examen" (a verdict on the exam) and "Examenvragen" (the questions
# themselves) are separate sections on the wiki and need separate categories here.
CAT_EXAM_FEEDBACK = 7
# Set this to the id of the new Examenvragen / Exam questions category once it exists in
# comment_category. Until then questions fall back into Examen and build says so.
CAT_EXAM_QUESTIONS = int(os.environ.get("EXAM_QUESTIONS_CATEGORY_ID", 10))
EXAM_QUESTIONS_HAVE_OWN_CATEGORY = True


# --------------------------------------------------------------------------------------
# Category resolution
# --------------------------------------------------------------------------------------
#
# Ordered most-specific-first and matched with word boundaries. Both matter:
#   - "herexamen" must be tried before "examen", or `herexamendata:` lands in Exam (7)
#   - "practical sessions" must be tried before "practical", or labs land in Practical (8)
#   - \b anchors stop "exam" matching "example" and "examen" matching "voorbeeldexamen"
#
# The English half of the wiki template was translated ad hoc over the years, so each
# category has several wordings in the wild ("Study load", "Studyload", "Course quality",
# "Quality of the course text", "Teaching style during lectures", ...).
CATEGORY_RULES = [
    (9, [r"herexamen\s*data", r"\bherexamens?\b", r"re-?examination\s+dates?",
     r"\bresits?\b", r"retake\s+dates?"]),
    (6, [
        r"evaluatie\s+(?:van\s+)?(?:de\s+)?oefenzittingen",
        r"evaluation\s+(?:of\s+)?(?:the\s+)?(?:practical|exercise)\s+sessions",
        r"\boefenzittingen\b",
        r"(?:practical|exercise)\s+sessions",
        r"\blabo'?s\b",
    ]),
        # "Examen" and "Examenvragen" are different sections and belong in different
    # categories: the first is a student's verdict on the exam, the second is the
    # questions the cohort reconstructed afterwards. Questions must be listed first --
    # "examenvragen" contains "examen".
    (CAT_EXAM_QUESTIONS, [
        r"\bexamenvragen\b", r"exam\s+questions", r"typische\s+examen",
        r"voorbeeldexamen", r"^\W*vragen\b", r"\bexamenopgaven\b",
        r"\b(?:oude|nieuwe|mogelijke)?\s*vragen\b", r"\bmeerkeuzevragen\b",
    ]),
    (CAT_EXAM_FEEDBACK, [
        r"\bexamens?\b", r"\bexams?\b", r"\bexamination\b",
        r"puntenverdeling", r"course\s+grading",
    ]),
    (2, [
        r"kwaliteit\s+(?:van\s+)?(?:de\s+)?cursus",
        r"quality\s+(?:of\s+)?(?:the\s+)?course",
        r"course\s+quality",
        r"\bcursustekst\b",
    ]),
    (3, [r"studiebelasting", r"study\s*load", r"\bworkload\b"]),
    (4, [
        r"plaats\s+binnen\s+(?:de\s+)?(?:opleiding|studieprogramma)",
        r"(?:place|position)\s+within\s+(?:the\s+)?(?:study\s+)?(?:program\w*|education|curriculum)",
    ]),
    (5, [
        r"manier\s+van\s+lesgeven",
        r"(?:way|style|manner|method)\s+of\s+teaching",
        r"teaching\s+(?:style|method)",
        r"\bhoorcolleges?\b",
        r"\blessen\b",
    ]),
    (8, [r"\bpraktisch\w*\b", r"\bpracticalities\b", r"practical\s+matters", r"\bpractical\b"]),
]
CATEGORY_RULES = [
    (cid, [re.compile(p, re.IGNORECASE) for p in pats]) for cid, pats in CATEGORY_RULES
]

# Categories whose content is a per-session dump rather than one opinion per student.
# Exam FEEDBACK is deliberately not here: it is one verdict per student like any other
# review section, and grouping it merged separate students into a single unvotable block.
GROUPED_CATEGORIES = {CAT_EXAM_QUESTIONS, 9}

MONTHS = {
    "januari": 1, "january": 1, "jan": 1,
    "februari": 2, "february": 2, "feb": 2,
    "maart": 3, "march": 3,
    "april": 4,
    "mei": 5, "may": 5,
    "juni": 6, "june": 6, "jun": 6,
    "juli": 7, "july": 7, "jul": 7,
    "augustus": 8, "august": 8, "aug": 8,
    "september": 9, "sept": 9, "sep": 9,
    "oktober": 10, "october": 10, "okt": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12,
}
MONTH_ALT = "|".join(sorted(MONTHS, key=len, reverse=True))

# Sections that are never student commentary, whatever they are nested under: file
# attachments and pass-rate tables.
NON_CONTENT_RE = re.compile(
    r"^\s*(?:bestanden|files?|documenten|documents?|bijlagen|attachments?|"
    r"slaagcijfers|pass\s*rates?|externe\s+links?|external\s+links?|links?|"
    r"samenvattingen|summaries)\b",
    re.IGNORECASE,
)

PLACEHOLDERS = (
    "geen info", "nog geen info", "hier komt tekst", "nieuwe vragen hier toevoegen",
    "vul aan", "nog aan te vullen", "tbd", "n.v.t.",
    # Boilerplate the wiki template prints above every review list, on ~520 pages.
    "elk puntje hieronder is iemands mening",
    "each item below is someone's opinion",
)


def resolve_category(heading):
    for cid, patterns in CATEGORY_RULES:
        for pat in patterns:
            if pat.search(heading):
                return cid
    return None


# --------------------------------------------------------------------------------------
# Wikitext cleaning
# --------------------------------------------------------------------------------------

def clean_wikitext(text):
    if not text:
        return ""

    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
    text = re.sub(r"<(ref|math|gallery|filelist|source|syntaxhighlight)\b[^>]*>.*?</\1>",
                  "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<(ref|filelist|gallery)\b[^>]*/?>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\{\{[^{}]*\}\}", "", text)
    text = re.sub(r"\{\|.*?\|\}", "", text, flags=re.DOTALL)  # wiki tables

    text = re.sub(r"\[\[(?:Category|Categorie|File|Bestand|Image|Afbeelding):[^\]]*\]\]",
                  "", text, flags=re.IGNORECASE)
    text = re.sub(r"\[\[[^|\]]*\|([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)

    # Frontend renders comment content as plain text, so markdown links would show
    # literally. Emit "label (url)" instead.
    text = re.sub(r"\[(https?://[^\s\]]+)\s+([^\]]+)\]", r"\2 (\1)", text)
    text = re.sub(r"\[(https?://[^\s\]]+)\]", r"\1", text)

    text = re.sub(r"</?br\s*[/\\]?>", "\n", text, flags=re.IGNORECASE)
    # Block-level tags become line breaks first; stripping them outright would run
    # "<li>a</li><li>b</li>" together into "ab".
    text = re.sub(r"</?(?:p|div|li|tr|dd|dt|blockquote|h[1-6])\b[^>]*>",
                  "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</(?:td|th)>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"</?(?:span|b|i|u|s|del|ins|strike|strong|em|ol|ul|dl|table|tbody|thead|td|th|"
                  r"pre|code|center|small|big|font|sub|sup|hr|nowiki|tt|abbr)\b[^>]*>",
                  "", text, flags=re.IGNORECASE)
    import html
    text = html.unescape(text)
    # Strip scraper SQL artifacts from legacy wiki dump
    text = re.sub(r";\s*INSERT INTO \w+ \([^)]*\) VALUES\s*", " ", text, flags=re.IGNORECASE)
    # MediaWiki signatures (~~~~ expands to "User (talk) 12:34, 1 January 2019 (CET)").
    # Markup, not content -- and on this wiki the username is the student's r-number.
    text = re.sub(r"\s*\b\w+\s*\(talk\)\s*\d{1,2}:\d{2},\s*\d{1,2}\s+\w+\s+\d{4}"
                  r"\s*\([A-Z]{2,4}\)", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^-{3,}$", "", text, flags=re.MULTILINE)

    # Unbalanced leftovers: a link with a bracket inside, a table whose opener or closer
    # is missing, a <math> without its partner. The paired patterns above cannot see
    # these, and they render literally in the comment.
    text = re.sub(r"</?(?:math|ref|nowiki|gallery|filelist|source|syntaxhighlight)\b[^<>]*>",
                  "", text, flags=re.IGNORECASE)
    text = re.sub(r"^[ \t]*[{|]\|.*$|^[ \t]*\|[}\-+].*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"\[\[|\]\]", "", text)
    # Wiki indentation at line start ( ":1. What is salicide" ) is markup, not content.
    text = re.sub(r"^[ \t]*[:;]+[ \t]*", "", text, flags=re.MULTILINE)

    # Bold/italic markup, stripped by run length rather than as pairs. A real bullet
    # reads ''''22-'23:''' Handboek... -- that is bold plus the apostrophe of the year
    # '22, which a paired "'''([^']+)'''" cannot match because of the inner apostrophe,
    # so the markup survived into the comment.
    def _apostrophes(m):
        n = len(m.group(0))
        if n == 4:
            return "'"          # bold marker plus one literal apostrophe
        if n > 5:
            return "'" * (n - 5)
        return ""               # 2 italic, 3 bold, 5 both
    text = re.sub(r"'{2,}", _apostrophes, text)

    # Removing a template or tag mid-sentence leaves a gap before the punctuation
    # that followed it ("zie {{Vaktemplate}}." -> "zie ."). Close it up.
    text = re.sub(r"[ \t]+([.,;:!?])", r"\1", text)
    text = re.sub(r"[ \t]{2,}", " ", text)

    # Strip boilerplate wiki disclaimers (e.g. under Herexamendata)
    text = re.sub(
        r"^(?:[0-9]+\.\s*)?(?:Dit|Het)\s+is\s+absoluut\s+GEEN\s+garantie\s+dat\s+dit\s+de\s+komende\s+jaren\s+ook\s+zo\s+is\.\s*Puur\s+een\s+overzicht\s+van\s+vorige\s+jaren\.\s*(?:\(Wel\s+een\s+redelijke\s+kans\s+om\s+rond\s+die\s+datum\s+te\s+vallen\)\.?\s*)?",
        "",
        text,
        flags=re.IGNORECASE | re.MULTILINE
    )
    text = re.sub(
        r"^DISCLAIMER:\s*Er\s+is\s+geen\s+garantie\s+dat\s+dit\s+elk\s+jaar\s+op\s+deze\s+dag\s+valt\s+maar\s+het\s+geeft\s+wel\s+een\s+indicatie\s*",
        "",
        text,
        flags=re.IGNORECASE | re.MULTILINE
    )
    text = re.sub(
        r";\s*Is\s+geen\s+garantie\s+dat\s+dit\s+elk\s+jaar\s+op\s+deze\s+dag\s+is\s+maar\s+geeft\s+wel\s+indicatie\.?",
        "",
        text,
        flags=re.IGNORECASE
    )

    lines = [ln.strip() for ln in text.split("\n")]
    lines = [ln for ln in lines if ln and not re.fullmatch(r"[*#:;\-•\s]+", ln)]
    return "\n".join(lines).strip()


# Only strips a leading year that is a *complete* token. The bracketed forms require both
# delimiters, so "(2019-2020, prof. Beernaert) Mijns inziens..." is left intact -- the old
# `\(?YEAR\)?` pattern ate the opening paren and the year and left ", prof. Beernaert)".
_YEAR_TOKEN = (r"(?:20\d{2}\s*[-/–]\s*'?(?:20)?\d{2}"
               r"|'?\d{2}\s*[-/–]\s*'?\d{2}"
               r"|20\d{2})")
LEADING_YEAR_RE = re.compile(
    r"^\s*(?:"
    r"\(" + _YEAR_TOKEN + r"\)"
    r"|\[" + _YEAR_TOKEN + r"\]"
    r"|" + _YEAR_TOKEN +
    # Also eat the punctuation that followed the year. Real bullets are written
    # "* [2018-2019]. Standaard 3 studiepunten" and "*(2018-2019):toch wel een
    # belasting" -- dropping only the year left the body starting on "." or ":".
    # ...but not when another number follows. "13/01/2005 12u30 THEORIEVRAGEN" opens with
    # something shaped like the academic year 13-01; stripping it left the body on "/2005".
    r")(?![ \t]*[/.\-–][ \t]*\d)"
    r"[ \t]*[:.,;\-–]?[ \t]*",
)


# "(2019-2020, prof. Beernaert) ..." -- the year is about to be re-stated in the
# [YYYY-YYYY] prefix, but the rest of the parenthetical is real content. Drop only the
# year and keep the attribution, rather than eating the whole thing or, as the previous
# version did, eating the opening paren and leaving ", prof. Beernaert)" behind.
LEADING_YEAR_IN_PAREN_RE = re.compile(
    r"^\s*([(\[])\s*" + _YEAR_TOKEN + r"\s*[,;:–-]\s*([^)\]]+)([)\]])\s*"
)


def strip_leading_year(text):
    prev = None
    while prev != text:
        prev = text
        text = LEADING_YEAR_IN_PAREN_RE.sub(r"\1\2\3 ", text, count=1)
        text = LEADING_YEAR_RE.sub("", text, count=1).strip()
    return text


# --------------------------------------------------------------------------------------
# Year resolution
# --------------------------------------------------------------------------------------

# Burgieclan stores the academic year as VARCHAR(11) in the form "2024 - 2025", spaces
# included. Internal comparisons and year_overrides.json use the compact "2024-2025";
# YEAR_DISPLAY_RE / to_display_year() convert at the boundary.
def academic_year(year, month):
    """Sep-Dec of year Y belongs to Y/Y+1; Jan-Aug of Y belongs to Y-1/Y."""
    return f"{year}-{year + 1}" if month >= 9 else f"{year - 1}-{year}"


def to_display_year(compact):
    """"2024-2025" -> "2024 - 2025", the exact format the column expects."""
    if not compact:
        return None
    a, b = compact.split("-")
    return f"{a} - {b}"


def _mask_false_years(text):
    """Blank out things that look like years but aren't: grades, clock times, page ranges."""
    t = re.sub(r"\b(?:[01]?\d|20)\s*/\s*20\b", " ", text)                       # 15/20
    t = re.sub(r"\b\d{1,2}\s*[-–]\s*\d{1,2}\s*(?:u|uur|h|hrs?|hours?)\b",
               " ", t, flags=re.IGNORECASE)                                     # 16-18u
    t = re.sub(r"\b\d+\s*[-–]\s*\d+\s*(?:blz|pag|pp|page|pages|slides?|sp|ects)\b",
               " ", t, flags=re.IGNORECASE)                                     # 30-40 blz
    t = re.sub(r"\b\d{1,2}[/.]\d{1,2}[/.](\d{4})\b", r" \1 ", t)                # 06/06/2024 -> 2024
    t = re.sub(r"'(\d{2})\b", r"\1", t)                                         # '22-'23 -> 22-23
    return t


def extract_year(text):
    """Return (academic_year, source) or (None, None) when nothing explicit is present."""
    probe = _mask_false_years(text)

    m = re.search(r"\b(20[0-2]\d)\s*[-/–]\s*(?:20)?([0-2]\d)\b", probe)
    if m:
        y1, y2 = int(m.group(1)), int(m.group(2))
        y2 += 2000 if y2 < 100 else 0
        if y2 == y1 + 1 and MIN_YEAR <= y1 <= MAX_YEAR:
            return f"{y1}-{y2}", "explicit_academic_year"

    m = re.search(r"\b([0-2]\d)\s*[-/–]\s*([0-2]\d)\b", probe)
    if m:
        y1, y2 = int(m.group(1)) + 2000, int(m.group(2)) + 2000
        if y2 == y1 + 1 and MIN_YEAR <= y1 <= MAX_YEAR:
            return f"{y1}-{y2}", "explicit_short_academic_year"

    # Month + date. The day must be consumed explicitly, or "January 19, 2024" reads the
    # DAY as a two-digit year and dates the comment 2018-2019. Both orders occur:
    # "June 14 2024" / "June 13th, 2016" and "10 Juni 2014" / "12th January 2026".
    for pat in (rf"\b({MONTH_ALT})\w*\s+\d{{1,2}}(?:st|nd|rd|th)?\s*,?\s*(20\d{{2}})\b",
                rf"\b\d{{1,2}}(?:st|nd|rd|th)?\s+({MONTH_ALT})\w*\s*,?\s*(20\d{{2}})\b",
                rf"\b({MONTH_ALT})\w*\s*,?\s*(20\d{{2}})\b"):
        m = re.search(pat, probe, re.IGNORECASE)
        if m:
            year = int(m.group(2))
            if MIN_YEAR <= year <= MAX_YEAR:
                return academic_year(year, MONTHS[m.group(1).lower()]), "explicit_month_year"

    # Month + two-digit year, only when no four-digit year is present anywhere -- otherwise
    # the two digits are almost always a day.
    if not re.search(r"\b20\d{2}\b", probe):
        m = re.search(rf"\b({MONTH_ALT})\s+([0-2]\d)\b", probe, re.IGNORECASE)
        if m:
            year = int(m.group(2)) + 2000
            if MIN_YEAR <= year <= MAX_YEAR:
                return academic_year(year, MONTHS[m.group(1).lower()]), "explicit_month_year"

    m = re.search(r"\b(20[0-2]\d)\b", probe)
    if m:
        year = int(m.group(1))
        if MIN_YEAR <= year <= MAX_YEAR:
            # A bare year in a review almost always names an exam session (Jan/Jun),
            # which falls in academic year (Y-1)-Y.
            return academic_year(year, 6), "explicit_bare_year"

    return None, None


# A sub-heading that names an exam session rather than a topic: "Januari 2016",
# "Maandag 28/01/2013 8u30", "Exam January 29, 2022 (8h00)", "Trillingen 17/06/2019".
#
# Recognised by content rather than by a rigid ^-anchored shape. The previous structural
# pattern demanded the date sit at the very start after a short keyword list, so a weekday
# ("Vrijdag 18/01/2012"), a course name ("Trillingen 10 Juni 2014"), an ordinal ("June 17th
# 2021") or a trailing time ("January 23 2020 9h") all made it fail -- 159 real session
# headings in the dump went unrecognised, and their comments silently took a year from
# whatever the body happened to mention.
SESSION_DATE_RE = re.compile(
    rf"(?:\b\d{{1,2}}[/.]\d{{1,2}}[/.]20\d{{2}}\b"          # 17/06/2019
    rf"|\b(?:{MONTH_ALT})\w*\s*,?\s*\d{{0,2}}(?:st|nd|rd|th)?\s*,?\s*20\d{{2}}\b"
    rf"|\b\d{{1,2}}(?:st|nd|rd|th)?\s+(?:{MONTH_ALT})\w*\s*,?\s*20\d{{2}}\b"
    rf"|\bacademiejaar\s+20\d{{2}}"
    rf"|^\W*20\d{{2}}\s*[-/–]\s*(?:20)?\d{{2}}\W*$"          # 2018-2019 alone
    rf"|^\W*\d{{2}}\s*[-/–]\s*\d{{2}}\W*$"                   # 18-19 alone
    rf"|\b20\d{{2}}\b)",                                      # "Voorbeeldexamen 2019"
    re.IGNORECASE,
)

# Words that make a heading a topic even though it carries a year, e.g. a review section
# that mentions a year in its title.
SESSION_DISQUALIFIERS = re.compile(
    r"kwaliteit|quality|studiebelast|study\s*load|plaats\s+binnen|place\s+within|"
    r"position\s+within|lesgeven|teaching|oefenzitting|slaagcijfer|bestanden|files?\b",
    re.IGNORECASE,
)


def looks_like_session_heading(heading):
    if len(heading) > 70 or SESSION_DISQUALIFIERS.search(heading):
        return False
    if not SESSION_DATE_RE.search(heading):
        return False
    return extract_year(heading)[0] is not None


# --------------------------------------------------------------------------------------
# Page parsing
# --------------------------------------------------------------------------------------

# Anchored to line start and line end. The old `(=+)\s*([^=\n]+?)\s*\1` matched anywhere,
# so any line containing two '=' signs (formulas, "x = example exercises) and 4 workshops (y =")
# was parsed as a section heading and then category-matched on its contents.
# (?!>) keeps "==> therefore" -- students write that as an arrow -- from being read as a
# heading. The closing run is optional because real pages carry unclosed headings
# ("==Vorige prof: Creemers"), and a trailing aside is allowed because they also carry
# "===Juni 2014=== (niet meer relevant)", which a plain $-anchor missed entirely.
HEADING_RE = re.compile(
    # The optional apostrophe runs are for a heading someone also wrapped in bold
    # markup; the dump contains such lines, and without this they leak into a comment.
    r"^[ \t]*'{0,5}[ \t]*(={2,6})(?!>)[ \t]*(.+?)"
    r"[ \t]*(?:\1[ \t]*(?:\([^)\n]*\))?)?[ \t]*'{0,5}[ \t]*$",
    re.MULTILINE,
)

# Leading list markup. The [:;] tail covers wiki indent/definition markers that
# follow a bullet ("*:toch wel een belasting"), which otherwise survive as the
# first character of the comment.
BULLET_RE = re.compile(r"^[ \t]*([*#•\-]+)[ \t]*[:;]*[ \t]*")


def split_blocks(section):
    """Split a section into blocks. A block starts at a bullet/numbered line; non-bullet
    lines are continuations of the block above them."""
    blocks, current = [], []
    for raw in section.split("\n"):
        line = raw.rstrip()
        if not line.strip():
            continue
        if BULLET_RE.match(line):
            if current:
                blocks.append("\n".join(current))
            current = [BULLET_RE.sub("", line, count=1)]
        else:
            current.append(line.strip())
    if current:
        blocks.append("\n".join(current))
    return [b for b in blocks if b.strip()]


def line_date_key(line):
    """Must match dump_revision_dates.line_key exactly, or nothing looks up."""
    t = unicodedata.normalize("NFKD", line.lower())
    t = re.sub(r"[^a-z0-9]+", " ", t).strip()
    if len(t) < 25:
        return None
    return hashlib.sha1(t.encode()).hexdigest()[:16]


def first_written(body, page_dates):
    """Earliest revision date among this comment's lines, or None if unknown."""
    if not page_dates:
        return None
    seen = [page_dates[k] for k in
            (line_date_key(ln.strip()) for ln in body.split("\n")) if k in page_dates]
    return min(seen) if seen else None


def normalize_for_dedup(text):
    t = unicodedata.normalize("NFKD", text.lower())
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def normalize_course_name(name):
    t = unicodedata.normalize("NFKD", name.lower())
    return re.sub(r"[^a-z0-9]+", "", t)


def is_placeholder(text):
    low = text.lower()
    return any(p in low for p in PLACEHOLDERS)


# --------------------------------------------------------------------------------------
# Stage 1: dump
# --------------------------------------------------------------------------------------

WIKI_QUERY = """
SELECT json_agg(json_build_object(
    'title', p.page_title,
    'timestamp', r.rev_timestamp::text,
    'actor', a.actor_name,
    'text', pc.old_text))
FROM wiki.page p
JOIN wiki.revision r ON r.rev_id = p.page_latest
JOIN wiki.slots s ON s.slot_revision_id = r.rev_id
JOIN wiki.content c ON c.content_id = s.slot_content_id
JOIN wiki.pagecontent pc ON pc.old_id = REPLACE(c.content_address, 'tt:', '')::integer
LEFT JOIN wiki.revision_actor_temp rat ON rat.revactor_rev = r.rev_id
LEFT JOIN wiki.actor a ON a.actor_id = rat.revactor_actor
WHERE p.page_namespace = 0;
"""

COURSE_QUERY = "SELECT json_agg(json_build_object('id', id, 'code', code, 'name', name)) FROM course;"


def ssh_json(host, remote_cmd, label, secret=None):
    """Run remote_cmd over ssh and parse its stdout as JSON.

    A secret is read from stdin on the remote side rather than interpolated into the
    command, so it never appears in the remote host's process list (`ps` shows argv).
    """
    print(f"  -> {label} via {host} ...", flush=True)
    stdin = None
    if secret is not None:
        remote_cmd = f"IFS= read -r PGPASSWORD; export PGPASSWORD; {remote_cmd}"
        stdin = (secret + "\n").encode()
    try:
        out = subprocess.run(
            ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", host, remote_cmd],
            check=True, capture_output=True, input=stdin,
        ).stdout.decode("utf-8", errors="replace")
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.decode("utf-8", errors="replace").strip()
        if secret:
            stderr = stderr.replace(secret, "***")
        sys.exit(f"ssh to {host} failed ({exc.returncode}): {stderr}")
    out = out.strip()
    if not out:
        sys.exit(f"{label}: empty result from {host}")
    return json.loads(out)


def cmd_dump(args):
    password = os.environ.get("WIKI_DB_PASSWORD")
    if not password:
        sys.exit("WIKI_DB_PASSWORD is not set. Export it before running `dump`; "
                 "it is deliberately not stored in this repository.")
    wiki_host = os.environ.get("WIKI_SSH_HOST", "it@nina")
    liv_host = os.environ.get("LIV_SSH_HOST", "it@liv")

    RAW_DIR.mkdir(parents=True, exist_ok=True)

    if PAGES_CACHE.exists() and not args.refresh:
        print(f"{PAGES_CACHE} exists; use --refresh to re-fetch.")
    else:
        query = " ".join(WIKI_QUERY.split())
        pages = ssh_json(
            wiki_host,
            "psql -h 127.0.0.1 -U wiki -d wiki -t -A -c " + json.dumps(query),
            "MediaWiki page dump",
            secret=password,
        )
        PAGES_CACHE.write_text(json.dumps(pages, ensure_ascii=False))
        print(f"  wrote {len(pages)} pages -> {PAGES_CACHE}")

    if COURSES_CACHE.exists() and not args.refresh:
        print(f"{COURSES_CACHE} exists; use --refresh to re-fetch.")
    else:
        courses = ssh_json(
            liv_host,
            "docker compose -f /opt/burgieclan/docker-compose.prod.yml exec -T db "
            "psql -U burgieclan_db_user -d burgieclan_db -t -A -c "
            + json.dumps(COURSE_QUERY),
            "Burgieclan course catalog",
        )
        COURSES_CACHE.write_text(json.dumps(courses, ensure_ascii=False))
        print(f"  wrote {len(courses)} courses -> {COURSES_CACHE}")


# --------------------------------------------------------------------------------------
# Stage 2: build
# --------------------------------------------------------------------------------------

def load_cache():
    for path in (PAGES_CACHE, COURSES_CACHE):
        if not path.exists():
            sys.exit(f"missing {path}. Run `extract_wiki_comments.py dump` first.")
    return json.loads(PAGES_CACHE.read_text()), json.loads(COURSES_CACHE.read_text())


def course_codes_in_title(title):
    """Every plausible KU Leuven course code in a wiki page title, best-first.

    Real titles are messier than "Name (H01A0B)":
        Computer_Architecture_(H05D3a)                  lowercase tail
        Energy_challenges_(B-KUL-H9X53A)                B-KUL- prefix
        Control_Theory_(H04X3A/B)                       A/B variants
        Declarative_..._in_AI_(H02A3A                   closing paren missing
        (Systems_and)_Control_Theory_(H04X3A/B)_-_...   a non-code paren group first
    """
    codes = []
    for group in re.findall(r"\(([^()]{4,24})(?:\)|$)", title):
        g = re.sub(r"\s+", "", group).upper()
        g = re.sub(r"^B-KUL-", "", g)

        if re.fullmatch(r"[A-Z0-9]{6}", g):
            codes.append(g)
            continue
        # 5-character codes (e.g. H04O0 -> H04O0A)
        if re.fullmatch(r"[A-Z0-9]{5}", g):
            codes.append(g + "A")
            continue
        # H04X3A/B -> H04X3A, H04X3B
        m = re.fullmatch(r"([A-Z0-9]{5})([A-Z])/([A-Z])", g)
        if m:
            codes += [m.group(1) + m.group(2), m.group(1) + m.group(3)]
            continue
        # H00S3/4A -> H00S3A, H00S4A
        m = re.fullmatch(r"([A-Z0-9]{4})(\d)/(\d)([A-Z])", g)
        if m:
            codes += [m.group(1) + m.group(2) + m.group(4),
                      m.group(1) + m.group(3) + m.group(4)]
    return codes


def match_course(title, by_code):
    """Resolve a wiki page to a Burgieclan course, or say precisely why it cannot.

    Deliberately no match-by-course-name fallback. Over the real 930-page dump it
    recovered nothing (all 40 code-less pages are meta pages: templates, exchange
    universities, people) while mapping renumbered courses onto unrelated ones --
    Ingenieur_en_bouwkunst_(H04M7A) resolved to H01A0A. A page whose code is gone
    from the catalog is reported for review instead; see course_code_aliases.json.
    """
    codes = course_codes_in_title(title)
    if not codes:
        return None, "not_a_course_page_no_code_in_title"
    for code in codes:
        if code in by_code:
            return by_code[code], "code"
    return None, f"course_code_not_in_burgieclan:{'/'.join(codes)}"


def load_aliases(by_code):
    """Also accepts a year-aware form, see the docstring below."""
    """Optional {"old code": "current code"} map for renumbered courses.

    The report lists every wiki code missing from the catalog; deciding which of those
    are the same course under a new number is a judgement call for a human, so it is
    recorded here explicitly rather than guessed from course names.
    """
    if not ALIASES_FILE.exists():
        return {}
    raw = json.loads(ALIASES_FILE.read_text())
    whole, from_year = {}, {}
    for old, rule in raw.items():
        if old.startswith("_"):  # allow "_comment" keys
            continue
        old = old.strip().upper()
        if isinstance(rule, str):
            # "OLD": "NEW" -- every comment moves.
            target, cutoff = rule.strip().upper(), None
        else:
            # {"to": "NEW", "from_academic_year": "2018-2019"} -- a renumbering. Comments
            # from that year on belong to the new code; earlier ones stay on the old
            # course, which really did run then. Toegepaste mechanica is this shape.
            target = str(rule["to"]).strip().upper()
            cutoff = rule.get("from_academic_year")
            if cutoff and not re.fullmatch(r"20\d{2}-20\d{2}", cutoff):
                sys.exit(f"{ALIASES_FILE}: {old} has from_academic_year={cutoff!r}, "
                         f"expected YYYY-YYYY")
        if target not in by_code:
            sys.exit(f"{ALIASES_FILE}: {old} maps to {target}, which is not a course code")
        (from_year if cutoff else whole)[old] = (target, cutoff)
    print(f"Loaded {len(whole)} whole-course and {len(from_year)} year-split aliases "
          f"from {ALIASES_FILE.name}.")
    return whole, from_year


def cmd_build(args):
    pages, courses = load_cache()

    by_code = {c["code"].strip().upper(): c for c in courses}
    whole_aliases, year_aliases = load_aliases(by_code)
    for old, (new, _) in whole_aliases.items():
        # Overrides rather than fills a gap: a superseded course often still exists in
        # Burgieclan under its old code (H01B0A "Toegepaste mechanica, deel 1" alongside
        # the current H01B0B), and its comments must move to the row students browse.
        if old in by_code and by_code[old]["code"] != new:
            print(f"  alias {old} -> {new}: redirecting away from an existing course row")
        by_code[old] = by_code[new]
    line_dates = {}
    if LINE_DATES_CACHE.exists():
        line_dates = json.loads(LINE_DATES_CACHE.read_text())
        print(f"Loaded revision dates for {len(line_dates)} pages "
              f"({sum(len(v) for v in line_dates.values())} lines).")

    year_overrides = {}
    if YEAR_OVERRIDES_FILE.exists():
        for k, v in json.loads(YEAR_OVERRIDES_FILE.read_text()).items():
            if k.startswith("_"):
                continue
            m = re.fullmatch(r"(20\d{2})-(20\d{2})", v)
            if not m or int(m.group(2)) != int(m.group(1)) + 1:
                sys.exit(f"{YEAR_OVERRIDES_FILE}: {k} -> {v!r} is not a YYYY-YYYY academic "
                         f"year with consecutive years")
            year_overrides[k] = v
        print(f"Loaded {len(year_overrides)} reviewed year overrides.")
    print(f"Loaded {len(pages)} wiki pages and {len(courses)} Burgieclan courses.")

    rows = []
    dropped_pages = []
    dropped_blocks = []
    unmapped_headings = defaultdict(lambda: {"count": 0, "pages": []})
    stats = Counter()

    for page in pages:
        title = page.get("title") or ""
        wikitext = page.get("text") or ""

        course, how = match_course(title, by_code)
        if course is None:
            dropped_pages.append({"title": title, "reason": how})
            stats["pages_dropped"] += 1
            continue
        stats[f"pages_matched_by_{how}"] += 1

        rev_dt = None
        ts = (page.get("timestamp") or "").strip()
        if ts:
            for fmt in ("%Y-%m-%d %H:%M:%S", "%Y%m%d%H%M%S"):
                try:
                    rev_dt = datetime.strptime(ts[:19] if "-" in ts else ts[:14], fmt)
                    break
                except ValueError:
                    continue
        if rev_dt is None:
            dropped_pages.append({"title": title, "reason": f"unparseable_rev_timestamp:{ts!r}"})
            stats["pages_dropped"] += 1
            continue

        page_dates = line_dates.get(title, {})
        headings = list(HEADING_RE.finditer(wikitext))
        if not headings:
            dropped_pages.append({"title": title, "reason": "no_section_headings"})
            stats["pages_dropped"] += 1
            continue

        is_vragen_subpage = bool(re.search(r"_(?:Vragen|Examenvragen)\b", title, re.IGNORECASE))
        current_category = CAT_EXAM_QUESTIONS if is_vragen_subpage else None
        session_year = None
        # (category_id, year) -> list of block texts, for the grouped categories
        grouped = defaultdict(list)

        # Category and exam session are inherited down the heading tree, so a stray
        # sub-heading no longer orphans everything after it. Real pages look like:
        #
        #   L2 Examenvragen            -> category 7
        #   L3 Januari 2017            -> session 2016-2017
        #   L4 20 januari 8:30         -> no year of its own; inherits 2016-2017
        #   L3 Docs with answers ...   -> unmapped, but still inside Examenvragen
        #   L3 Januari 2016            -> session 2015-2016
        #   L2 Bestanden               -> back to level 2: category cleared
        #
        # Resetting on any unmapped heading (the previous behaviour) dropped every
        # session from "20 januari 8:30" onward -- that is where the orphaned
        # "Januari 2016" headings in the first real run came from.
        stack = [(0, CAT_EXAM_QUESTIONS, None)] if is_vragen_subpage else []

        for idx, h in enumerate(headings):
            level = len(h.group(1))
            heading = h.group(2).strip()
            # "====" and friends are separator lines, not headings; allowing unclosed
            # headings makes them match. Ignore anything with no letters or digits.
            if not re.search(r"\w", heading):
                continue
            start = h.end()
            end = headings[idx + 1].start() if idx + 1 < len(headings) else len(wikitext)
            section = wikitext[start:end]

            while stack and stack[-1][0] >= level:
                stack.pop()
            inherited_cat = stack[-1][1] if stack else None
            inherited_year = stack[-1][2] if stack else None

            cat = resolve_category(heading)
            if cat is not None:
                # A heading can be both, e.g. "Exam 15/06/2023" or "Examen 24/06/2024":
                # it names the category AND dates the session. When it has a date, it is
                # an exam questions session rather than a general feedback review.
                if cat == CAT_EXAM_FEEDBACK and looks_like_session_heading(heading):
                    cat = CAT_EXAM_QUESTIONS
                current_category = cat
                session_year = (extract_year(heading)[0]
                                if looks_like_session_heading(heading) else None)
            elif looks_like_session_heading(heading):
                # A dated section is the paper for that sitting, so its content is exam
                # questions even when the parent heading was the "Examen" verdict section.
                # With no parent at all it is still an exam sitting: 370 blocks across 22
                # courses sit under a bare "11 June 2021" with no Examenvragen above them.
                current_category = (CAT_EXAM_QUESTIONS
                                    if inherited_cat in (None, CAT_EXAM_FEEDBACK)
                                    else inherited_cat)
                session_year = extract_year(heading)[0] or inherited_year
                stats["session_headings"] += 1
            else:
                current_category, session_year = inherited_cat, inherited_year
                if heading:
                    entry = unmapped_headings[heading]
                    entry["count"] += 1
                    entry["inside_category"] = inherited_cat
                    if len(entry["pages"]) < 5:
                        entry["pages"].append(title)

            stack.append((level, current_category, session_year))

            # A sub-heading inside a category still holds that category's content:
            # "Question 1" / "Question 2" under Exam questions are exam questions.
            # Only attachments and pass-rate tables are genuinely not comments, and a
            # heading that popped the stack past its category has nothing to inherit.
            if current_category is None or NON_CONTENT_RE.match(heading):
                stats["sections_skipped_non_content"] += 1
                continue

            for block in split_blocks(section):
                text = clean_wikitext(block)
                if not text:
                    continue
                if is_placeholder(text):
                    stats["blocks_placeholder"] += 1
                    continue

                # A session heading wins over a year found in the body: the block is
                # filed under "=== Juni 2010 ===" literally, whereas a year inside the
                # answer text is usually an aside ("Tem. 2008 was de les misschien
                # gegeven door een andere prof"). Reading the body first filed that
                # example under 2007-2008 instead of 2009-2010.
                if session_year:
                    year, source = session_year, "session_heading"
                else:
                    year, source = extract_year(text)

                # When the revision history says when this text first appeared, that beats
                # guessing from the page's last edit -- it is a recorded date, not an
                # inference, so it can carry the year too. Looked up on the raw block:
                # the index is built from unprocessed wikitext lines, and cleaning strips
                # things (year markers, templates) that would change the hash.
                written = first_written(block, page_dates)
                if year is None and written:
                    wd = datetime.strptime(written, "%Y-%m-%d %H:%M:%S")
                    year, source = academic_year(wd.year, wd.month), "first_revision"
                    stats["year_from_first_revision"] += 1
                if year is None:
                    year = academic_year(rev_dt.year, rev_dt.month)
                    source = "revision_timestamp_fallback"

                body = strip_leading_year(text)
                if len(body) < MIN_COMMENT_CHARS:
                    dropped_blocks.append({
                        "course_code": course["code"], "category_id": current_category,
                        "reason": "too_short_after_cleaning", "text": text[:200],
                    })
                    stats["blocks_too_short"] += 1
                    continue

                # A renumbered course splits by year: this comment belongs to whichever
                # code KU Leuven actually offered in its academic year.
                target = course
                rule = year_aliases.get(course["code"].strip().upper())
                if rule and year >= rule[1]:
                    target = by_code[rule[0]]
                    stats["year_split_moved"] += 1

                record = {
                    "course_id": target["id"],
                    "course_code": target["code"],
                    "course_name": target["name"],
                    "category_id": current_category,
                    "academic_year": year,
                    "year_source": source,
                    # "first_revision" counts as known: the date the text was written is
                    # recorded fact and the academic year follows by arithmetic. It is
                    # weaker than an author writing "2010-2011:" but far stronger than the
                    # page's last edit. Drop it from this tuple to hide those years
                    # instead of showing them.
                    "year_is_explicit": source not in ("revision_timestamp_fallback",),
                    "source_page": title,
                    "source_heading": heading,
                    # The date the text first appeared, when the revision history is
                    # available; otherwise the page's last edit, which is only an upper
                    # bound. created_at is built from this.
                    "rev_timestamp": written or rev_dt.strftime("%Y-%m-%d %H:%M:%S"),
                    "date_source": "first_revision" if written else "page_last_edit",
                    "body": body,
                }

                if current_category in GROUPED_CATEGORIES:
                    grouped[(current_category, year, source)].append(record)
                else:
                    rows.append(record)

        # Exam questions / resit dates: one row per session, not one per numbered question.
        # Numbered so that a multi-line question stays distinguishable from the next one.
        for (cat, year, source), members in grouped.items():
            head = members[0]
            if len(members) == 1:
                body = members[0]["body"]
            else:
                body = "\n".join(f"{i}. {m['body']}" for i, m in enumerate(members, 1))
            rows.append({**head, "category_id": cat, "academic_year": year,
                         "year_source": source, "body": body,
                         "grouped_blocks": len(members)})

    # ---- Assemble content, dedup, flag oversize ----------------------------------------
    seen = {}
    duplicates = []
    final = []
    matched_override_keys = set()
    for r in rows:
        # Stable across rebuilds as long as the source text is unchanged, so a reviewed
        # year in year_overrides.json survives a re-run.
        row_key = hashlib.sha1(
            f"{r['source_page']}|{r['category_id']}|{r['body']}".encode()
        ).hexdigest()[:12]
        if row_key in year_overrides:
            matched_override_keys.add(row_key)
            r["academic_year"] = year_overrides[row_key]
            r["year_source"] = "manual_override"
            r["year_is_explicit"] = True
            stats["year_overrides_applied"] += 1

        # The year is structured data, not part of the review. It travels in its own
        # field so the frontend can render it however it likes; content is the student's
        # text and nothing else.
        content = r["body"]

        # academic_year is what the extractor worked out either way, kept for auditing.
        # academic_year_confirmed is the one safe to show a student: NULL when the year
        # was guessed from the page's last edit rather than found in the text, so a guess
        # can never be displayed as a fact.
        academic_year_confirmed = (to_display_year(r["academic_year"])
                                   if r["year_is_explicit"] else None)

        # Dedup keys on the year the reader will actually see, not the internal one.
        # Two cohorts often write the same short verdict ("Fair for 6 credits."): with
        # distinct confirmed years those are two real rows, but when both years were
        # merely guessed nothing distinguishes them on screen, so they must collapse.
        key = (r["course_id"], r["category_id"], academic_year_confirmed,
               normalize_for_dedup(content))
        if key in seen:
            duplicates.append({
                "course_code": r["course_code"], "category_id": r["category_id"],
                "kept_from": seen[key], "dropped_from": r["source_page"],
                "content": content[:200],
            })
            stats["duplicates_dropped"] += 1
            continue
        seen[key] = r["source_page"]

        oversize = len(content) > MAX_COMMENT_CHARS
        if oversize:
            stats["oversize"] += 1

        final.append({
            "row_key": row_key,
            "course_id": r["course_id"],
            "course_code": r["course_code"],
            "course_name": r["course_name"],
            "category_id": r["category_id"],
            "academic_year": r["academic_year"],
            "academic_year_confirmed": academic_year_confirmed,
            "year_source": r["year_source"],
            "year_is_explicit": r["year_is_explicit"],
            # The revision timestamp is the only real date available. The UI already
            # renders created_at (CommentMetadata.tsx), so it must not be invented.
            "created_at": r["rev_timestamp"],
            "date_source": r["date_source"],
            "source_page": r["source_page"],
            "source_heading": r["source_heading"],
            "grouped_blocks": r.get("grouped_blocks", 1),
            "oversize": oversize,
            "length": len(content),
            "content": content,
        })

    final.sort(key=lambda r: (r["course_code"], r["category_id"], r["academic_year"]))

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    IMPORT_FILE.write_text(json.dumps(final, indent=2, ensure_ascii=False))

    explicit = sum(1 for r in final if r["year_is_explicit"])
    report = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "summary": {
            "wiki_pages_total": len(pages),
            "pages_matched_by_code": stats["pages_matched_by_code"],
            "pages_matched_by_name": stats["pages_matched_by_name"],
            "pages_dropped": stats["pages_dropped"],
            "comments_ready": len(final),
            "courses_covered": len({r["course_code"] for r in final}),
            "year_explicit": explicit,
            "year_from_revision_fallback": len(final) - explicit,
            "duplicates_dropped": stats["duplicates_dropped"],
            "blocks_too_short": stats["blocks_too_short"],
            "blocks_placeholder": stats["blocks_placeholder"],
            "session_headings_used": stats["session_headings"],
            "oversize_flagged": stats["oversize"],
        },
        "by_category": dict(Counter(r["category_id"] for r in final)),
        "by_year_source": dict(Counter(r["year_source"] for r in final)),
        "by_academic_year": dict(sorted(Counter(r["academic_year"] for r in final).items())),
        "dropped_pages": dropped_pages,
        "unmapped_headings": sorted(
            ({"heading": h, **v} for h, v in unmapped_headings.items()),
            key=lambda e: -e["count"],
        ),
        "dropped_blocks": dropped_blocks[:500],
        "duplicates": duplicates[:500],
        "oversize": [
            {"course_code": r["course_code"], "category_id": r["category_id"],
             "length": r["length"], "source_page": r["source_page"]}
            for r in final if r["oversize"]
        ],
    }
    REPORT_FILE.write_text(json.dumps(report, indent=2, ensure_ascii=False))

    s = report["summary"]
    if year_overrides:
        applied = stats["year_overrides_applied"]
        print(f"\nyear overrides: {applied}/{len(year_overrides)} matched a comment")
        unmatched = sorted(set(year_overrides) - matched_override_keys)
        if unmatched:
            # A row_key that matches nothing is almost always a typo or, if the file came
            # from an LLM review, an invented key. Silently ignoring it would hide that.
            print(f"  WARNING: {len(unmatched)} override key(s) matched NO comment and had "
                  f"no effect: {', '.join(unmatched[:10])}"
                  + (" ..." if len(unmatched) > 10 else ""))
    print(f"\n{len(final)} comments across {s['courses_covered']} courses -> {IMPORT_FILE}")
    print(f"  year from the text itself : {explicit} ({explicit / max(len(final), 1):.0%})")
    print(f"  year guessed from last edit: {s['year_from_revision_fallback']} "
          f"-- these carry NO [year] prefix")
    print(f"  pages dropped: {s['pages_dropped']}   duplicates: {s['duplicates_dropped']}   "
          f"oversize (>{MAX_COMMENT_CHARS} chars): {s['oversize_flagged']}")
    print(f"  full breakdown of everything dropped -> {REPORT_FILE}")
    if report["unmapped_headings"]:
        print(f"\n  {len(report['unmapped_headings'])} unmapped headings; top 10:")
        for e in report["unmapped_headings"][:10]:
            print(f"    {e['count']:>4}x  {e['heading'][:70]!r}")


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p_dump = sub.add_parser("dump", help="fetch wiki pages + course catalog into migration_data/raw/")
    p_dump.add_argument("--refresh", action="store_true", help="re-fetch even if the cache exists")
    p_dump.set_defaults(func=cmd_dump)

    p_build = sub.add_parser("build", help="build the import file from the cache (offline)")
    p_build.set_defaults(func=cmd_build)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
