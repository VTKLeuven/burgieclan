<?php

namespace App\Service\Exchange;

use App\Entity\AthensCourse;
use Dom\Element;
use Dom\HTMLDocument;
use Dom\Node;
use Dom\Text;
use Doctrine\ORM\EntityManagerInterface;
use InvalidArgumentException;
use JsonException;
use RuntimeException;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpClientException;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * The ATHENS network's registration platform (register.athensnetwork.eu), where students sign up.
 * Its course list shows only the session that is open now ("Current courses for November 2026"),
 * and every course there has a page of its own with what the catalogue PDF leaves out: what it is
 * about, the programme of the week, the exam, the professors, the activities around it.
 *
 * scrape() reads that list and every course page, and recognises each course in the faculty's
 * catalogue (catalogue.json). The result is kept in resources/athens/register.json, so what the
 * site shows is in the repository and reviewable like the catalogue. apply() copies it onto the
 * AthensCourse rows: the link, the information, and whether the course is on the list now. The
 * import command runs apply() on every deploy; scraping again is done by hand when a new session
 * opens (see the README there).
 *
 * @phpstan-type RegisterCourse array{id: int, code: string, title: string, institution: string, match: array{university: string, code: string}|null, info?: array<string, mixed>}
 * @phpstan-type Snapshot array{session: string, fetched: string, source: string, courses: list<RegisterCourse>}
 */
class AthensRegister
{
    public const BASE_URL = 'https://register.athensnetwork.eu';

    /** similar_text() percentage above which two titles under the same code are one course. */
    private const SAME_TITLE = 60.0;

    /** Above this, two titles at the same university are one course even under another code. */
    private const RENUMBERED_TITLE = 85.0;

    /** Between two course pages, to go easy on the platform. */
    private const PAUSE_MICROSECONDS = 250_000;

    private const MONTHS = [
        'january' => 1, 'february' => 2, 'march' => 3, 'april' => 4, 'may' => 5, 'june' => 6,
        'july' => 7, 'august' => 8, 'september' => 9, 'october' => 10, 'november' => 11, 'december' => 12,
    ];

    /** The labels of a course page, and the key each is kept under. Rich text fields are marked true. */
    private const FIELDS = [
        'Type of Course' => ['type', false],
        'Language of Tuition' => ['language', false],
        'Minimum Year of Study' => ['minimumYear', false],
        'Location' => ['location', false],
        'Address' => ['address', false],
        'City' => ['city', false],
        'Professor Responsible' => ['professors', false],
        'Participating professors' => ['otherProfessors', false],
        'Prerequisites' => ['prerequisites', true],
        'Objectives' => ['objectives', true],
        'Programme to be Followed' => ['programme', true],
        'Course Exam' => ['exam', true],
        'EDA Estimated Start Time' => ['activitiesStart', false],
        'Cost of EDA' => ['activitiesCost', false],
        'EDA Content' => ['activities', true],
    ];

