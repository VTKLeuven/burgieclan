<?php

namespace App\Controller\Admin;

use App\Entity\Program;
use App\Entity\User;
use App\Repository\CourseRepository;
use App\Repository\ModuleRepository;
use App\Repository\ProgramRepository;
use App\Service\Onderwijsaanbod\Dto\ModuleData;
use App\Service\Onderwijsaanbod\Dto\ProgramData;
use App\Service\Onderwijsaanbod\OnderwijsaanbodClient;
use App\Service\Onderwijsaanbod\OnderwijsaanbodImporter;
use App\Service\Onderwijsaanbod\ProgramTreeMapper;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Attribute\AdminRoute;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Admin wizard to import a KU Leuven programme structure into Program / Module / Course.
 *
 * Stateless three-step flow (no session): the search/options form posts to a preview that runs a
 * dry-run and renders the tree that would be written; the preview's confirm button posts the same
 * options to commit, which runs the real import. Re-fetching from the API on each step keeps the
 * data fresh and avoids serialising the tree between requests.
 */
#[IsGranted(User::ROLE_ADMIN)]
class OnderwijsaanbodImportController extends AbstractController
{
    /** @var string Comma-separated default flatten names for the template form. */
    private const DEFAULT_FLATTEN_DISPLAY = 'Verplichte opleidingsonderdelen, Compulsory courses';

