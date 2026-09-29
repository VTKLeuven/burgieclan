<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\ExamApi;
use App\Entity\Exam;
use App\Service\Collab\CollabDocumentStore;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfonycasts\MicroMapper\MicroMapperInterface;

/**
 * Starts an exam reconstruction, optionally as a copy of another one.
 *
 * The copy is made here, while the new exam cannot be open anywhere yet, by copying the stored
 * Yjs state of the source (CollabDocumentStore::copy). Whatever was typed in the source during
 * the last few seconds before its latest store is not included; that is fine for a starting
 * point.
 *
 * @implements ProcessorInterface<ExamApi, ExamApi>
 */
class ExamCreateProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: EntityClassDtoStateProcessor::class)]
        private readonly ProcessorInterface $inner,
        private readonly CollabDocumentStore $store,
        private readonly EntityManagerInterface $entityManager,
        private readonly MicroMapperInterface $microMapper,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): ExamApi
    {
        try {
            $created = $this->inner->process($data, $operation, $uriVariables, $context);
        } catch (UniqueConstraintViolationException) {
            // Two people starting the same exam at the same moment; NewExam catches the rest.
            throw new ConflictHttpException('There already is a reconstruction of this exam.');
        }
        assert($created instanceof ExamApi);

        $exam = $this->entityManager->find(Exam::class, $created->id);
        assert($exam instanceof Exam);

        $source = $exam->getCopiedFrom();
        if (null === $source) {
            return $created;
        }

        $this->store->copy($source->getDocumentName(), $exam->getDocumentName());
        $this->entityManager->flush();

        return $this->microMapper->map($exam, ExamApi::class);
    }
}
