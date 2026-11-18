# Agent brief: independent audit of the Burgieclan file and course transfers

For an agentic CLI (Antigravity / Gemini) with file and shell access, run from the repo root
(the folder that contains `backend/`, `frontend/`, `scripts/` and `migration_data/`).
Paste everything below the line.

The result is meant to be compared with `scripts/migration/30_audit_transfers.py`, so the
output format below is fixed: keep it if you edit this brief.

---

You are auditing a finished data migration of Burgieclan, the study-material site of VTK
(engineering students, KU Leuven). Another agent has already audited the same data. Your job
is a **second, independent audit**, so the two results can be compared. Disagreements are the
most valuable output, so follow the evidence rather than trying to agree with anyone.

## Hard rules

1. **Read-only.** No `ssh`, no database connections, no `docker`, no network calls. Every
   input you need is a local file listed below. Never modify or delete any existing file.
2. **Write only inside `migration_data/gemini_audit/`.** Your scripts go in
   `migration_data/gemini_audit/scripts/`, your results in the two files under "Output".
3. **Stay independent.** Do not open `scripts/migration/30_audit_transfers.py`, any
   `transfer_audit*.json` or any HTML audit report.
4. **Every finding cites evidence** (the original Seafile path, the years, the link rows). A
   guess is labelled `"confidence": "low"`, never presented as fact.
5. **Report what you skip.** Records you cannot parse or judge are counted by reason in
   `findings.json` → `skipped`. Never drop records silently.
6. **Go through every record, not a sample.** All ~13,600 prod documents, every file in both
   manifests, every link row. The other audit only looked at course codes in folder paths and
   at offering years; it never read file titles. Going deeper than that, file by file, is the
   point of this audit (see question 10).

## Background you need

- **Old Burgieclan** was a Seafile file tree: students put files in folders, usually one folder
  per *subject*, often named like `H01C8A - Toegepaste Mechanica 2`. A subject folder often
  held files of several KU course codes (a course got renumbered, or two versions ran side by
  side), and folders went many levels deep.
- **New Burgieclan** (Symfony + Postgres) gives every document exactly **one course**
  (`document.course_id`). Courses are KU Leuven course codes (6 characters, e.g. `H01S4C`).
- **Course links:** `course_course(course_source, course_target)` means *source is the NEW
  course, target is the OLD course it replaced*. `course_identical_courses` is a symmetric
  "same course, other code" link, stored in both directions. The website only shows these as
  links; it never shows a linked course's documents or comments.
- **A KU code is a curriculum slot.** The same code with a new title or lecturer is still the
  same course. KU marks a real replacement with a new code or a new last letter
  (`H01P5A` → `H01P5B`). Two codes that KU offered in the *same* years are **parallel**
  courses (another programme or language), not old and new.
- **Academic years** are written `"2021 - 2022"`. Use the start year (2021) as the key.

## What happened, in order

| When | Step |
|---|---|
| 22–23 Aug 2026 | Seafile crawled; each file classified to a course (rules, then AI) → `manifest_final_for_import.jsonl` |
| 23 Aug | Photo series bundled into zips/PDFs, duplicates removed → `manifest_final_standardized_validated.json` |
| 23 Aug | Import into prod, from the later (bundled) manifest |
| 23–27 Aug | `scripts/migration/15_…`, `16_…`, `17_…`, `27_…` created historical courses and moved files between old and new courses by matching words in the path; links added |
| 27 Aug | `insert_missing_courses.sql`, `insert_remaining_historical_courses.sql`, `link_all_predecessors.sql` |
| 28 Aug | Prod snapshot without documents: `prod_dump_no_documents.sql` |
| 25 Oct | Wiki comments imported (`wiki_comments_import.json`); course links added on prod with no script in git |
| 30 Oct | Wiki documents imported (`wiki_documents_final_import_plan.json`) |
| Aug–Nov | 33 courses deleted on prod; not recorded anywhere |
| 6 Nov | Prod curriculum snapshot: `prod_curriculum_2026-11-06.sql` |
| 10 Nov | `link_predecessors_2.sql` and `fix_course_metadata_2.sql` run on prod |
| 18 Nov | Prod document export: `prod_documents_2026-11-18.csv` |

