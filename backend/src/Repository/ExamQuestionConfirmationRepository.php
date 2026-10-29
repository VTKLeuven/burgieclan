<?php

namespace App\Repository;

use App\Entity\ExamQuestion;
use App\Entity\ExamQuestionConfirmation;
use App\Entity\User;
use DateTimeImmutable;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ExamQuestionConfirmation>
 */
class ExamQuestionConfirmationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ExamQuestionConfirmation::class);
    }

    /**
     * Says $user had $question too. Straight SQL with ON CONFLICT DO NOTHING, so a double click
     * that arrives twice at the same moment cannot fail on the unique constraint.
     *
     * @return bool whether it changed anything
     */
    public function confirm(User $user, ExamQuestion $question): bool
    {
        $now = (new DateTimeImmutable())->format('Y-m-d H:i:s');

        return $this->getEntityManager()->getConnection()->executeStatement(
            'INSERT INTO exam_question_confirmation (creator_id, question_id, created_at, updated_at)
             VALUES (:user, :question, :now, :now)
             ON CONFLICT (creator_id, question_id) DO NOTHING',
            ['user' => $user->getId(), 'question' => $question->getId(), 'now' => $now]
        ) > 0;
    }

    /**
     * @return bool whether it changed anything
     */
    public function unconfirm(User $user, ExamQuestion $question): bool
    {
        return $this->getEntityManager()->getConnection()->executeStatement(
            'DELETE FROM exam_question_confirmation WHERE creator_id = :user AND question_id = :question',
            ['user' => $user->getId(), 'question' => $question->getId()]
        ) > 0;
    }
}