    public function __construct(
        private readonly OnderwijsaanbodClient $client,
        private readonly ProgramTreeMapper $mapper,
        private readonly OnderwijsaanbodImporter $importer,
        private readonly ProgramRepository $programRepository,
        private readonly ModuleRepository $moduleRepository,
        private readonly CourseRepository $courseRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {}

    #[AdminRoute('/onderwijsaanbod/import', name: 'onderwijsaanbod_import')]
    public function index(Request $request): Response
    {
        $query = trim((string) $request->query->get('q', ''));
        $searchResults = $query !== '' ? $this->client->searchPrograms($query) : [];

        return $this->render(
            'admin/onderwijsaanbod/form.html.twig',
            [
            'query' => $query,
            'searchResults' => $searchResults,
            'defaultFlatten' => self::DEFAULT_FLATTEN_DISPLAY,
            ]
        );
    }

    #[AdminRoute('/onderwijsaanbod/import/preview', name: 'onderwijsaanbod_import_preview', options: ['methods' => ['POST']])]
    public function preview(Request $request): Response
    {
        $options = $this->readOptions($request);

        $programData = $this->buildProgramData($options);
        if ($programData === null) {
            $this->addFlash('danger', sprintf('No programme found for programId %s.', $options['programId']));

            return $this->redirectToRoute('admin_onderwijsaanbod_import');
        }

        $summary = $this->importer->import($programData, $options['enrich'], dryRun: true);

        // The untransformed named tree provides the full list of selectable groups (checkboxes),
        // independent of what the current flatten/semester choices removed from the result.
        $namedTree = $this->buildProgramData(
            [
            'programId' => $options['programId'],
            'lang' => $options['lang'],
            'flatten' => [],
            'semester' => [],
            'semesterFlat' => [],
            'merge' => false,
            'enrich' => false,
            'electiveGrouping' => ProgramTreeMapper::ELECTIVES_NONE,
            ]
        );

        return $this->render(
            'admin/onderwijsaanbod/preview.html.twig',
            [
            'program' => $programData,
            'options' => $options,
            'summary' => $summary,
            'groups' => $namedTree !== null ? $this->listGroups($namedTree->modules) : [],
            'existingProgram' => $this->programRepository->findOneByKulId($programData->kulId) !== null,
            'existingModuleKulIds' => $this->existingModuleKulIds($programData),
            'existingCourseCodes' => $this->existingCourseCodes($programData),
            ]
        );
    }

    #[AdminRoute('/onderwijsaanbod/import/commit', name: 'onderwijsaanbod_import_commit', options: ['methods' => ['POST']])]
    public function commit(Request $request): Response
    {
        if (!$this->isCsrfTokenValid('onderwijsaanbod_import', (string) $request->request->get('_token'))) {
            $this->addFlash('danger', 'Invalid CSRF token, import aborted.');

            return $this->redirectToRoute('admin_onderwijsaanbod_import');
        }

        $options = $this->readOptions($request);
        $programData = $this->buildProgramData($options);
        if ($programData === null) {
            $this->addFlash('danger', sprintf('No programme found for programId %s.', $options['programId']));

            return $this->redirectToRoute('admin_onderwijsaanbod_import');
        }

        $result = $this->importer->import($programData, $options['enrich'], dryRun: false);
        $program = $this->programRepository->findOneByKulId($programData->kulId);
        if ($program !== null) {
            $program->setImportSettings($options);
            $this->entityManager->flush();
        }

        $this->addFlash(
            'success',
            sprintf(
                'Imported "%s": %d modules (%d new), %d courses (%d new), %d enriched.',
                $programData->name,
                $result->modulesCreated + $result->modulesUpdated,
                $result->modulesCreated,
                $result->coursesCreated + $result->coursesUpdated,
                $result->coursesCreated,
                $result->enrichedCourses,
            )
        );

        if ($program !== null) {
            return $this->redirectToRoute(
                'admin',
                [
                'crudControllerFqcn' => ProgramCrudController::class,
                'crudAction' => 'detail',
                'entityId' => $program->getId(),
                ]
            );
        }

        return $this->redirectToRoute('admin_onderwijsaanbod_import');
    }

    /**
     * @return array{
     *     programId: string,
     *     lang: 'nl'|'en',
     *     flatten: list<string>,
     *     semester: list<string>,
     *     semesterFlat: list<string>,
     *     merge: bool,
     *     enrich: bool,
     *     electiveGrouping: string,
     * }
     */
    private function readOptions(Request $request): array
    {
        $programId = trim((string) $request->request->get('programId', ''));
        $existingProgram = $programId !== '' ? $this->programRepository->findOneByKulId($programId) : null;
        $saved = $existingProgram?->getResolvedImportSettings();

        // Language: explicit request parameter takes precedence over saved settings
        $langParam = $request->request->get('lang');
        if ($langParam !== null) {
            /** @var 'nl'|'en' $lang */
            $lang = (string) $langParam === 'en' ? 'en' : 'nl';
        } else {
            /** @var 'nl'|'en' $lang */
            $lang = $saved['lang'] ?? 'nl';
        }

        // Flatten/semester/merge: use explicit form values when the form was configured,
        // otherwise fall back to saved settings (which include defaults)
        if ($request->request->getBoolean('configured')) {
            $flatten = $request->request->all('flatten');
            $semester = $request->request->all('semester');
            $semesterFlat = $request->request->all('semesterFlat');
            $merge = $request->request->getBoolean('merge');
            $requested = (string) $request->request->get('electiveGrouping', '');
            $electiveGrouping = in_array($requested, ProgramTreeMapper::ELECTIVE_GROUPINGS, true)
                ? $requested
                : ProgramTreeMapper::ELECTIVES_PER_TRACK;
        } else {
            /** @var list<string> $flatten */
            $flatten = $saved['flatten'] ?? Program::DEFAULT_FLATTEN;
            /** @var list<string> $semester */
            $semester = $saved['semester'] ?? [];
            /** @var list<string> $semesterFlat */
            $semesterFlat = $saved['semesterFlat'] ?? [];
            $merge = (bool) ($saved['merge'] ?? true);
            $electiveGrouping = $saved['electiveGrouping'] ?? ProgramTreeMapper::ELECTIVES_PER_TRACK;
        }

        // Enrich: explicit request parameter takes precedence over saved settings
        if ($request->request->has('enrich')) {
            $enrich = $request->request->getBoolean('enrich');
        } else {
            $enrich = (bool) ($saved['enrich'] ?? true);
        }

        return [
            'programId' => $programId,
            'lang' => $lang,
            'flatten' => array_values(array_filter(array_map('strval', $flatten))),
            'semester' => array_values(array_filter(array_map('strval', $semester))),
            'semesterFlat' => array_values(array_filter(array_map('strval', $semesterFlat))),
            'merge' => $merge,
            'enrich' => $enrich,
            'electiveGrouping' => $electiveGrouping,
        ];
    }

    /**
     * @param array{
     *     programId: string,
     *     lang: 'nl'|'en',
     *     flatten: list<string>,
     *     semester: list<string>,
     *     semesterFlat: list<string>,
     *     merge: bool,
     *     enrich: bool,
     *     electiveGrouping: string,
     * } $options
     */
    private function buildProgramData(array $options): ?ProgramData
    {
        if ($options['programId'] === '') {
            return null;
        }
        $source = $this->client->fetchProgramSource($options['programId']);
        if ($source === null) {
            return null;
        }

        return $this->mapper->map(
            $source,
            $options['programId'],
            $options['lang'],
            $options['flatten'],
            $options['semester'],
            $options['merge'],
            $options['electiveGrouping'],
            $options['semesterFlat'],
        );
    }

    /**
     * Flatten the named tree into a depth-annotated list of selectable groups for the preview
     * checkboxes.
     *
     * @param list<ModuleData> $modules
     *
     * @return list<array{kulId: string, name: string, depth: int}>
     */
    private function listGroups(array $modules, int $depth = 0): array
    {
        $groups = [];
        foreach ($modules as $module) {
            $groups[] = ['kulId' => $module->kulId, 'name' => $module->name, 'depth' => $depth];
            foreach ($this->listGroups($module->children, $depth + 1) as $child) {
                $groups[] = $child;
            }
        }

        return $groups;
    }

    /**
     * @return array<string, true>
     */
    private function existingModuleKulIds(ProgramData $program): array
    {
        $kulIds = [];
        $collect = static function (ModuleData $m) use (&$collect, &$kulIds): void {
            $kulIds[$m->kulId] = true;
            foreach ($m->children as $child) {
                $collect($child);
            }
        };
        foreach ($program->modules as $module) {
            $collect($module);
        }

        $existing = [];
        foreach (array_keys($kulIds) as $kulId) {
            if ($this->moduleRepository->findOneByKulId((string) $kulId) !== null) {
                $existing[(string) $kulId] = true;
            }
        }

        return $existing;
    }

    /**
     * @return array<string, true>
     */
    private function existingCourseCodes(ProgramData $program): array
    {
        $codes = $program->allCourseCodes();
        if ($codes === []) {
            return [];
        }
        $existing = [];
        foreach ($this->courseRepository->findBy(['code' => $codes]) as $course) {
            $existing[$course->getCode()] = true;
        }

        return $existing;
    }
}
