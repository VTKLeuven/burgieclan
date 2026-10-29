<?php

namespace App\Service\Exam;

use App\Entity\Exam;
use App\Service\Collab\CollabServerClient;
use App\Service\Collab\CollabServerException;
use Psr\Log\LoggerInterface;

/**
 * Tells everyone who has an exam open that something changed around one of its questions: a
 * comment, or someone saying they had it too. Their page then refetches the counts, and the
 * thread if they have it open (frontend: useCollabSession, `activity`). No polling.
 *
 * Best effort: the change itself is already saved, so a collab server that cannot be reached is
 * logged, not reported to whoever made it. Others then see it on their next load.
 */
class ExamQuestionActivity
{
    /** The stateless message's `type`, next to the question's `uid`. */
    public const MESSAGE_TYPE = 'question-activity';

    public function __construct(
        private readonly CollabServerClient $collab,
        private readonly LoggerInterface $logger,
    ) {}

    public function questionChanged(int $examId, string $uid): void
    {
        $documentName = Exam::DOCUMENT_PREFIX . $examId;

        try {
            $this->collab->broadcast($documentName, ['type' => self::MESSAGE_TYPE, 'uid' => $uid]);
        } catch (CollabServerException $exception) {
            $this->logger->warning(
                'Could not tell the collab server about activity on "{document}": {message}',
                ['document' => $documentName, 'message' => $exception->getMessage()]
            );
        }
    }
}