    /** @var Snapshot|null */
    private ?array $snapshot = null;

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly EntityManagerInterface $entityManager,
        #[Autowire('%kernel.project_dir%/resources/athens/register.json')]
        private readonly string $path,
        private readonly int $pause = self::PAUSE_MICROSECONDS,
    ) {}

    public static function courseUrl(int $id): string
    {
        return sprintf('%s/courses/%d', self::BASE_URL, $id);
    }

    /**
     * The course list of the platform and every course page, recognised in the catalogue.
     *
     * @param array{universities: array<string, array{name: string, registerNames: list<string>}>, courses: list<array{code: string, university: string, title: string}>} $catalogue
     * @param (callable(int $done, int $total): void)|null                                                                                                                       $progress
     *
     * @return Snapshot
     *
     * @throws RuntimeException when the platform cannot be read or looks different than expected
     */
    public function scrape(array $catalogue, ?callable $progress = null, string $today = 'today'): array
    {
        $list = HTMLDocument::createFromString($this->get(self::BASE_URL . '/courses'), LIBXML_NOERROR);
        $session = self::session((string) $list->querySelector('h2')?->textContent);
        if (null === $session) {
            throw new RuntimeException('The course list of the ATHENS platform has no "Current courses for <month> <year>" heading any more.');
        }

        $ids = [];
        foreach ($list->querySelectorAll('[data-bs-target^="#accordion-"]') as $button) {
            if (1 === preg_match('/^#accordion-(\d+)-collapse$/', (string) $button->getAttribute('data-bs-target'), $match)) {
                $ids[(int) $match[1]] = true;
            }
        }
        if ([] === $ids) {
            throw new RuntimeException('Found no courses on the course list of the ATHENS platform.');
        }

        $pages = [];
        $done = 0;
        foreach (array_keys($ids) as $id) {
            if ($done > 0 && $this->pause > 0) {
                usleep($this->pause);
            }
            $pages[] = self::parseCourse($id, $this->get(self::courseUrl($id)));
            if (null !== $progress) {
                $progress(++$done, count($ids));
            }
        }

        $matches = self::match($pages, $catalogue);
        $courses = [];
        foreach ($pages as $index => $page) {
            $course = ['id' => $page['id'], 'code' => $page['code'], 'title' => $page['title'], 'institution' => $page['institution'], 'match' => $matches[$index] ?? null];
            // Only the courses that count for a KU Leuven student keep their whole page.
            if (null !== $course['match']) {
                $course['info'] = $page['info'];
            }
            $courses[] = $course;
        }
        usort($courses, static fn (array $a, array $b): int => strnatcasecmp($a['code'], $b['code']) ?: $a['id'] <=> $b['id']);

        return [
            'session' => $session,
            'fetched' => (new \DateTimeImmutable($today))->format('Y-m-d'),
            'source' => self::BASE_URL . '/courses',
            'courses' => $courses,
        ];
    }

    /** The snapshot as it is written to register.json: readable, and one key per line so a diff shows what changed. */
    public static function dump(array $snapshot): string
    {
        return json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
    }

    public function path(): string
    {
        return $this->path;
    }

    /**
     * register.json, or null when there is none (yet).
     *
     * @return Snapshot|null
     *
     * @throws InvalidArgumentException when it is there but not readable
     */
    public function read(?string $path = null): ?array
    {
        if (null === $path && null !== $this->snapshot) {
            return $this->snapshot;
        }
        $file = $path ?? $this->path;
        if (!is_file($file)) {
            return null;
        }
        try {
            $data = json_decode((string) file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new InvalidArgumentException(sprintf('%s is not valid JSON: %s', $file, $exception->getMessage()));
        }
        if (
            !is_array($data) || !is_string($data['session'] ?? null) || 1 !== preg_match('/^\d{4}-\d{2}$/', $data['session'])
            || !is_string($data['fetched'] ?? null) || !is_array($data['courses'] ?? null)
        ) {
            throw new InvalidArgumentException(sprintf('%s needs a "session" (YYYY-MM), a "fetched" date and a list of "courses".', $file));
        }

        $courses = [];
        foreach ($data['courses'] as $course) {
            if (!is_array($course) || !is_int($course['id'] ?? null) || !is_string($course['code'] ?? null)) {
                throw new InvalidArgumentException(sprintf('%s: every course needs an "id" and a "code".', $file));
            }
            $match = $course['match'] ?? null;
            $courses[] = [
                'id' => $course['id'],
                'code' => $course['code'],
                'title' => is_string($course['title'] ?? null) ? $course['title'] : '',
                'institution' => is_string($course['institution'] ?? null) ? $course['institution'] : '',
                'match' => is_array($match) && is_string($match['university'] ?? null) && is_string($match['code'] ?? null)
                    ? ['university' => $match['university'], 'code' => $match['code']]
                    : null,
                'info' => is_array($course['info'] ?? null) ? $course['info'] : [],
            ];
        }

        $snapshot = [
            'session' => $data['session'],
            'fetched' => $data['fetched'],
            'source' => is_string($data['source'] ?? null) ? $data['source'] : self::BASE_URL . '/courses',
            'courses' => $courses,
        ];
        if (null === $path) {
            $this->snapshot = $snapshot;
        }

        return $snapshot;
    }

    /**
     * Copies the snapshot onto the courses: the courses it recognised get their page and are marked
     * as on the list; every other course is no longer on it, but keeps the page it had, which
     * still describes it.
     *
     * @param Snapshot $snapshot
     *
     * @return array{linked: int, unknown: list<string>}
     */
    public function apply(array $snapshot, bool $dryRun = false): array
    {
        /** @var array<string, AthensCourse> $byCode "slug code" => course, the active one first */
        $byCode = [];
        $all = $this->entityManager->getRepository(AthensCourse::class)->findBy([], ['active' => 'ASC']);
        foreach ($all as $course) {
            $byCode[$course->getUniversity()->getSlug() . ' ' . $course->getCode()] = $course;
        }

        $linked = [];
        $unknown = [];
        foreach ($snapshot['courses'] as $entry) {
            if (null === $entry['match']) {
                continue;
            }
            $course = $byCode[$entry['match']['university'] . ' ' . $entry['match']['code']] ?? null;
            if (null === $course) {
                $unknown[] = sprintf('%s · %s → %s %s', $entry['code'], $entry['title'], $entry['match']['university'], $entry['match']['code']);
                continue;
            }
            $course
                ->setRegisterId($entry['id'])
                ->setRegisterInfo(['session' => $snapshot['session'], 'fetched' => $snapshot['fetched']] + ($entry['info'] ?? []))
                ->setOnRegister(true);
            $linked[spl_object_id($course)] = true;
        }
        foreach ($all as $course) {
            if (!isset($linked[spl_object_id($course)]) && $course->isOnRegister()) {
                $course->setOnRegister(false);
            }
        }

        if ($dryRun) {
            $this->entityManager->clear();
        } else {
            $this->entityManager->flush();
        }

        return ['linked' => count($linked), 'unknown' => $unknown];
    }

    /**
     * Which catalogue course each register course is, at the same university: the same code with a
     * title that is (nearly) the same or shares words with it, else a (nearly) identical title
     * under another code. A code alone is not enough: the platform reuses them ("IST11" is another
     * course there than in the catalogue).
     *
     * @param list<array{code: string, title: string, institution: string}>                                                                                                     $pages
     * @param array{universities: array<string, array{name: string, registerNames: list<string>}>, courses: list<array{code: string, university: string, title: string}>} $catalogue
     *
     * @return array<int, array{university: string, code: string}> page index => catalogue course
     */
    public static function match(array $pages, array $catalogue): array
    {
        $slugByName = [];
        foreach ($catalogue['universities'] as $slug => $university) {
            foreach ([$university['name'], ...$university['registerNames']] as $name) {
                $slugByName[AthensCatalogue::normalize($name)] = $slug;
            }
        }
        /** @var array<string, list<int>> $bySlug catalogue indexes per university */
        $bySlug = [];
        foreach ($catalogue['courses'] as $index => $course) {
            $bySlug[$course['university']][] = $index;
        }

        $result = [];
        $claimed = [];
        $passes = [
            // The same code, written the same way.
            static fn (array $page, array $course): bool => self::compactCode($page['code']) === self::compactCode($course['code']) && self::sameCourse($page['title'], $course['title']),
            // The same code with or without "BIP" (the blended version of a course).
            static fn (array $page, array $course): bool => self::baseCode($page['code']) === self::baseCode($course['code']) && self::sameCourse($page['title'], $course['title']),
            // Renumbered.
            static fn (array $page, array $course): bool => self::similarity($page['title'], $course['title']) >= self::RENUMBERED_TITLE,
        ];
        foreach ($passes as $pass) {
            foreach ($pages as $index => $page) {
                $slug = $slugByName[AthensCatalogue::normalize($page['institution'])] ?? null;
                if (isset($result[$index]) || null === $slug) {
                    continue;
                }
                foreach ($bySlug[$slug] ?? [] as $candidate) {
                    $course = $catalogue['courses'][$candidate];
                    if (!isset($claimed[$candidate]) && $pass($page, $course)) {
                        $result[$index] = ['university' => $slug, 'code' => $course['code']];
                        $claimed[$candidate] = true;
                        break;
                    }
                }
            }
        }
        ksort($result);

        return $result;
    }

    /**
     * One course page: its code, title and university, and the rest as "info".
     *
     * @return array{id: int, code: string, title: string, institution: string, info: array<string, mixed>}
     */
    public static function parseCourse(int $id, string $html): array
    {
        $document = HTMLDocument::createFromString($html, LIBXML_NOERROR);
        $values = [];
        foreach ($document->querySelectorAll('dl dt') as $label) {
            $value = $label->nextElementSibling;
            if (null !== $value && 'dd' === strtolower($value->localName)) {
                $values[trim((string) $label->textContent)] = $value;
            }
        }
        $plain = static fn (string $label): string => isset($values[$label]) ? self::plainText($values[$label]) : '';

        $info = ['session' => self::session($plain('Session'))];
        foreach (self::FIELDS as $label => [$key, $rich]) {
            $info[$key] = isset($values[$label]) ? ($rich ? self::richText($values[$label]) : self::plainText($values[$label])) : '';
        }
        // "0", "0 EUR" or "-" all mean that the activities are free, or that nobody filled it in.
        if (1 === preg_match('/^(-|0+([.,]0+)?\s*(€|eur|euro)?)$/i', $info['activitiesCost'])) {
            $info['activitiesCost'] = '';
        }
        $info['categories'] = [];
        foreach (isset($values['Categories']) ? $values['Categories']->querySelectorAll('.badge') : [] as $badge) {
            $info['categories'][] = self::plainText($badge);
        }

        return [
            'id' => $id,
            // The platform puts the university's short name behind it: "AgroParisTech (APT)".
            'institution' => trim((string) preg_replace('/\s*\([^)]*\)$/', '', $plain('Institution'))),
            'code' => $plain('Code'),
            'title' => $plain('Title'),
            'info' => $info,
        ];
    }

    /** "November 2026" => "2026-11". */
    public static function session(string $text): ?string
    {
        if (1 !== preg_match('/\b(' . implode('|', array_keys(self::MONTHS)) . ')\s+(\d{4})\b/i', $text, $match)) {
            return null;
        }

        return sprintf('%s-%02d', $match[2], self::MONTHS[strtolower($match[1])]);
    }

    /** Text on one line, spaces collapsed. */
    private static function plainText(Node $node): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', str_replace("\u{a0}", ' ', (string) $node->textContent)));
    }

    /**
     * The platform's rich text (paragraphs, lists, line breaks) as plain text: paragraphs apart by an
     * empty line, list items starting with "• ". Shown as is, never as HTML. Images are left out.
     */
    private static function richText(Node $node): string
    {
        $out = '';
        self::walk($node, $out);
        $lines = array_map(
            static fn (string $line): string => trim((string) preg_replace('/[^\S\n]+/u', ' ', $line)),
            explode("\n", str_replace(["\u{a0}", "\r"], [' ', ''], $out))
        );

        $text = implode("\n", $lines);
        // A bullet typed on a line of its own, its text on the next.
        $text = (string) preg_replace('/^•\n+/mu', '• ', $text);

        return trim((string) preg_replace("/\n{3,}/", "\n\n", $text));
    }

    private static function walk(Node $node, string &$out): void
    {
        foreach ($node->childNodes as $child) {
            if ($child instanceof Text) {
                $out .= self::unwrap($child->data);
                continue;
            }
            if (!$child instanceof Element) {
                continue;
            }
            switch (strtolower($child->localName)) {
                case 'br':
                    $out .= "\n";
                    break;
                case 'figure':
                case 'img':
                case 'script':
                case 'style':
                    break;
                case 'li':
                    $out .= "\n• ";
                    self::walk($child, $out);
                    $out .= "\n";
                    break;
                case 'p':
                case 'div':
                case 'ul':
                case 'ol':
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                case 'blockquote':
                case 'pre':
                    $out .= "\n";
                    self::walk($child, $out);
                    $out .= "\n";
                    break;
                default:
                    self::walk($child, $out);
            }
        }
    }

    /**
     * The line breaks inside a piece of text. Most were pasted from a document with a fixed width
     * ("Basic\nnotions about …") and a browser shows them as spaces; a break before a capital, a
     * number or a bullet is usually meant ("… leurs limites\nRencontrer des professionnels") and stays.
     */
    private static function unwrap(string $text): string
    {
        $kept = (string) preg_replace('/(?<![•\s])[^\S\n]*\n\s*(?=[\p{Lu}\d•–-])/u', "\u{E000}", $text);

        return str_replace("\u{E000}", "\n", (string) preg_replace('/\s*\n\s*/u', ' ', $kept));
    }

    /** "TUM 1126-01" => "TUM1126-01"; "ENSAM / TUD26(TU DELFT course OFFERED in ENSAM)" => "ENSAM/TUD26". */
    private static function compactCode(string $code): string
    {
        return strtoupper((string) preg_replace('/\s+/', '', (string) preg_replace('/\([^)]*\)/', '', $code)));
    }

    /** Without the "BIP" of a blended version: "NUSTPB021BIP" => "NUSTPB021", "UPM162-BIP" => "UPM162". */
    private static function baseCode(string $code): string
    {
        return (string) preg_replace('/-?BIP$/', '', self::compactCode($code));
    }

    /** Nearly the same title, or one that shares at least two real words with it ("Global Warming and …"). */
    private static function sameCourse(string $a, string $b): bool
    {
        if (self::similarity($a, $b) >= self::SAME_TITLE) {
            return true;
        }
        $words = static fn (string $title): array => array_unique(
            array_filter(explode(' ', AthensCatalogue::normalize($title)), static fn (string $word): bool => strlen($word) >= 4)
        );

        return count(array_intersect($words($a), $words($b))) >= 2;
    }

    private static function similarity(string $a, string $b): float
    {
        similar_text(AthensCatalogue::normalize($a), AthensCatalogue::normalize($b), $percent);

        return $percent;
    }

    private function get(string $url): string
    {
        try {
            // Without the header of a Turbo frame the platform sends an empty page that loads the content by script.
            $response = $this->httpClient->request('GET', $url, ['timeout' => 20, 'headers' => ['Accept' => 'text/html', 'Turbo-Frame' => 'content']]);

            return $response->getContent();
        } catch (HttpClientException $exception) {
            throw new RuntimeException(sprintf('Could not read %s: %s', $url, $exception->getMessage()), 0, $exception);
        }
    }
}
