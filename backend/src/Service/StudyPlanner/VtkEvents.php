<?php

namespace App\Service\StudyPlanner;

use DateTimeImmutable;
use Exception;
use Psr\Log\LoggerInterface;
use RuntimeException;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpClientException;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Reads VTK events from the VTK website (GET {VTK_URL}/api/burgieclan/v1/events), for the VTK
 * events someone puts in their study planner.
 *
 * That endpoint is public: it only returns published events, the same ones as VTK's public
 * calendar feed. Unknown or unpublished ids are simply missing from the answer.
 *
 * @phpstan-type VtkEvent array{id: string, slug: string, titleNl: string, titleEn: ?string, location: ?string, start: DateTimeImmutable, end: DateTimeImmutable, allDay: bool, urlNl: string, urlEn: string, moments: list<array{start: string, end: string, label: ?string, location: ?string}>}
 */
class VtkEvents
{
    /** The VTK endpoint answers at most this many ids at once. */
    public const MAX_IDS = 100;

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly CacheInterface $cache,
        private readonly LoggerInterface $logger,
        #[Autowire(env: 'VTK_URL')]
        private readonly string $vtkUrl,
    ) {}

    /**
     * These events, keyed by id, as far as VTK still publishes them.
     *
     * @param list<string> $ids
     *
     * @return array<string, VtkEvent>
     *
     * @throws RuntimeException when the VTK website cannot be reached
     */
    public function byIds(array $ids): array
    {
        $out = [];
        foreach (array_chunk(array_values(array_unique($ids)), self::MAX_IDS) as $chunk) {
            foreach ($this->fetch(['ids' => implode(',', $chunk)]) as $event) {
                $out[$event['id']] = $event;
            }
        }

        return $out;
    }

    /**
     * What is coming up at VTK, for the list to choose from. Cached for five minutes: everyone
     * opening that list asks the same question.
     *
     * @return list<VtkEvent>
     *
     * @throws RuntimeException when the VTK website cannot be reached
     */
    public function upcoming(): array
    {
        /** @var list<array<string, mixed>> $raw */
        $raw = $this->cache->get(
            'study_planner_vtk_upcoming',
            function (ItemInterface $item): array {
                $item->expiresAfter(300);

                return $this->request(['days' => '120']);
            }
        );

        return $this->normalizeAll($raw);
    }

    /**
     * @param array<string, string> $query
     *
     * @return list<VtkEvent>
     */
    private function fetch(array $query): array
    {
        return $this->normalizeAll($this->request($query));
    }

    /**
     * @param array<string, string> $query
     *
     * @return list<array<string, mixed>>
     */
    private function request(array $query): array
    {
        try {
            $response = $this->httpClient->request(
                'GET',
                rtrim($this->vtkUrl, '/') . '/api/burgieclan/v1/events',
                [
                'query' => $query,
                'timeout' => 10,
                'max_duration' => 20,
                'headers' => ['Accept' => 'application/json', 'User-Agent' => 'Burgieclan study planner'],
                ]
            );
            $status = $response->getStatusCode();
            if (200 !== $status) {
                throw new RuntimeException(sprintf('The VTK website answered with HTTP %d.', $status));
            }
            $data = $response->toArray(false);
        } catch (HttpClientException $e) {
            $this->logger->info('VTK events could not be fetched', ['error' => $e->getMessage()]);
            throw new RuntimeException('The VTK website could not be reached.', 0, $e);
        }
        $events = $data['events'] ?? null;

        return is_array($events) ? array_values(array_filter($events, 'is_array')) : [];
    }

    /**
     * @param list<array<string, mixed>> $raw
     *
     * @return list<VtkEvent>
     */
    private function normalizeAll(array $raw): array
    {
        $out = [];
        foreach ($raw as $event) {
            $normalized = self::normalize($event);
            if (null !== $normalized) {
                $out[] = $normalized;
            }
        }

        return $out;
    }

    /**
     * One event of the VTK answer, checked, or null when it is not one.
     *
     * @param array<string, mixed> $e
     *
     * @return VtkEvent|null
     */
    public static function normalize(array $e): ?array
    {
        $str = static fn (mixed $v): ?string => is_string($v) && '' !== trim($v) ? trim($v) : null;
        $id = $str($e['id'] ?? null);
        $title = $str($e['titleNl'] ?? null);
        if (null === $id || strlen($id) > 64 || null === $title) {
            return null;
        }
        try {
            $start = new DateTimeImmutable((string) ($e['start'] ?? ''));
            $end = new DateTimeImmutable((string) ($e['end'] ?? ''));
        } catch (Exception) {
            return null;
        }
        if (!is_string($e['start'] ?? null) || !is_string($e['end'] ?? null) || $end < $start) {
            return null;
        }
        $moments = [];
        foreach (is_array($e['moments'] ?? null) ? $e['moments'] : [] as $m) {
            if (!is_array($m) || !is_string($m['start'] ?? null) || !is_string($m['end'] ?? null)) {
                continue;
            }
            try {
                $ms = new DateTimeImmutable($m['start']);
                $me = new DateTimeImmutable($m['end']);
            } catch (Exception) {
                continue;
            }
            if ($me < $ms) {
                continue;
            }
            $moments[] = [
                'start' => $ms->format(DATE_ATOM),
                'end' => $me->format(DATE_ATOM),
                'label' => $str($m['label'] ?? null),
                'location' => $str($m['location'] ?? null),
            ];
        }

        return [
            'id' => $id,
            'slug' => $str($e['slug'] ?? null) ?? $id,
            'titleNl' => $title,
            'titleEn' => $str($e['titleEn'] ?? null),
            'location' => $str($e['location'] ?? null),
            'start' => $start,
            'end' => $end,
            'allDay' => true === ($e['allDay'] ?? false),
            'urlNl' => $str($e['urlNl'] ?? null) ?? '',
            'urlEn' => $str($e['urlEn'] ?? null) ?? '',
            'moments' => $moments,
        ];
    }
}
