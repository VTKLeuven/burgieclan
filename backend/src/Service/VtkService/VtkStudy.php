<?php

namespace App\Service\VtkService;

use App\Entity\User;
use Psr\Log\LoggerInterface;
use RuntimeException;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpClientException;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * The study timer of the "Blok" calendar for a member who signed in through VTK: it is the same
 * session as "Samen blokken" in the VTK app, kept on vtk.be. What they start here counts in their
 * study groups, daily goal and streak there, and a session started in the app runs on here.
 *
 * Burgieclan stores nothing of it: it asks GET/POST {VTK_URL}/api/burgieclan/v1/studeren on the
 * member's behalf, signed as for the POC polls (VtkPolls, VtkServiceSignature). vtk.be applies the
 * app's rules: a session counts up to its last heartbeat, a pause under a minute is no pause, and
 * eight hours is the maximum. Accounts without the VTK login keep Burgieclan's own timer
 * (StudyPlannerSession).
 *
 * The other side is apps/web/app/api/burgieclan/v1/studeren/route.ts in vtk-website-new.
 *
 * @phpstan-type StudyState array{session: ?array{startedAt: string, seconds: int, paused: bool, pausedAt: ?string, subject: ?string, maxSeconds: int}, todaySeconds: int, dailyGoalMinutes: int, streak: int, friendsStudying: int, today: list<array{startedAt: string, endedAt: ?string, seconds: int}>, days: list<array{date: string, seconds: int}>, now: string}
 */
class VtkStudy
{
    public const PATH = '/api/burgieclan/v1/studeren';

    public const ACTIONS = ['start', 'pause', 'resume', 'heartbeat', 'stop'];

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly VtkServiceSignature $signature,
        private readonly LoggerInterface $logger,
        #[Autowire(env: 'VTK_URL')]
        private readonly string $vtkUrl,
    ) {}

    /** The link with vtk.be is configured, and the account came through the VTK login. */
    public function isAvailableFor(User $user): bool
    {
        return $this->signature->isConfigured() && null !== $user->getFluxusSub() && '' !== $user->getFluxusSub();
    }

    /**
     * @return StudyState|null null when vtk.be does not know this member
     *
     * @throws RuntimeException when the VTK website cannot be reached or answers unexpectedly
     */
    public function state(User $user): ?array
    {
        return $this->call($user, 'GET', '');
    }

    /**
     * @return StudyState|null null when vtk.be does not know this member
     *
     * @throws RuntimeException when the VTK website cannot be reached or answers unexpectedly
     */
    public function act(User $user, string $action): ?array
    {
        if (!in_array($action, self::ACTIONS, true)) {
            throw new \InvalidArgumentException('Unknown action.');
        }

        return $this->call($user, 'POST', (string) json_encode(['action' => $action]));
    }

    /**
     * @return StudyState|null
     */
    private function call(User $user, string $method, string $body): ?array
    {
        $identity = rtrim(
            strtr(
                base64_encode(
                    (string) json_encode(
                        [
                        'sub' => (string) $user->getFluxusSub(),
                        'email' => (string) $user->getEmail(),
                        'name' => (string) $user->getFullName(),
                        ],
                        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                    )
                ),
                '+/',
                '-_'
            ),
            '='
        );
        $timestamp = time();
        $options = [
            'timeout' => 5,
            'max_duration' => 8,
            'headers' => [
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'User-Agent' => 'Burgieclan study timer',
                VtkServiceSignature::HEADER_USER => $identity,
                VtkServiceSignature::HEADER_TIMESTAMP => (string) $timestamp,
                VtkServiceSignature::HEADER_SIGNATURE => $this->signature->sign($method, self::PATH, $timestamp, $identity, $body),
            ],
        ];
        if ('' !== $body) {
            $options['body'] = $body;
        }

        try {
            $response = $this->httpClient->request($method, rtrim($this->vtkUrl, '/') . self::PATH, $options);
            $status = $response->getStatusCode();
            $content = $response->getContent(false);
        } catch (HttpClientException $e) {
            $this->logger->info('The VTK study timer could not be reached', ['error' => $e->getMessage()]);
            throw new RuntimeException('The VTK website could not be reached.', 0, $e);
        }

        if (404 === $status) {
            return null;
        }
        $data = '' === $content ? null : json_decode($content, true);
        if (200 !== $status || !is_array($data)) {
            $this->logger->warning('The VTK website refused the study timer', ['status' => $status]);
            throw new RuntimeException(sprintf('The VTK website answered the study timer with HTTP %d.', $status));
        }

        return self::normalize($data);
    }

    /**
     * Only the fields the frontend reads, each checked: this is another application's answer.
     *
     * @param array<mixed> $data
     *
     * @return StudyState
     */
    public static function normalize(array $data): array
    {
        $int = static fn (mixed $v): int => is_int($v) ? max(0, $v) : (is_float($v) ? max(0, (int) round($v)) : 0);
        $str = static fn (mixed $v): ?string => is_string($v) && '' !== $v ? $v : null;

        $session = null;
        if (is_array($data['session'] ?? null) && null !== $str($data['session']['startedAt'] ?? null)) {
            $s = $data['session'];
            $session = [
                'startedAt' => (string) $str($s['startedAt']),
                'seconds' => $int($s['seconds'] ?? 0),
                'paused' => true === ($s['paused'] ?? false),
                'pausedAt' => $str($s['pausedAt'] ?? null),
                'subject' => $str($s['subject'] ?? null),
                'maxSeconds' => $int($s['maxSeconds'] ?? 0),
            ];
        }

        $today = [];
        foreach (is_array($data['today'] ?? null) ? $data['today'] : [] as $row) {
            if (is_array($row) && null !== $str($row['startedAt'] ?? null)) {
                $today[] = ['startedAt' => (string) $str($row['startedAt']), 'endedAt' => $str($row['endedAt'] ?? null), 'seconds' => $int($row['seconds'] ?? 0)];
            }
        }

        $days = [];
        foreach (is_array($data['days'] ?? null) ? $data['days'] : [] as $row) {
            if (is_array($row) && is_string($row['date'] ?? null) && 1 === preg_match('/^\d{4}-\d{2}-\d{2}$/', $row['date'])) {
                $days[] = ['date' => $row['date'], 'seconds' => $int($row['seconds'] ?? 0)];
            }
        }

        return [
            'session' => $session,
            'todaySeconds' => $int($data['todaySeconds'] ?? 0),
            'dailyGoalMinutes' => $int($data['dailyGoalMinutes'] ?? 0),
            'streak' => $int($data['streak'] ?? 0),
            'friendsStudying' => $int($data['friendsStudying'] ?? 0),
            'today' => $today,
            'days' => $days,
            'now' => $str($data['now'] ?? null) ?? (new \DateTimeImmutable())->format(DATE_ATOM),
        ];
    }
}