You may read the scripts in `scripts/migration/` (except rule 3) and `scripts/wiki_migration/`
to understand a step.

## Inputs (all under `migration_data/`)

| File | What it is |
|---|---|
| `prod_documents_2026-11-18.csv` | **Ground truth for today.** Every document on prod: `id, seafile_file_id, course_code, year, category_id, name, created_at`. `seafile_file_id` starting with `wiki:` = wiki import; empty = uploaded on the new site. One Seafile file may legitimately be on two courses. Names can contain newlines: use a CSV parser. |
| `prod_curriculum_2026-11-18.sql` if it exists, else `prod_curriculum_2026-11-06.sql` | pg_dump of `course`, `course_course`, `course_identical_courses`, `module`, `module_course`, `module_module`, `program`. Parse the `COPY … FROM stdin;` blocks (tab-separated, `\N` = null). With the 6 Nov file, also apply the INSERTs in `link_predecessors_2.sql`. |
| `manifest_final_standardized_validated.json` | The manifest the import read. Per file: original Seafile `repo_name`, `path`, `filename`, `file_id` (= `seafile_file_id`), `course_code` as imported, `year`, bundle info. |
| `manifest_final_standardized_validated.json` → `content_preview` | For 12,178 files: `page1_text` (text of the first page), `page_count`, `is_scanned_handwritten`, `source_type`. The first page often names the course, lecturer and exam date (`Examen RZL – 19/06/2024`). Use it as evidence alongside the titles. |
| `manifest_final_for_import.jsonl` | The earlier manifest: the first classification, before bundling and before scripts 16/17. |
| `prod_dump_no_documents.sql` | Prod on 28 Aug: courses and links, no documents. |
| `raw/course_offering_years.json` | `{code: [start years KU offered it]}` from the KU syllabus archive. **Covers only 2010–2025**: a year outside that range proves nothing. |
| `raw/burgieclan_courses.json` | Course export from 25 Oct. |
| `wiki_comments_import.json`, `wiki_documents_final_import_plan.json` | What the wiki imports put on which course. |
| `predecessor_review.md`, `review_decisions.json` | Earlier human review of predecessor links. |

## What to audit

Answer each question with data, and add anything else you find wrong.

1. **Files on the wrong course.** For every migrated document on prod, compare its course with
   its original Seafile path (codes and subject names in folder names, at every depth) and with
   the years its course was offered. Which files sit on a course the folder does not support,
   and which course would they belong on?
2. **Old and new mixed.** Which files are on a course that did not run in the file's year, while
   a linked or same-subject course did? Group by course pair.
3. **Moves after classification.** Compare the first manifest, the imported manifest and prod.
   For each file whose course changed, does its path justify the change? Which steps caused
   wrong moves?
4. **Course links.** For every `course_course` and `course_identical_courses` row: is it right?
   Look for parallel courses linked as predecessor, links in the wrong direction, pairs that are
   both predecessor and identical, cycles, and missing links between clearly related codes.
5. **Unreachable or empty courses.** Courses outside every module that hold material but have no
   successor or identical link (only search finds them). Current courses with no files whose
   predecessor has many.
6. **Deleted courses.** The codes in the 28 Aug snapshot but not in the curriculum file: where
   are the files they held now, and is that the right place?
7. **Missing files.** Files in the imported manifest that are not on prod.
8. **Years.** Suspicious year values, for example a large group of files that all got the same
   year.
9. **Wiki comments and wiki documents.** Are any on a course their wiki page title or year does
   not support?
