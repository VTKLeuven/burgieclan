<?php

namespace App\Service\Onderwijsaanbod;

use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Read-only client for the KU Leuven onderwijsaanbod OpenSearch data services.
 *
 * Two indices are used:
 *   - programme index ("pg"):  full programme structure incl. the module-group tree and course
 *     membership. This is the authoritative source for the Program -> Module -> Course hierarchy.
 *   - course index ("opo"):    per-course detail, used only to enrich courses with professors and
 *     identical-course links that the compact programme tree does not carry.
 *
 * The "pg"/"opo" aliases auto-roll to the new academic year every 15 July and each may span
 * multiple year indices at once, so lookups can return the same logical record more than once;
 * callers must de-duplicate. Access is anonymous (no authentication).
 */
class OnderwijsaanbodClient
{
    /**
     * How many academic-year indices a single alias is assumed to span. Two are live today
     * (e.g. opo2025 + opo2026); the headroom only costs a larger page on the enrichment query.
     */
    private const MAX_YEAR_INDICES = 4;

    private LoggerInterface $logger;

    private ?string $lastError = null;

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        ?LoggerInterface $logger = null,
        private readonly string $baseUrl = 'https://dataservice.kuleuven.be',
        private readonly string $programIndex = 'pg',
        private readonly string $opoIndex = 'opo',
    ) {
        $this->logger = $logger ?? new NullLogger();
    }

    public function getLastError(): ?string
    {
        return $this->lastError;
    }

    /**
     * Full-text search over programmes, for the admin autocomplete.
     *
     * @return list<array{programId: string, title: string, qualificationId: ?string, language: 'nl'|'en'}>
     */
    public function searchPrograms(string $query, int $size = 30): array
    {
        $cleanQuery = trim($query);
        if ($cleanQuery === '') {
            return [];
        }

        // Sanitize special Lucene syntax characters while preserving natural full-text search
        $sanitizedQuery = preg_replace('/[+\-&|!(){}\[\]^"~*?:\\\\]/', ' ', $cleanQuery);
        $sanitizedQuery = preg_replace('/\s+/', ' ', trim((string) $sanitizedQuery));
        if ($sanitizedQuery === '') {
            return [];
        }

        $terms = array_values(array_filter(explode(' ', mb_strtolower($sanitizedQuery))));

        $response = $this->search(
            $this->programIndex,
            [
                'size' => max(50, $size * 2),
                'query' => [
                    'bool' => [
                        'should' => [
                            [
                                'query_string' => [
                                    'query' => $sanitizedQuery,
                                    'fields' => [
                                        'programSet.programLanguageSet.programTitleSet.description^20',
                                        'qualificationLanguageSet.qualificationTitleSet.description^20',
                                        'programSet.programId^50',
                                    ],
                                    'default_operator' => 'AND',
                                ],
                            ],
                            [
                                'query_string' => [
                                    'query' => $sanitizedQuery,
                                    'fields' => [
                                        'programSet.programLanguageSet.programTitleSet.description^5',
                                        'qualificationLanguageSet.qualificationTitleSet.description^5',
                                    ],
                                    'default_operator' => 'OR',
                                ],
                            ],
                        ],
                    ],
                ],
                '_source' => [
                    'qualificationId',
                    'qualificationOriginalLangu',
                    'inProgramguide',
                    'programSet.programId',
                    'programSet.originalLangu',
                    'programSet.inProgramGuide',
                    'programSet.programLanguageSet.programLangu',
                    'programSet.programLanguageSet.programTitleSet.description',
                ],
            ]
        );

        $results = [];
        $seen = [];
        foreach ($response['hits']['hits'] ?? [] as $hit) {
            $source = $hit['_source'] ?? [];
            $qualificationId = isset($source['qualificationId']) ? (string) $source['qualificationId'] : null;
            foreach ($source['programSet'] ?? [] as $programSet) {
                $programId = isset($programSet['programId']) ? (string) $programSet['programId'] : null;
                if ($programId === null || isset($seen[$programId])) {
                    continue;
                }

                $inGuide = $programSet['inProgramGuide'] ?? null;
                if ($inGuide !== null && strtolower((string) $inGuide) === 'false') {
                    continue;
                }

                $language = $this->extractOriginalLanguage($source, $programId);
                $title = $this->extractProgramTitle($programSet, $language);
                $seen[$programId] = true;

                $results[] = [
                    'programId' => $programId,
                    'title' => $title,
                    'qualificationId' => $qualificationId,
                    'language' => $language,
                ];
            }
        }

        // Rank results: prioritize direct matches, short titles, and demote prep/shortened programs
        // unless the query asks for them.
        $qLower = mb_strtolower($cleanQuery);
        $cleanLen = static function (string $title): int {
            $stripped = trim((string) preg_replace('/\s*\([^)]*\)/u', '', $title));

            return min(15, (int) (mb_strlen($stripped) / 10));
        };
        usort(
            $results,
            static function (array $a, array $b) use ($terms, $qLower, $cleanLen): int {
                $titleA = mb_strtolower($a['title']);
                $titleB = mb_strtolower($b['title']);

                $scoreA = 0;
                $scoreB = 0;

                foreach ($terms as $term) {
                    if (str_contains($titleA, $term)) {
                        $scoreA += 10;
                    }
                    if (str_contains($titleB, $term)) {
                        $scoreB += 10;
                    }
                }

                if (str_contains($titleA, $qLower)) {
                    $scoreA += 50;
                }
                if (str_contains($titleB, $qLower)) {
                    $scoreB += 50;
                }

                if (str_starts_with($titleA, $qLower)) {
                    $scoreA += 100;
                }
                if (str_starts_with($titleB, $qLower)) {
                    $scoreB += 100;
                }

                foreach (['verkort', 'voorbereidingsprogramma', 'schakel', 'educatief', 'postgraduaat'] as $modifier) {
                    if (!str_contains($qLower, $modifier)) {
                        if (str_contains($titleA, $modifier)) {
                            $scoreA -= 30;
                        }
                        if (str_contains($titleB, $modifier)) {
                            $scoreB -= 30;
                        }
                    }
                }

                $scoreA -= $cleanLen($a['title']);
                $scoreB -= $cleanLen($b['title']);

                return $scoreB <=> $scoreA;
            }
        );

        return array_slice($results, 0, $size);
    }

    /**
     * Fetch the raw programme document that contains the given programId.
     *
     * Returns the `_source` of the matching hit (a document may bundle several programme versions;
     * the caller selects the relevant `programSet` entry). Returns null if nothing matches.
     *
     * @return array<string, mixed>|null
     */
    public function fetchProgramSource(string $programId): ?array
    {
        $response = $this->search(
            $this->programIndex,
            [
            'size' => 1,
            'query' => ['term' => ['programSet.programId' => $programId]],
            // The alias spans one index per academic year (pg2025, pg2026, ...) and a programme
            // usually exists in several. Without a sort the top *relevance* hit wins, so the year
            // you import is undefined and can flip between runs. Index names start with the year,
            // so ordering by name descending deterministically yields the newest — and, for two
            // snapshots of the same year, the more recent one.
            'sort' => [['_index' => 'desc']],
            ]
        );

        $hits = $response['hits']['hits'] ?? [];
        if ($hits === []) {
            return null;
        }

        return $hits[0]['_source'] ?? null;
    }

    /**
     * Fetch course (OPO) documents for a set of ECTS codes, keyed by uppercase ECTS code.
     *
     * A code exists once per academic-year index, so the response holds several documents per code
     * and the first one seen wins. Sorted by index name descending, that first one is always the
     * newest year — matching how fetchProgramSource() picks a programme, so a course's details come
     * from the same year as the programme structure that referenced it.
     *
     * @param list<string> $codes
     *
     * @return array<string, array<string, mixed>> map of ECTS code => OPO `_source`
     */
    public function fetchOpoByCodes(array $codes): array
    {
        $codes = array_values(array_unique(array_map('strtoupper', $codes)));
        if ($codes === []) {
            return [];
        }

        $byCode = [];
        foreach (array_chunk($codes, 100) as $chunk) {
            $response = $this->search(
                $this->opoIndex,
                [
                // Room for every year's copy of every code, so the sort below actually decides
                // which one wins instead of the page boundary cutting the result short.
                'size' => count($chunk) * self::MAX_YEAR_INDICES,
                // exact-match keyword field; the analysed `ectsCode` field would not match codes verbatim.
                'query' => ['terms' => ['ectsCode.keyword' => $chunk]],
                'sort' => [['_index' => 'desc']],
                ]
            );
            foreach ($response['hits']['hits'] ?? [] as $hit) {
                $source = $hit['_source'] ?? [];
                $code = isset($source['ectsCode']) ? strtoupper((string) $source['ectsCode']) : null;
                if ($code !== null && !isset($byCode[$code])) {
                    $byCode[$code] = $source;
                }
            }
        }

        return $byCode;
    }

    /**
     * Resolve the original language of instruction for a programme ('en' or 'nl').
     *
     * @param array<string, mixed> $programSource
     *
     * @return 'nl'|'en'
     */
    public function extractOriginalLanguage(array $programSource, ?string $programId = null): string
    {
        $raw = null;
        if ($programId !== null) {
            foreach ($programSource['programSet'] ?? [] as $programSet) {
                if ((string) ($programSet['programId'] ?? '') === $programId) {
                    $raw = $programSet['originalLangu'] ?? null;
                    break;
                }
            }
        }
        $raw ??= $programSource['qualificationOriginalLangu'] ?? 'NL';

        return str_starts_with(strtolower(trim((string) $raw)), 'en') ? 'en' : 'nl';
    }

    /**
     * Execute an OpenSearch `_search` and return the decoded response, or an empty result shape
     * on failure (logged). Never throws, so a transient API hiccup degrades gracefully.
     *
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed>
     */
    private function search(string $index, array $body): array
    {
        $this->lastError = null;
        $url = sprintf('%s/%s/_search', rtrim($this->baseUrl, '/'), $index);
        try {
            $response = $this->httpClient->request(
                'POST',
                $url,
                [
                'headers' => ['Content-Type' => 'application/json'],
                'json' => $body,
                'timeout' => 30,
                ]
            );

            return $response->toArray();
        } catch (HttpExceptionInterface $e) {
            $this->lastError = $e->getMessage();
            $this->logger->error(
                'Onderwijsaanbod API request failed',
                [
                'index' => $index,
                'error' => $e->getMessage(),
                ]
            );

            return ['hits' => ['hits' => [], 'total' => ['value' => 0]]];
        }
    }

    /**
     * Pick a human-readable title from a programSet entry, preferring the programme's own
     * language of instruction before falling back to the other translation.
     *
     * @param array<string, mixed> $programSet
     */
    private function extractProgramTitle(array $programSet, string $preferredLanguage = 'nl'): string
    {
        $titles = [];
        foreach ($programSet['programLanguageSet'] ?? [] as $lang) {
            $langCode = strtoupper((string) ($lang['programLangu'] ?? ''));
            foreach ($lang['programTitleSet'] ?? [] as $title) {
                $description = (string) ($title['description'] ?? '');
                if ($description !== '') {
                    $titles[$langCode] = $description;
                }
            }
        }

        if ($preferredLanguage === 'en') {
            return $titles['EN'] ?? $titles['NL'] ?? reset($titles) ?: '';
        }

        return $titles['NL'] ?? $titles['EN'] ?? reset($titles) ?: '';
    }
}
