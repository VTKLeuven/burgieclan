# The ATHENS catalogue

`catalogue.json` is the faculty's ATHENS course catalogue: the PDF on
<https://eng.kuleuven.be/en/study/internationalisation/athens/athens_applicationprocedure>
("This list contains all course advices for your study field"), turned into data. Burgieclan's ATHENS tab
(`/exchange/athens`) shows these courses, with reviews and everyone's private stars.

`app:exchange:import-athens` loads the file into the database. Every deploy runs it, and running it twice
changes nothing.

## The yearly update

The faculty publishes a new PDF before the November session, usually in September. To bring it in:

1. Download the new PDF. Its address is linked from the application procedure page above.
2. Turn it into text, keeping the columns:

   ```bash
   pdftotext -layout 2027xxxx-athens-course-catalogue.pdf /tmp/catalogue.txt
   ```

3. Let the script rewrite the courses (run it from this directory; edition = the academic year, published =
   the date in the PDF's filename):

   ```bash
   python3 catalogue_from_pdf.py /tmp/catalogue.txt catalogue.json \
       --edition 2027-2028 --published 2027-09-06 \
       --source https://eng.kuleuven.be/en/study/internationalisation/athens/2027xxxx-athens-course-catalogue.pdf \
       > /tmp/new.json && mv /tmp/new.json catalogue.json
   ```

   If it stops on an unknown university, add it to `universities` (see below), or add the spelling the PDF
   uses to the `sourceNames` of the university it already has. If it stops on a line it cannot read,
   pdftotext probably glued two columns together: fix that line in the text file and run it again.

4. Update `sessions` by hand from the practical info page
   (<https://eng.kuleuven.be/en/study/internationalisation/athens/athens-practical-info-for-kuleuven-students>).
5. See what would change, and read through the lists:

   ```bash
   docker compose exec -T backend php bin/console app:exchange:import-athens --dry-run
   ```

   Look closely at "Hidden" next to "New": if a course shows up in both under a different name, it was not
   recognised and would lose its reviews. Fix the title in `catalogue.json` so it matches (see below), or
   accept that it is really another course.

6. Commit `catalogue.json`. The next deploy imports it. Locally, run the command without `--dry-run`.

The PDF is not stored in the repository.

## The registration platform (`register.json`)

The ATHENS network's registration platform (<https://register.athensnetwork.eu/courses>) lists the courses of
the session that is open now, each with a page of its own: what it is about, the programme of the week, the
exam, the professors, and the European Dimension activities around it. `register.json` is that list as last
read, with for every course the catalogue course it is (`match`) and, for those, the page (`info`). The
ATHENS tab links each course to its page, shows the information, and filters on "on the list" or "not on it".

The platform only shows one session at a time, so read it again whenever a new list goes up (September for
November, January for March):

```bash
docker compose exec -T backend php bin/console app:exchange:scrape-athens-register --dry-run -v
docker compose exec -T backend php bin/console app:exchange:scrape-athens-register
```

It fetches one page at a time with a short pause, so it takes a minute or two. Then read the list "Not in the
catalogue": the courses of KU Leuven itself belong there, and so does a course the faculty gave no advice
for. If the platform names a university differently than `catalogue.json` does, add that name to the
university's `registerNames` there and scrape again. Commit `register.json`; `app:exchange:import-athens`
(every deploy) copies it onto the courses. A course that is not on the new list keeps the information it had,
and its page says when it was last on the list.

A course is recognised at the same university by the same code (spaces, a "BIP" suffix and remarks in
brackets aside) with a title that is nearly the same or shares words with it, or else by a nearly identical
title under another code. A code alone is not enough: the platform reuses codes for other courses.

## How courses are matched

For each course in the file, the import looks for one in the database at the same university:

1. the same code, with a title that is (nearly) the same, so fixing a typo keeps it the same course;
2. otherwise the same title under another code, because codes get renumbered;
3. otherwise it is a new course.

Courses in the database that the file no longer has are **hidden, not deleted**. Their reviews and stars
stay, and when the course comes back in a later catalogue it gets them back. Do not remove courses from the
database by hand.

Courses with the same title at the same university under different codes (one for November, one for March,
or a BIP version) are separate courses, each with its own reviews.

## The format

```jsonc
{
  "edition": "2026-2027",           // academic year of the catalogue
  "published": "2026-09-07",        // date of the PDF
  "source": "https://…pdf",         // link to the PDF, shown on the site
  "sessions": [                     // upcoming ATHENS weeks; the site shows the ones not over yet
    {"start": "2027-03-13", "end": "2027-03-20", "registrationOpens": "2027-01"},
    {"start": "2026-11-14", "end": "2026-11-21", "deadline": "2026-09-21"}
  ],
  "universities": {                 // slug => university; the slug must never change
    "upm": {"name": "Universidad Politécnica de Madrid", "city": "Madrid", "country": "ES", "sourceNames": ["UPMadrid"],
            "registerNames": ["Universidad Politecnica de Madrid"]}   // optional: the name on the registration platform
  },
  "courses": [                      // programs = the programmes with a positive advice (ExchangeProgram codes)
    {"code": "UPM188", "university": "upm", "title": "Accessible Digital Home", "evaluation": "Oral presentation", "programs": ["ARCH", "BMT"]}
  ]
}
```

City names are in Dutch, like the Erasmus destinations. A university whose `name` matches an Erasmus
destination exactly links to that destination's page.

The advice columns of the PDF map onto programme codes in `COLUMNS` in `catalogue_from_pdf.py`. If the
faculty adds a master, add it there and to `App\Constants\ExchangeProgram`.
