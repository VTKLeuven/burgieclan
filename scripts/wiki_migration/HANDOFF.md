# Wiki comment migration — handoff

Legacy `wiki.vtk.be` course reviews → `course_comment` on production (`liv`).

**Status: the pipeline is finished, tested, and passing. Nothing is imported yet.**
The remaining work is review and one command.

---

## State right now

`migration_data/wiki_comments_import.json` holds **9,785 comments across 427 courses**,
and `wiki_comments_import.sql` is generated from it. The audit reports **no blockers**.

| | |
|---|---|
| With a `[YYYY-YYYY]` prefix (year found in the text) | 6,290 |
| No prefix (year unknown; `created_at` is the wiki revision date) | 3,495 |
| Pages dropped, with a reason recorded | 404 |
| Duplicates removed | 257 |
| Oversize rows (>4000 chars), flagged not hidden | 170 |
| Year-conflict warnings | 243 |

This was verified end to end against the local dev database (same schema as production):
all comments round-tripped byte-for-byte (verified at 9,688 rows; re-verify after any rebuild), a second run inserted 0 rows, and the
rollback deleted exactly its own rows and nothing else.

---

## The one rule that matters

**Never present a guessed year as a fact.**

About a third of wiki bullets have no date anywhere. The only fallback is the page's
*last revision* timestamp, which is wrong for an old bullet on a recently-edited page.
Those rows therefore get **no `[YYYY-YYYY]` prefix** — only `created_at`, which is the
real revision timestamp and which the UI already renders (`CommentMetadata.tsx`).

Do not "improve" this by adding a prefix to every row. That was the original bug.

---

## Task 1 — review the report (do this first)

```bash
python3 -c "import json;r=json.load(open('migration_data/wiki_comments_report.json'));print(json.dumps(r['summary'],indent=2))"
```

Then look at `dropped_pages` in that file. The 404 drops are:

- **320** `course_code_not_in_burgieclan:<CODE>` — discontinued or renumbered courses.
  Some are genuine renumbers (`H03L5A`→`H03L5B`, `H09B9A`→`H09B9C`). To rescue one, add
  it to `scripts/wiki_migration/course_code_aliases.json` and re-run `build`.
