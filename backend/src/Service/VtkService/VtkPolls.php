<?php

namespace App\Service\VtkService;

use App\Entity\User;
use Psr\Log\LoggerInterface;
use RuntimeException;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpClientException;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * The POC polls of the VTK website, for one member: the questions their study programme's student
 * representatives ask, and the answers they send back.
 *
 * The polls live on vtk.be only. It decides who a poll is for (programme and phase, which
 * Burgieclan does not know) and stores every answer anonymously, keyed on a hash of poll and
 * member, so an answer given here, on the VTK homepage, in the app or on Discord counts once.
 * Burgieclan stores nothing: it asks GET/POST {VTK_URL}/api/burgieclan/v1/polls on the member's
 * behalf, signed the same way the VTK website signs its calls to the study planner, the other way
 * round (VtkServiceSignature, VTK_SERVICE_SECRET). The path is part of the signature, so what is
 * signed here opens nothing else on vtk.be.
 *
 * The other side is apps/web/app/api/burgieclan/v1/polls/route.ts in vtk-website-new.
 *
 * @phpstan-type PollQuestion array{id: string, kind: string, text: string, low: ?string, high: ?string}
 * @phpstan-type PollAnswer array{value: ?int, text: ?string}
 * @phpstan-type Poll array{id: string, title: string, askedBy: string, openUntil: string, lead: string, thanks: string, anonymous: string, closesAt: string, answered: bool, questions: list<PollQuestion>, answers: array<string, PollAnswer>}
 */
class VtkPolls
{
    public const PATH = '/api/burgieclan/v1/polls';

    /** The codes vtk.be refuses an answer with; anything else is passed on as POLL_FAILED. */
    public const ERROR_CODES = ['POLL_CLOSED', 'POLL_NOT_YOURS', 'POLL_INVALID', 'POLL_TOO_LONG', 'POLL_EMPTY'];

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly VtkServiceSignature $signature,
        private readonly LoggerInterface $logger,
        #[Autowire(env: 'VTK_URL')]
        private readonly string $vtkUrl,
    ) {}

    /**
     * Whether polls can be asked for this member at all: the link with vtk.be is configured, and
     * the account came through the VTK login, so vtk.be can tell who it is.
     */
    public function isAvailableFor(User $user): bool
    {
        return $this->signature->isConfigured() && null !== $user->getFluxusSub() && '' !== $user->getFluxusSub();
    }

    /**
     * The open polls for this member, with what they answered so far. Empty when polls are not
     * available for them; the sidebar and the homepage simply show nothing then.
     *
     * @return array{polls: list<Poll>, missingProgramme: bool}
     *
     * @throws RuntimeException when the VTK website cannot be reached or answers unexpectedly
     */
    public function forUser(User $user, string $locale): array
    {
        if (!$this->isAvailableFor($user)) {
            return ['polls' => [], 'missingProgramme' => false];
        }

        [$status, $data] = $this->request($user, 'GET', '', ['locale' => 'en' === $locale ? 'en' : 'nl']);
        if (404 === $status) {
            // vtk.be does not know this member (any more): no polls rather than an error.
            return ['polls' => [], 'missingProgramme' => false];
        }
        if (200 !== $status) {
            throw new RuntimeException(sprintf('The VTK website answered the polls with HTTP %d.', $status));
        }

        $polls = [];
        foreach (is_array($data['polls'] ?? null) ? $data['polls'] : [] as $poll) {
            $normalized = is_array($poll) ? self::normalizePoll($poll) : null;
            if (null !== $normalized) {
                $polls[] = $normalized;
            }
        }

        return ['polls' => $polls, 'missingProgramme' => true === ($data['missingProgramme'] ?? false)];
    }

    /**
     * Sends this member's answers to one poll. Sending again replaces what they answered before.
     *
     * @param array<string, string> $answers per question id: "1"/"0", "1".."5" or the text
     *
     * @return string|null null when stored, otherwise why not (one of ERROR_CODES, or POLL_FAILED)
     *
     * @throws RuntimeException when the VTK website cannot be reached
     */
    public function answer(User $user, string $pollId, array $answers): ?string
    {
        if (!$this->isAvailableFor($user)) {
            return 'POLL_NOT_YOURS';
        }

        $body = (string) json_encode(['pollId' => $pollId, 'answers' => (object) $answers], JSON_UNESCAPED_UNICODE);
        [$status, $data] = $this->request($user, 'POST', $body);
        if (200 === $status) {
            return null;
        }

        $code = $data['error'] ?? null;
        if (is_string($code) && in_array($code, self::ERROR_CODES, true)) {
            return $code;
        }
        // Never log the body: it holds the member's answers.
        $this->logger->warning('The VTK website refused poll answers', ['status' => $status, 'error' => is_string($code) ? $code : null]);

        return 'POLL_FAILED';
    }

    /**
     * @param array<string, string> $query
     *
     * @return array{0: int, 1: array<string, mixed>}
     */
    private function request(User $user, string $method, string $body, array $query = []): array
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
            'query' => $query,
            // Short: the sidebar asks on every page load, and a slow vtk.be must not hold it up.
            'timeout' => 5,
            'max_duration' => 8,
            'headers' => [
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'User-Agent' => 'Burgieclan polls',
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
            $this->logger->info('VTK polls could not be fetched', ['error' => $e->getMessage()]);
            throw new RuntimeException('The VTK website could not be reached.', 0, $e);
        }

        $data = '' === $content ? null : json_decode($content, true);

        return [$status, is_array($data) ? $data : []];
    }

    /**
     * Only the fields the frontend reads, each checked: this is another application's answer.
     *
     * @param array<mixed> $poll
     *
     * @return Poll|null
     */
    private static function normalizePoll(array $poll): ?array
    {
        foreach (['id', 'title', 'askedBy', 'openUntil', 'lead', 'thanks', 'anonymous', 'closesAt'] as $key) {
            if (!is_string($poll[$key] ?? null)) {
                return null;
            }
        }

        $questions = [];
        foreach (is_array($poll['questions'] ?? null) ? $poll['questions'] : [] as $question) {
            if (
                !is_array($question)
                || !is_string($question['id'] ?? null)
                || !in_array($question['kind'] ?? null, ['YES_NO', 'SCORE', 'OPEN'], true)
                || !is_string($question['text'] ?? null)
            ) {
                continue;
            }
            $questions[] = [
                'id' => $question['id'],
                'kind' => $question['kind'],
                'text' => $question['text'],
                'low' => is_string($question['low'] ?? null) ? $question['low'] : null,
                'high' => is_string($question['high'] ?? null) ? $question['high'] : null,
            ];
        }
        if ([] === $questions) {
            return null;
        }

        $answers = [];
        foreach (is_array($poll['answers'] ?? null) ? $poll['answers'] : [] as $questionId => $answer) {
            if (!is_string($questionId) || !is_array($answer)) {
                continue;
            }
            $answers[$questionId] = [
                'value' => is_int($answer['value'] ?? null) ? $answer['value'] : null,
                'text' => is_string($answer['text'] ?? null) ? $answer['text'] : null,
            ];
        }

        return [
            'id' => $poll['id'],
            'title' => $poll['title'],
            'askedBy' => $poll['askedBy'],
            'openUntil' => $poll['openUntil'],
            'lead' => $poll['lead'],
            'thanks' => $poll['thanks'],
            'anonymous' => $poll['anonymous'],
            'closesAt' => $poll['closesAt'],
            'answered' => true === ($poll['answered'] ?? false),
            'questions' => $questions,
            'answers' => $answers,
        ];
    }
}
