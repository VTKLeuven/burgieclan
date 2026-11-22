<?php

namespace App\Service\Exchange;

use App\Constants\ExchangeProgram;
use App\Entity\AthensCourse;
use App\Entity\AthensUniversity;
use Doctrine\ORM\EntityManagerInterface;
use InvalidArgumentException;
use JsonException;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * The faculty's ATHENS course catalogue, kept in resources/athens/catalogue.json (see the README
 * there for the yearly update), and its import into the database.
 *
 * The catalogue changes every year, and so do the course codes now and then. import() matches each
 * course of the file to one in the database, at the same university:
 *
 * 1. the same code, with a title that is (nearly) the same: a typo fixed is still the same course;
 * 2. otherwise the same title under another code: the course was renumbered;
 * 3. otherwise it is new.
 *
 * Courses of the database that the file no longer has become inactive: hidden on the site, with
 * their reviews and everyone's stars kept. When they come back in a later catalogue, they are
 * matched again and show up with all of it.
 */
class AthensCatalogue
{
    /** similar_text() percentage above which two titles under the same code are one course. */
    private const SAME_TITLE = 60.0;

    /** @var array<string, mixed>|null */
    private ?array $catalogue = null;

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        #[Autowire('%kernel.project_dir%/resources/athens/catalogue.json')]
        private readonly string $path,
    ) {}

    /**
     * The catalogue file, checked. Throws InvalidArgumentException listing what is wrong.
     *
     * @return array{
     *     edition: string,
     *     published: string,
     *     source: string,
     *     sessions: list<array<string, string>>,
     *     universities: array<string, array{name: string, city: string, country: string, registerNames: list<string>}>,
     *     courses: list<array{code: string, university: string, title: string, evaluation: string, programs: list<string>}>
     * }
     */
    public function read(?string $path = null): array
    {
        if (null === $path && null !== $this->catalogue) {
            return $this->catalogue;
        }

        $file = $path ?? $this->path;
        $json = is_file($file) ? file_get_contents($file) : false;
        if (false === $json) {
            throw new InvalidArgumentException(sprintf('Cannot read %s.', $file));
        }
        try {
            $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new InvalidArgumentException(sprintf('%s is not valid JSON: %s', $file, $exception->getMessage()));
        }
        $catalogue = self::validate(is_array($data) ? $data : []);
        if (null === $path) {
            $this->catalogue = $catalogue;
        }

        return $catalogue;
    }

    /**
     * Brings the database in line with the catalogue. With $dryRun nothing is stored.
     *
     * @param array{edition: string, universities: array<string, array{name: string, city: string, country: string}>, courses: list<array{code: string, university: string, title: string, evaluation: string, programs: list<string>}>} $catalogue
     *
     * @return array{added: list<string>, returned: list<string>, updated: list<string>, hidden: list<string>, unchanged: int}
     */
    public function import(array $catalogue, bool $dryRun = false): array
    {
        $result = ['added' => [], 'returned' => [], 'updated' => [], 'hidden' => [], 'unchanged' => 0];
        $edition = $catalogue['edition'];

        $universities = [];
        foreach ($this->entityManager->getRepository(AthensUniversity::class)->findAll() as $university) {
            $universities[$university->getSlug()] = $university;
        }
        foreach ($catalogue['universities'] as $slug => $fields) {
            $university = $universities[$slug] ?? new AthensUniversity($slug);
            $university->setName($fields['name'])->setCity($fields['city'])->setCountry($fields['country']);
            $this->entityManager->persist($university);
            $universities[$slug] = $university;
        }

        /** @var array<string, list<AthensCourse>> $existing by university slug */
        $existing = [];
        foreach ($this->entityManager->getRepository(AthensCourse::class)->findAll() as $course) {
            $existing[$course->getUniversity()->getSlug()][] = $course;
        }

        $entries = $catalogue['courses'];
        /** @var array<int, AthensCourse> $matches entry index => course */
        $matches = [];
        $claimed = [];
        $claim = static function (int $index, AthensCourse $course) use (&$matches, &$claimed): void {
            $matches[$index] = $course;
            $claimed[spl_object_id($course)] = true;
        };

        // 1. Same code, (nearly) the same title.
        foreach ($entries as $index => $entry) {
            foreach ($existing[$entry['university']] ?? [] as $course) {
                if (
                    !isset($claimed[spl_object_id($course)]) && $course->getCode() === $entry['code']
                    && self::similarity($course->getTitle(), $entry['title']) >= self::SAME_TITLE
                ) {
                    $claim($index, $course);
                    break;
                }
            }
        }
        // 2. Same title under another code; with several, the one evaluated the same way.
        foreach ($entries as $index => $entry) {
            if (isset($matches[$index])) {
                continue;
            }
            $candidates = array_values(
                array_filter(
                    $existing[$entry['university']] ?? [],
                    static fn (AthensCourse $course): bool => !isset($claimed[spl_object_id($course)])
                    && self::normalize($course->getTitle()) === self::normalize($entry['title'])
                )
            );
            if ([] === $candidates) {
                continue;
            }
            usort($candidates, static fn (AthensCourse $a, AthensCourse $b): int => ($b->getEvaluation() === $entry['evaluation']) <=> ($a->getEvaluation() === $entry['evaluation']));
            $claim($index, $candidates[0]);
        }

        // 3. The rest is new.
        foreach ($entries as $index => $entry) {
            $course = $matches[$index] ?? null;
            $label = sprintf('%s · %s (%s)', $entry['code'], $entry['title'], $entry['university']);
            if (null === $course) {
                $course = (new AthensCourse($universities[$entry['university']]))->setFirstEdition($edition);
                $this->entityManager->persist($course);
                $result['added'][] = $label;
            } elseif (!$course->isActive()) {
                $result['returned'][] = $label;
            } elseif (
                $course->getCode() !== $entry['code'] || $course->getTitle() !== $entry['title']
                || $course->getEvaluation() !== $entry['evaluation'] || $course->getPrograms() !== $entry['programs']
            ) {
                $result['updated'][] = $label;
            } else {
                ++$result['unchanged'];
            }

            $course
                ->setCode($entry['code'])
                ->setTitle($entry['title'])
                ->setEvaluation($entry['evaluation'])
                ->setPrograms($entry['programs'])
                ->setActive(true)
                ->setLastEdition($edition);
        }

        foreach ($existing as $courses) {
            foreach ($courses as $course) {
                if (!isset($claimed[spl_object_id($course)]) && $course->isActive()) {
                    $course->setActive(false);
                    $result['hidden'][] = sprintf('%s · %s (%s)', $course->getCode(), $course->getTitle(), $course->getUniversity()->getSlug());
                }
            }
        }

        if ($dryRun) {
            $this->entityManager->clear();
        } else {
            $this->entityManager->flush();
        }

        return $result;
    }

    /** Lower case, without accents or punctuation: "Conception et Réhabilitation d’Éco-Quartiers" = "conception et rehabilitation d eco quartiers". */
    public static function normalize(string $title): string
    {
        $ascii = transliterator_transliterate('Any-Latin; Latin-ASCII; Lower()', $title);
        $ascii = false === $ascii ? mb_strtolower($title) : $ascii;

        return trim((string) preg_replace('/[^a-z0-9]+/', ' ', $ascii));
    }

    private static function similarity(string $a, string $b): float
    {
        similar_text(self::normalize($a), self::normalize($b), $percent);

        return $percent;
    }

    /**
     * @param array<mixed> $data
     *
     * @return array{
     *     edition: string,
     *     published: string,
     *     source: string,
     *     sessions: list<array<string, string>>,
     *     universities: array<string, array{name: string, city: string, country: string, registerNames: list<string>}>,
     *     courses: list<array{code: string, university: string, title: string, evaluation: string, programs: list<string>}>
     * }
     */
    private static function validate(array $data): array
    {
        $problems = [];

        $edition = $data['edition'] ?? null;
        if (!is_string($edition) || 1 !== preg_match('/^(\d{4})-(\d{4})$/', $edition, $years) || (int) $years[2] !== (int) $years[1] + 1) {
            $problems[] = '"edition" must be an academic year like "2026-2027".';
            $edition = '';
        }
        $published = is_string($data['published'] ?? null) ? $data['published'] : '';
        $source = is_string($data['source'] ?? null) ? $data['source'] : '';
        if ('' !== $source && !str_starts_with($source, 'https://')) {
            $problems[] = '"source" must be an https:// address.';
        }

        $sessions = [];
        foreach (is_array($data['sessions'] ?? null) ? $data['sessions'] : [] as $index => $session) {
            $start = is_array($session) ? ($session['start'] ?? null) : null;
            $end = is_array($session) ? ($session['end'] ?? null) : null;
            if (!is_string($start) || !is_string($end) || 1 !== preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) || 1 !== preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
                $problems[] = sprintf('Session %d needs a "start" and an "end" date (YYYY-MM-DD).', $index + 1);
                continue;
            }
            $kept = ['start' => $start, 'end' => $end];
            foreach (['deadline' => '/^\d{4}-\d{2}-\d{2}$/', 'registrationOpens' => '/^\d{4}-\d{2}$/'] as $key => $pattern) {
                if (isset($session[$key])) {
                    if (!is_string($session[$key]) || 1 !== preg_match($pattern, $session[$key])) {
                        $problems[] = sprintf('Session %d: "%s" has the wrong format.', $index + 1, $key);
                        continue;
                    }
                    $kept[$key] = $session[$key];
                }
            }
            $sessions[] = $kept;
        }

        $universities = [];
        foreach (is_array($data['universities'] ?? null) ? $data['universities'] : [] as $slug => $university) {
            $name = is_array($university) ? ($university['name'] ?? null) : null;
            $city = is_array($university) ? ($university['city'] ?? null) : null;
            $country = is_array($university) ? ($university['country'] ?? null) : null;
            if (
                !is_string($slug) || 1 !== preg_match('/^[a-z0-9-]{2,60}$/', $slug) || !is_string($name) || '' === trim($name)
                || !is_string($city) || '' === trim($city) || !is_string($country) || 1 !== preg_match('/^[A-Z]{2}$/', $country)
            ) {
                $problems[] = sprintf('University "%s" needs a slug (a-z, 0-9, -), a name, a city and a two-letter country code.', is_string($slug) ? $slug : '?');
                continue;
            }
            $registerNames = is_array($university['registerNames'] ?? null) ? $university['registerNames'] : [];
            $universities[$slug] = [
                'name' => trim($name),
                'city' => trim($city),
                'country' => $country,
                // How the ATHENS registration platform writes the name, when it differs (AthensRegister).
                'registerNames' => array_values(array_filter($registerNames, static fn (mixed $alias): bool => is_string($alias) && '' !== trim($alias))),
            ];
        }

        $programs = array_map(static fn (ExchangeProgram $program): string => $program->value, ExchangeProgram::cases());
        $courses = [];
        $seen = [];
        foreach (is_array($data['courses'] ?? null) ? $data['courses'] : [] as $index => $course) {
            $fields = [];
            foreach (['code' => 40, 'university' => 60, 'title' => 255, 'evaluation' => 80] as $field => $max) {
                $value = is_array($course) ? ($course[$field] ?? null) : null;
                $fields[$field] = is_string($value) ? trim($value) : '';
                if ('' === $fields[$field] || mb_strlen($fields[$field]) > $max) {
                    $problems[] = sprintf('Course %d: "%s" is missing or longer than %d characters.', $index + 1, $field, $max);
                }
            }
            if ('' !== $fields['university'] && !isset($universities[$fields['university']])) {
                $problems[] = sprintf('Course %s: unknown university "%s".', $fields['code'], $fields['university']);
            }
            $advice = is_array($course) && is_array($course['programs'] ?? null) ? $course['programs'] : null;
            if (null === $advice || [] !== array_diff($advice, $programs)) {
                $problems[] = sprintf('Course %s: "programs" must be a list of programme codes (%s).', $fields['code'], implode(', ', $programs));
                $advice = [];
            }
            $key = $fields['university'] . ' ' . $fields['code'];
            if (isset($seen[$key])) {
                $problems[] = sprintf('Course %s appears twice at %s.', $fields['code'], $fields['university']);
            }
            $seen[$key] = true;
            // In the order of ExchangeProgram, so a reordered list is no change.
            $fields['programs'] = array_values(array_intersect($programs, $advice));
            $courses[] = $fields;
        }
        if ([] === $courses) {
            $problems[] = 'The catalogue has no courses.';
        }

        if ([] !== $problems) {
            throw new InvalidArgumentException("The ATHENS catalogue has problems:\n- " . implode("\n- ", array_slice($problems, 0, 30)));
        }

        return [
            'edition' => (string) $edition,
            'published' => $published,
            'source' => $source,
            'sessions' => $sessions,
            'universities' => $universities,
            'courses' => $courses,
        ];
    }
}