- **62** `not_a_course_page_no_code_in_title` — meta pages (`Vaktemplate`, `Main_Page`,
  `Zürich - ETH Zürich`, people's names). Correct drops.
- **22** `no_section_headings` — empty stubs. Correct drops.

⚠️ **Do not add course-name matching.** It was tried and removed: over the real dump it
recovered *zero* legitimate pages while mapping `Ingenieur_en_bouwkunst (H04M7A)` onto the
unrelated `H01A0A`. Use the alias file instead — explicit and reviewable.

---

## Task 2 — year conflicts (optional, this is the LLM job)

243 comments contain a year in the body that differs from the year assigned to them.
**These are warnings, not blockers. The import is valid without touching any of them.**

Most are correct already — a review legitimately referencing another year, e.g.
`[Sinds 2019] Enkel meerkeuzevragen`. Only override where the assigned year is *wrong*.

```bash
# read them (add --json for machine-readable, --limit N to work in batches)
python3 scripts/wiki_migration/review_year_conflicts.py --json > /tmp/conflicts.json
```

Each entry has a `row_key`, the `assigned_year`, `year_source`, `source_heading`, the
other years found, and the body text. To correct one, write
`scripts/wiki_migration/year_overrides.json`:

```json
{
  "_comment": "row_key -> corrected academic year. Keys starting with _ are ignored.",
  "PUT_A_REAL_ROW_KEY_HERE": "2009-2010"
}
```

Use `row_key` values copied from the tool's output — the ones above are placeholders.

then re-run `build`. `row_key` is a hash of source page + category + body, so it survives
rebuilds. An override sets `year_source` to `manual_override` and adds the `[year]` prefix.

**How to judge a case:**

| Signal | Weight |
|---|---|
| `source_heading` names a session (`Juni 2010`, `Januari 2016`) | Strongest — usually already correct, leave it |
| Body opens with a year marker (`2019-2020:`, `'22-'23:`) | Strong |
| Year appears mid-sentence as an aside (`de wet van 2006`, `Tem. 2008 was...`) | Weak — usually NOT the review's year |

Belgian academic years run September→August, so **January or June 2016 → `2015-2016`**,
and September 2016 → `2016-2017`. A bare year is read as an exam session, i.e. `2023` →
`2022-2023`.

---

## Task 3 — import

```bash
python3 scripts/wiki_migration/extract_wiki_comments.py build    # only if you changed aliases/overrides
python3 scripts/wiki_migration/audit_wiki_comments.py            # MUST print PASS
python3 scripts/wiki_migration/import_wiki_comments.py sql

scp migration_data/wiki_comments_import.sql it@liv:/tmp/
ssh it@liv 'docker compose -f /opt/burgieclan/docker-compose.prod.yml exec -T db \
    psql -U burgieclan_db_user -d burgieclan_db -v ON_ERROR_STOP=1' < /tmp/wiki_comments_import.sql
```

The SQL is one transaction, it is idempotent (re-running inserts nothing), and it aborts
if any `course_id` or `category_id` does not exist. Rows are created by a dedicated
`wiki-migration` account with an unusable password, which is what makes the rollback exact:

```bash
# undo everything this import added, touching nothing a student wrote
ssh it@liv '...' < migration_data/wiki_comments_rollback.sql
```

Add `--skip-oversize` to the `sql` step to hold back the 170 long rows. My recommendation
is to import them: they are complete exam-question dumps for one session, numbered and
readable, and the length is inherent to the content.

---

## Rules for whoever picks this up

1. **Do not re-run `dump`** unless the wiki changed. `migration_data/raw/` is cached and
   gitignored; `build` is offline and repeatable. `dump` needs `WIKI_DB_PASSWORD` in the
   environment — the password is **not** in this repo and must never be committed.
2. **Never let the audit fail and import anyway.** It exists because the first attempt
   produced 5,510 comments that looked fine and were not.
3. **Do not delete rows to make the audit pass.** Fix the extractor, or record an override.
4. Wiki text is messier than it looks. Before changing a regex, check the real data in
   `migration_data/raw/wiki_pages.json`. Things already handled, learned the hard way:
   headings wrapped in bold (`'''==Titel`), unclosed headings, headings with a trailing
   aside (`===Juni 2014=== (niet meer relevant)`), `==>` as a student's arrow, `<A,B>` and
   `{|↑↑>` as maths rather than markup, `''''22-'23:'''` as bold plus a quoted year, and
   course codes written `(H05D3a)`, `(B-KUL-H9X53A)`, `(H04X3A/B)` or with the closing
   paren missing.
5. Category and exam session inherit **down the heading level tree**. Resetting on any
   unmapped heading silently orphaned every session after a stray sub-heading.

## Files

| File | Purpose |
|---|---|
| `extract_wiki_comments.py` | `dump` (SSH, cached) then `build` (offline) |
| `audit_wiki_comments.py` | Blockers + warnings; non-zero exit on a blocker |
| `review_year_conflicts.py` | Lists the 243 conflicts for review |
| `import_wiki_comments.py` | Generates the transactional SQL + rollback |
| `scripts/wiki_migration/course_code_aliases.json` | Old → current course code, by hand |
| `scripts/wiki_migration/year_overrides.json` | `row_key` → corrected academic year (create as needed) |
| `migration_data/wiki_comments_report.json` | Everything dropped, and why |

The four older `migration_data/wiki_comments_{extracted,structured,with_years,clean_separated}.json`
files are from a superseded attempt, are mutually inconsistent, and are read by nothing.
Delete them.
