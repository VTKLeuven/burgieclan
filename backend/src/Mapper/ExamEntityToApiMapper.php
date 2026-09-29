<?php

namespace App\Mapper;

use App\ApiResource\CourseApi;
use App\ApiResource\ExamApi;
use App\Entity\Exam;
use App\Repository\CollabDocumentRepository;
use App\Utils\ExamContent;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: Exam::class, to: ExamApi::class)]
class ExamEntityToApiMapper extends BaseEntityToApiMapper
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
        private readonly CollabDocumentRepository $documents,
    ) {}

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof Exam);

        $dto = new ExamApi();
        $this->mapBaseFields($from, $dto);

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof Exam);
        assert($to instanceof ExamApi);

        // Depth 0: references only, serialized as IRIs. The page that shows an exam already has
        // its course, and a copy's source only needs to be linkable.
        $to->course = $this->microMapper->map(
            $from->getCourse(),
            CourseApi::class,
            [
            MicroMapperInterface::MAX_DEPTH => 0,
            ]
        );
        $to->copiedFrom = null === $from->getCopiedFrom() ? null : $this->microMapper->map(
            $from->getCopiedFrom(),
            ExamApi::class,
            [MicroMapperInterface::MAX_DEPTH => 0]
        );

        $to->academicYear = $from->getAcademicYear();
        $to->period = $from->getPeriod()->value;
        $to->editableUntil = $from->getEditableUntil()->format(DATE_ATOM);
        $to->editable = $from->isEditable();
        $to->documentName = $from->getDocumentName();

        $document = $this->documents->findOneByName($from->getDocumentName());
        $to->content = $document?->getContent();
        $to->questionCount = ExamContent::countQuestions($to->content);
        $to->sittings = ExamContent::sittings($document?->getFields());

        return $to;
    }
}
