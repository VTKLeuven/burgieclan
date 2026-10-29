<?php

namespace App\Controller\Api;

use App\ApiResource\CourseApi;
use App\ApiResource\DocumentApi;
use App\ApiResource\ExamQuestionSearchResult;
use App\ApiResource\ModuleApi;
use App\ApiResource\ProgramApi;
use App\ApiResource\SearchApi;
use App\Constants\MappingContext;
use App\Entity\Course;
use App\Entity\Document;
use App\Entity\ExamQuestion;
use App\Entity\Module;
use App\Entity\Program;
use App\Repository\CourseRepository;
use App\Repository\DocumentRepository;
use App\Repository\ExamQuestionRepository;
use App\Repository\ModuleRepository;
use App\Repository\ProgramRepository;
use App\Utils\SearchSnippet;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfonycasts\MicroMapper\MicroMapperInterface;

class SearchController extends AbstractController
{
    public function __construct(
        private readonly CourseRepository $courseRepository,
        private readonly ModuleRepository $moduleRepository,
        private readonly ProgramRepository $programRepository,
        private readonly DocumentRepository $documentRepository,
        private readonly ExamQuestionRepository $examQuestionRepository,
        private readonly MicroMapperInterface $microMapper,
    ) {}

    public function __invoke(Request $request)
    {

        $searchText = $request->query->get('searchText') ?? '';
        $courses = $this->courseRepository->findBySearchQuery($searchText);
        $modules = $this->moduleRepository->findBySearchQuery($searchText);
        $programs = $this->programRepository->findBySearchQuery($searchText);
        $documents = $this->documentRepository->findBySearchQuery($searchText);
        $examQuestions = $this->examQuestionRepository->findBySearchQuery($searchText);

        $searchApi = new SearchApi();
        $searchApi->courses = array_map(
            function (Course $course) {
                // A search row shows nothing but the name, code, credits, professors and
                // semesters, all of which SUMMARY already fills in. Without it every hit
                // walks its replacement courses and its whole comment thread, and runs a
                // per-course document count, purely to throw the result away.
                return $this->microMapper->map(
                    $course,
                    CourseApi::class,
                    [MappingContext::SUMMARY => true]
                );
            },
            $courses
        );
        $searchApi->modules = array_map(
            function (Module $module) {
                return $this->microMapper->map($module, ModuleApi::class);
            },
            $modules
        );
        $searchApi->programs = array_map(
            function (Program $program) {
                return $this->microMapper->map($program, ProgramApi::class);
            },
            $programs
        );
        $searchApi->documents = array_map(
            function (Document $document) {
                return $this->microMapper->map($document, DocumentApi::class);
            },
            $documents
        );
        $searchApi->examQuestions = array_map(
            fn(ExamQuestion $question): ExamQuestionSearchResult => $this->examQuestionResult($question, $searchText),
            $examQuestions
        );

        return $searchApi;
    }

    private function examQuestionResult(ExamQuestion $question, string $searchText): ExamQuestionSearchResult
    {
        $exam = $question->getExam();

        $result = new ExamQuestionSearchResult();
        $result->uid = $question->getUid();
        $result->snippet = SearchSnippet::around($question->getText(), $searchText);
        $result->examId = (int) $exam->getId();
        $result->academicYear = $exam->getAcademicYear();
        $result->period = $exam->getPeriod()->value;
        // The same shallow course as a course hit: enough for its name, code and link.
        $result->course = $this->microMapper->map(
            $exam->getCourse(),
            CourseApi::class,
            [MappingContext::SUMMARY => true]
        );

        return $result;
    }
}
