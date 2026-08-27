# Agent brief: resolve the year conflicts in the wiki comment migration

For an agentic CLI (Antigravity / Gemini) with file and shell access, run from the repo
root `/home/jasperve/Documents/VTK/IT/burgieclan`. Paste everything below the line.

---

You are working in the Burgieclan repo. A migration pipeline moves ~9,700 student course
reviews from a legacy MediaWiki into the `course_comment` table. **The pipeline is
finished and its audit passes. Do not rebuild or redesign it.** Your job is one bounded
review task.

## Orient yourself first

```bash
cat scripts/wiki_migration/HANDOFF.md
python3 scripts/wiki_migration/audit_wiki_comments.py | tail -20
```

The audit prints `PASS`, then two warning classes. You are handling `year_conflicts`.

## The task

Every review is stamped with the academic year it describes. A checker flags each review
whose **body mentions a year different from the one assigned**. There are 243. Most are
FINE — a review may mention another year in passing. Find the genuinely mis-dated ones
and record corrections.

```bash
python3 scripts/wiki_migration/review_year_conflicts.py --json > /tmp/year_conflicts.json
```

Work through **all 243**. Batch them however suits your context, but apply identical rules
throughout — re-read the rules below at the start of each batch rather than recalling them.

## The academic year convention — the crux, get it right

Belgian academic years run September→August, written `YYYY-YYYY`:

- January 2016 → `2015-2016` (a January exam belongs to the year that began Sept 2015)
- June 2016 → `2015-2016`
- August or September 2016 → `2016-2017`
- A bare year with no month, e.g. "2023", is read as an exam session → `2022-2023`

Every year you write must be `YYYY-YYYY` with **consecutive** years. The build rejects
anything else.

## Weighing the evidence

| Signal | Weight |
|---|---|
| `year_source` is `session_heading` and `source_heading` names a session (`13 Juni 2025`, `Januari 2016`) | **Strongest.** The text was literally filed under that session. most of the are these. Almost always leave alone. |
| Body OPENS with a year marker (`2019-2020:`, `'22-'23:`) | Strong |
| A year mid-sentence as an aside (`de wet van 2006`, `said in 2018`, `Edit 2016:`) | **Weak.** Usually not the review's own year. |
| `year_source` is `revision_timestamp_fallback` | Guessed from the page's last edit. Override only on real body evidence. |

## You can read the original wiki page

This is why an agent beats a chat model here. When `body_truncated` is true, or the dating
is ambiguous, pull the full source:

```bash
python3 -c "
import json,sys
pages={p['title']:p.get('text','') for p in json.load(open('migration_data/raw/wiki_pages.json'))}
print(pages[sys.argv[1]])" 'Total_Quality_Management_(H00N6A)'
```

Surrounding bullets frequently date a review that looks undatable in isolation — a
neighbouring bullet reading `Was er in 2018-2019 een taak?` pins down the one above it.
**Use this before declaring anything uncertain.**

## Two worked examples from this dataset

**Leave alone.** `4b088368fc9c`, assigned `2024-2025`, source `session_heading`, heading
`13 Juni 2025`, body: *"Question 1 of 23 June 2023 … Question 1 of 05 June 2015"*.
→ The June 2025 paper reusing older questions. The heading wins. No override.

**Investigate, don't guess.** `50835cc05176`, assigned `2017-2018`, source
`explicit_bare_year`, generic "Examen" heading, body: *"…adding a paper-assignment for
next year ( said in 2018 ). Edit 2016: Geen taak meer."* → "said in 2018" is an aside and
"Edit 2016" is a later annotation by a different student. Read the raw page before
deciding; if it stays unrecoverable, mark it uncertain rather than inventing a year.

## Record your decisions

Write **only the corrections** to `scripts/wiki_migration/year_overrides.json`:

```json
{
  "_comment": "Reviewed <date>. row_key -> corrected academic year.",
  "4b088368fc9c": "2019-2020"
}
```

Keys beginning with `_` are ignored. Also write your reasoning to
`migration_data/year_review_notes.md` — one line per override quoting the words that
justify it, plus the ones you judged uncertain and why. That file is gitignored; it is for
the human reviewing your work.

## Verify — you must close this loop

```bash
python3 scripts/wiki_migration/extract_wiki_comments.py build
python3 scripts/wiki_migration/audit_wiki_comments.py
```

`build` prints a line like:

```
year overrides: 47/48 matched a comment
  WARNING: 1 override key(s) matched NO comment and had no effect: deadbeef1234
```

**If that WARNING appears you invented a `row_key`.** Find it, remove or fix it, and
re-check the rest of that batch — a fabricated key means the batch is unreliable.

Done when: the audit prints `PASS`, `year overrides: N/N matched` with both numbers equal,
and `year_conflicts` in the audit has dropped by roughly the number you corrected.

## Hard boundaries

1. **Never run `extract_wiki_comments.py dump`.** It hits the production wiki and needs a
   password that is not in this repo. The dump is already cached in `migration_data/raw/`.
2. **Never connect to `liv`** and never run any import. The human does that.
3. **Do not edit the pipeline logic** — `clean_wikitext`, `CATEGORY_RULES`, `HEADING_RE`,
   `extract_year`, or the audit's checks. They encode fixes for real, hard-won edge cases
   (headings wrapped in bold markup, `==>` as a student's arrow, `<A,B>` as maths, course
   codes written `(B-KUL-H9X53A)` or `(H04X3A/B)`). This task needs no code change. If you
   believe you have found a genuine pipeline bug, **report it, do not fix it.**
4. **Never loosen the audit to make something pass.** It exists because an earlier attempt
   produced 5,510 comments that looked fine and were not.
5. **Do not delete or edit comment text.** You are judging dates only.
6. **Never `git add` anything under `migration_data/`** — it is student-written content and
   is gitignored wholesale. Commit only `year_overrides.json`, and only if asked.

## Judgement, not throughput

Leaving a review alone is the correct answer for most of them, and far more should be
left alone than corrected. A confident wrong year is worse than an unchanged one: the
`[YYYY-YYYY]` prefix is shown to students as a fact, so it must never be a guess. Do not
manufacture corrections to look productive, and do not lower your confidence bar to finish
a batch.
