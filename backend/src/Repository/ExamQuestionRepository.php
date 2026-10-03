<?php

namespace App\Repository;

use App\Entity\Exam;
use App\Entity\ExamQuestion;
use App\Entity\ExamQuestionComment;
use App\Entity\ExamQuestionConfirmation;
use App\Entity\User;
use DateTimeImmutable;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use LogicException;

use function Symfony\Component\String\u;

/**
 * @extends ServiceEntityRepository<ExamQuestion>
 */
class ExamQuestionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ExamQuestion::class);
    }

    /**
     * Every question the exam ever had, removed ones included, by uid.
     *
     * @return array<string, ExamQuestion>
     */
    public function findAllByUid(Exam $exam): array
    {
        $byUid = [];
        foreach ($this->findBy(['exam' => $exam]) as $question) {
            $byUid[$question->getUid()] = $question;
        }

        return $byUid;
    }

    /**
     * The question with this uid, created on the spot when the collab server has not stored it
     * yet, e.g. when someone comments on a question seconds after adding it.
     *
     * Such a row starts out removed, with no text: the next store that contains the question
     * brings it to life and fills it in (ExamQuestionSync). A uid that never reaches the
     * document, typed by hand into a request, so never turns up as a question.
     *
     * Inserted with ON CONFLICT DO NOTHING, since a store can create the same row at the same
     * moment.
     */
    public function findOrCreate(Exam $exam, string $uid): ExamQuestion
    {
        $question = $this->findOneBy(['exam' => $exam, 'uid' => $uid]);
        if (null !== $question) {
            return $question;
        }

        $now = (new DateTimeImmutable())->format('Y-m-d H:i:s');
        $this->getEntityManager()->getConnection()->executeStatement(
            "INSERT INTO exam_question (exam_id, uid, position, text, sittings, removed_at, created_at, updated_at)
             VALUES (:exam, :uid, 0, '', '[]', :now, :now, :now)
             ON CONFLICT (exam_id, uid) DO NOTHING",
            ['exam' => $exam->getId(), 'uid' => $uid, 'now' => $now]
        );

        return $this->findOneBy(['exam' => $exam, 'uid' => $uid]) ?? throw new LogicException(
            sprintf('Question "%s" of exam %d could not be created.', $uid, $exam->getId())
        );
    }

    /**
     * Per question that has any comments or confirmations: how many of each, and whether $user
     * confirmed it. Questions without either are left out.
     *
     * @return list<array{uid: string, comments: int, confirmations: int, confirmed: bool}>
     */
    public function findStats(Exam $exam, User $user): array
    {
        $rows = $this->getEntityManager()->createQuery(
            'SELECT q.uid AS uid,
                (SELECT COUNT(c.id) FROM ' . ExamQuestionComment::class . ' c WHERE c.question = q) AS comments,
                (SELECT COUNT(f.id) FROM ' . ExamQuestionConfirmation::class . ' f
                    WHERE f.question = q) AS confirmations,
                (SELECT COUNT(m.id) FROM ' . ExamQuestionConfirmation::class . ' m
                    WHERE m.question = q AND m.creator = :user) AS mine
             FROM ' . ExamQuestion::class . ' q
             WHERE q.exam = :exam
             ORDER BY q.position ASC, q.id ASC'
        )
            ->setParameter('exam', $exam)
            ->setParameter('user', $user)
            ->getArrayResult();

        $stats = [];
        foreach ($rows as $row) {
            if (0 === (int) $row['comments'] && 0 === (int) $row['confirmations']) {
                continue;
            }
            $stats[] = [
                'uid' => (string) $row['uid'],
                'comments' => (int) $row['comments'],
                'confirmations' => (int) $row['confirmations'],
                'confirmed' => (int) $row['mine'] > 0,
            ];
        }

        return $stats;
    }

    /**
     * Questions that match a search, newest exams first. Every term has to match the question or
     * its course (code or one of its names), and at least one has to match the question itself:
     * a search for only a course lists the course, not all of its questions.
     *
     * Case-insensitive, like the rest of the search. LOWER(q.text) LIKE is served by the trigram
     * index from Version20261003105945.
     *
     * @return ExamQuestion[]
     */
    public function findBySearchQuery(string $query, int $limit = 20): array
    {
        $terms = $this->extractSearchTerms($query);
        if ([] === $terms) {
            return [];
        }

        $queryBuilder = $this->createQueryBuilder('q')
            ->addSelect('e', 'c')
            ->join('q.exam', 'e')
            ->join('e.course', 'c')
            ->where('q.removedAt IS NULL');

        $inQuestion = [];
        foreach ($terms as $key => $term) {
            $parameter = 't_' . $key;
            $inQuestion[] = 'LOWER(q.text) LIKE :' . $parameter;
            $queryBuilder
                ->andWhere(
                    sprintf(
                        '(LOWER(q.text) LIKE :%1$s OR LOWER(c.code) LIKE :%1$s OR LOWER(c.name) LIKE :%1$s'
                        . ' OR LOWER(c.nameNl) LIKE :%1$s OR LOWER(c.nameEn) LIKE :%1$s)',
                        $parameter
                    )
                )
                ->setParameter($parameter, '%' . mb_strtolower($term) . '%');
        }
        $queryBuilder->andWhere('(' . implode(' OR ', $inQuestion) . ')');

        /** @var ExamQuestion[] $result */
        $result = $queryBuilder
            ->orderBy('e.academicYear', 'DESC')
            ->addOrderBy('e.id', 'DESC')
            ->addOrderBy('q.position', 'ASC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return $result;
    }

    /**
     * The search terms in a query, like the other repositories: split on whitespace, without
     * duplicates or terms shorter than two characters.
     *
     * @return list<string>
     */
    private function extractSearchTerms(string $query): array
    {
        $terms = array_unique(u($query)->replaceMatches('/[[:space:]]+/', ' ')->trim()->split(' '));

        return array_values(
            array_map(
                static fn($term): string => $term->toString(),
                array_filter($terms, static fn($term): bool => 2 <= $term->length())
            )
        );
    }

    /**
     * The questions as they are in the document now, in order.
     *
     * @return ExamQuestion[]
     */
    public function findCurrent(Exam $exam): array
    {
        return $this->createQueryBuilder('q')
            ->where('q.exam = :exam')
            ->andWhere('q.removedAt IS NULL')
            ->setParameter('exam', $exam)
            ->orderBy('q.position', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