10. **File titles, one by one.** Each migrated file has three names: the original Seafile
    `filename`, the cleaned-up `display_title` the migration gave it (partly written by AI), and
    the `name` it has on prod. For every file, read all three, plus `content_preview.page1_text`
    where it exists, and check them against the course it sits on, its stored year and its
    category. Lecturers are stored only as KU u-numbers (`course.professors`), so a lecturer's
    name in a title can only be matched against other files and folder names:
    - **Subject.** Does the title name another course: a code (`H01J2a`, `G0Q43A`), a subject
      or abbreviation (`E&P`, `IOV`, `Celbio`, `Sterkteleer 3`), a lecturer? Compare with the
      course name on prod, the folder name, and the names of linked courses.
    - **Year.** Does the title carry a date or academic year (`juni 2011`, `28Jun22`,
      `2017-2018`, a 10-digit Unix timestamp like `.1375541494`) that contradicts the stored
      `year`, or does it fill in a year that is missing? Big groups with one identical year
      (for example 198 files on H01O9A all set to 2021–2022) are suspicious.
    - **Category.** Does the title say exam, solution, summary, exercises, slides or notes
      (`examen`, `oplossing`, `samenvatting`, `oefenzitting`, `slides`) while the document has
      another `category_id`? The category ids and names are in the manifests
      (`category_id`, `category_name_nl`).
    - **Title quality.** Did the prod title lose information that was in the filename (a year, a
      part number, a student's name used as author, "oplossing"), or does it no longer say what
      the file is? Are several files on one course now indistinguishable by title?
    - **Duplicates.** The same title (or filename and size) on several courses or several times
      on one course, where that is not one of the legitimate two-course files.
    Report title findings in `files` with issue `title_names_other_course`, `title_year_conflict`,
    `title_category_conflict`, `title_lost_information` or `duplicate`, and quote the titles in
    `evidence`.

## Output

### `migration_data/gemini_audit/findings.json`

Exactly this shape, so it can be compared with the other audit by machine:

```json
{
  "generated_at": "2026-11-18T20:00:00+01:00",
  "inputs_used": ["prod_documents_2026-11-18.csv", "..."],
  "skipped": {"<reason>": 0},
  "files": [
    {
      "seafile_file_id": "84b5a1…",
      "prod_course": "H01A0B",
      "issue": "wrong_course | old_version_on_new_course | unjustified_move | missing_on_prod | bad_year | title_names_other_course | title_year_conflict | title_category_conflict | title_lost_information | duplicate | other",
      "titles": {"filename": "…", "display_title": "…", "prod_name": "…"},
      "proposed_course": "H01A0A or null",
      "proposed_year": "2014 - 2015 or null",
      "proposed_category_id": "null or an id",
      "confidence": "high | medium | low",
      "evidence": "path …/H01A0A - …/; file year 2015; H01A0B offered 2018–2025, H01A0A 2010–2017"
    }
  ],
  "links": [
    {
      "kind": "predecessor | identical",
      "new": "H0R12A",
      "old": "H01J7A",
      "issue": "parallel_not_predecessor | wrong_direction | also_identical | cycle | missing_link | other",
      "proposed": "keep | remove | make_identical | reverse | add",
      "confidence": "high | medium | low",
      "evidence": "both offered 2010–2025 …"
    }
  ],
  "courses": [
    {"code": "H01S0A", "issue": "orphan | empty_successor | deleted | other", "confidence": "high", "evidence": "…"}
  ],
  "comments": [
    {"course": "…", "issue": "…", "count": 0, "evidence": "…"}
  ],
  "open_questions": ["things a human must decide, one question each"]
}
```

For an identical link, put the two codes in `new`/`old` in alphabetical order. For a link that
should exist but does not, use `"issue": "missing_link"` with `"proposed": "add"`. A file on two
courses gets one entry per course.

### `migration_data/gemini_audit/REPORT.md`

A short summary for the maintainer: per question above, what you found (with counts), your
method in two or three sentences, and the ten findings you are most sure of. Plain language.

Finish by printing the number of entries per `issue` in `findings.json`.
