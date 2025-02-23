<?php

namespace App\Controller\Api;

use App\ApiResource\CourseApi;
use App\ApiResource\DocumentApi;
use App\ApiResource\ModuleApi;
use App\ApiResource\ProgramApi;
use App\ApiResource\SearchApi;
use App\Entity\Course;
use App\Entity\Document;
use App\Entity\Module;
use App\Entity\Program;
use App\Repository\CourseRepository;
use App\Repository\DocumentRepository;
use App\Repository\ModuleRepository;
use App\Repository\ProgramRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfonycasts\MicroMapper\MicroMapperInterface;
use function Symfony\Component\VarDumper\dump;

class SearchController extends AbstractController
{
    public function __construct(
        private readonly CourseRepository $courseRepository,
        private readonly ModuleRepository $moduleRepository,
        private readonly ProgramRepository $programRepository,
        private readonly DocumentRepository $documentRepository,
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    public function __invoke(Request $request)
    {
        $searchText = $request->query->get('searchText') ?? '';
        $defaultEntities = ['courses', 'modules', 'programs', 'documents'];
        $entities = (
            $filtered = array_intersect((array)($request->query->all()['entities'] ?? $defaultEntities), $defaultEntities)
        )? $filtered : $defaultEntities;

        if (in_array('courses', $entities)) {
            $courses = $this->courseRepository->findBySearchQuery($searchText);
        } else {
            $courses = [];
        }

        if (in_array('modules', $entities)) {
            $modules = $this->moduleRepository->findBySearchQuery($searchText);
        } else {
            $modules = [];
        }

        if (in_array('programs', $entities)) {
            $programs = $this->programRepository->findBySearchQuery($searchText);
        } else {
            $programs = [];
        }

        if (in_array('documents', $entities)) {
            $documents = $this->documentRepository->findBySearchQuery($searchText);
        } else {
            $documents = [];
        }

        $searchApi = new SearchApi();
        $searchApi->courses = array_map(function (Course $course) {
            return $this->microMapper->map($course, CourseApi::class);
        }, $courses);
        $searchApi->modules = array_map(function (Module $module) {
            return $this->microMapper->map($module, ModuleApi::class);
        }, $modules);
        $searchApi->programs = array_map(function (Program $program) {
            return $this->microMapper->map($program, ProgramApi::class);
        }, $programs);
        $searchApi->documents = array_map(function (Document $document) {
            return $this->microMapper->map($document, DocumentApi::class);
        }, $documents);

        return $searchApi;
    }
}
