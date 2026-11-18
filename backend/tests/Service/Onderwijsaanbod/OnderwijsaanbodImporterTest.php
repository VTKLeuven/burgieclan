<?php

namespace App\Tests\Service\Onderwijsaanbod;

use App\Entity\Course;
use App\Entity\Module;
use App\Entity\Program;
use App\Repository\CourseRepository;
use App\Repository\ModuleRepository;
use App\Repository\ProgramRepository;
use App\Service\Onderwijsaanbod\Dto\CourseData;
use App\Service\Onderwijsaanbod\Dto\ModuleData;
use App\Service\Onderwijsaanbod\Dto\ProgramData;
use App\Service\Onderwijsaanbod\OnderwijsaanbodClient;
use App\Service\Onderwijsaanbod\OnderwijsaanbodImporter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Zenstruck\Foundry\Test\ResetDatabase;

class OnderwijsaanbodImporterTest extends KernelTestCase
{
    use ResetDatabase;

    private OnderwijsaanbodImporter $importer;
    private EntityManagerInterface $entityManager;
    private ProgramRepository $programRepository;
    private ModuleRepository $moduleRepository;
    private CourseRepository $courseRepository;

    protected function setUp(): void
    {
        self::bootKernel();
        $container = static::getContainer();
        $this->importer = $container->get(OnderwijsaanbodImporter::class);
        $this->entityManager = $container->get(EntityManagerInterface::class);
        $this->programRepository = $container->get(ProgramRepository::class);
        $this->moduleRepository = $container->get(ModuleRepository::class);
        $this->courseRepository = $container->get(CourseRepository::class);
    }

    public function testImportPersistsSettingsAndLanguageAtomically(): void
    {
        $settings = [
            'programId' => 'P10',
            'lang' => 'en',
            'flatten' => [],
            'semester' => [],
            'semesterFlat' => [],
            'merge' => true,
            'enrich' => false,
            'electiveGrouping' => 'programme',
        ];

        $tree = new ProgramData(
            'P10',
            'Master of Engineering: Energy',
            [new ModuleData('P10:root', 'Core', [], [$this->course('AAA111')])],
        );

        $this->importer->import($tree, enrich: false, dryRun: false, importSettings: $settings);
        $this->entityManager->clear();

        $program = $this->programRepository->findOneByKulId('P10');
        self::assertInstanceOf(Program::class, $program);
        self::assertSame('en', $program->getLanguage());
        self::assertSame($settings, $program->getImportSettings());
    }

    public function testReimportPreservesCustomizedProgramNameUnlessLanguageChanges(): void
    {
        $dutchSettings = [
            'programId' => 'P11',
            'lang' => 'nl',
            'flatten' => [],
            'semester' => [],
            'semesterFlat' => [],
            'merge' => true,
            'enrich' => false,
            'electiveGrouping' => 'perTrack',
        ];
        $dutchTree = new ProgramData(
            'P11',
            'Bachelor in de ingenieurswetenschappen (Leuven)',
            [new ModuleData('P11:root', 'Basis', [], [$this->course('AAA111')])],
        );

        $this->importer->import($dutchTree, enrich: false, dryRun: false, importSettings: $dutchSettings);
        $this->entityManager->clear();

        $program = $this->programRepository->findOneByKulId('P11');
        self::assertInstanceOf(Program::class, $program);
        $program->setName('Bachelor: Burgie');
        $this->entityManager->flush();
        $this->entityManager->clear();

        // Same-language re-import must keep the shortened admin name.
        $this->importer->import($dutchTree, enrich: false, dryRun: false, importSettings: $dutchSettings);
        $this->entityManager->clear();

        $program = $this->programRepository->findOneByKulId('P11');
        self::assertInstanceOf(Program::class, $program);
        self::assertSame('Bachelor: Burgie', $program->getName());

        // Switching import language refreshes the programme name and stored language.
        $englishSettings = ['lang' => 'en'] + $dutchSettings;
        $englishTree = new ProgramData(
            'P11',
            'Bachelor of Engineering (Leuven)',
            [new ModuleData('P11:root', 'Core', [], [$this->course('AAA111')])],
        );
        $this->importer->import($englishTree, enrich: false, dryRun: false, importSettings: $englishSettings);
        $this->entityManager->clear();

        $program = $this->programRepository->findOneByKulId('P11');
        self::assertInstanceOf(Program::class, $program);
        self::assertSame('Bachelor of Engineering (Leuven)', $program->getName());
        self::assertSame('en', $program->getLanguage());
    }

    public function testMovingCoursesIntoChildModulesUnlinksThemFromParentWhileKeepingRemovedCourses(): void
    {
        $initial = new ProgramData(
            'P12',
            'Test Programme',
            [
                new ModuleData(
                    'P12:root',
                    'Common Core',
                    [],
                    [$this->course('AAA111'), $this->course('BBB222'), $this->course('CCC333')],
                ),
            ],
        );
        $this->importer->import($initial, enrich: false);

        // Regroup AAA111 and BBB222 under Semester 1; CCC333 is dropped upstream.
        $regrouped = new ProgramData(
            'P12',
            'Test Programme',
            [
                new ModuleData(
                    'P12:root',
                    'Common Core',
                    [
                        new ModuleData(
                            'sem:P12:P12:root:1',
                            'Semester 1',
                            [],
                            [$this->course('AAA111'), $this->course('BBB222')],
                        ),
                    ],
                    [],
                ),
            ],
        );
        $result = $this->importer->import($regrouped, enrich: false);
        $this->entityManager->clear();

        $root = $this->moduleRepository->findOneByKulId('P12:root');
        $sem1 = $this->moduleRepository->findOneByKulId('sem:P12:P12:root:1');
        self::assertInstanceOf(Module::class, $root);
        self::assertInstanceOf(Module::class, $sem1);

        $rootCodes = array_map(static fn (Course $c): string => $c->getCode(), $root->getCourses()->toArray());
        $sem1Codes = array_map(static fn (Course $c): string => $c->getCode(), $sem1->getCourses()->toArray());

        self::assertSame(['CCC333'], $rootCodes, 'moved courses are unlinked; dropped course stays');
        self::assertEqualsCanonicalizing(['AAA111', 'BBB222'], $sem1Codes);
        self::assertStringContainsString(
            'Course CCC333 is still linked to "Common Core" but is no longer in the KU Leuven programme',
            implode("\n", $result->warnings),
        );
    }

    public function testReparentedModuleIsDetachedFromOldParentAndReportsMove(): void
    {
        $flattened = new ProgramData(
            'P13',
            'Test Programme',
            [
                new ModuleData(
                    'P13:top',
                    'Options',
                    [new ModuleData('P13:child', 'Child', [], [$this->course('AAA111')])],
                ),
            ],
        );
        $this->importer->import($flattened, enrich: false);

        $unflattened = new ProgramData(
            'P13',
            'Test Programme',
            [
                new ModuleData(
                    'P13:top',
                    'Options',
                    [
                        new ModuleData(
                            'P13:mid',
                            'Mid',
                            [new ModuleData('P13:child', 'Child', [], [$this->course('AAA111')])],
                        ),
                    ],
                ),
            ],
        );
        $result = $this->importer->import($unflattened, enrich: false);
        $this->entityManager->clear();

        $top = $this->moduleRepository->findOneByKulId('P13:top');
        $mid = $this->moduleRepository->findOneByKulId('P13:mid');
        self::assertInstanceOf(Module::class, $top);
        self::assertInstanceOf(Module::class, $mid);

        $topChildNames = array_map(static fn (Module $m): string => $m->getName(), $top->getModules()->toArray());
        $midChildNames = array_map(static fn (Module $m): string => $m->getName(), $mid->getModules()->toArray());

        self::assertSame(['Mid'], $topChildNames);
        self::assertSame(['Child'], $midChildNames);
        self::assertSame(1, $result->modulesDetached);
        self::assertStringContainsString(
            'Module "Child" moved elsewhere in the programme structure, so it is detached from "Options".',
            implode("\n", $result->warnings),
        );
    }

    public function testSyncIdenticalCoursesPreservesCuratedLinksNotInOpoIndex(): void
    {
        $tree = new ProgramData(
            'P14',
            'Test Programme',
            [new ModuleData('P14:root', 'Root', [], [$this->course('AAA111'), $this->course('BBB222')])],
        );
        $this->importer->import($tree, enrich: false);
        $this->entityManager->clear();

        $courseA = $this->courseRepository->findOneBy(['code' => 'AAA111']);
        $courseB = $this->courseRepository->findOneBy(['code' => 'BBB222']);
        self::assertInstanceOf(Course::class, $courseA);
        self::assertInstanceOf(Course::class, $courseB);
        $courseA->addIdenticalCourse($courseB);
        $this->entityManager->flush();
        $this->entityManager->clear();

        $opoJson = json_encode(
            [
                'hits' => [
                    'hits' => [
                        ['_source' => ['ectsCode' => 'AAA111', 'moduleInstructorSet' => [], 'moduleLanguageSet' => []]],
                        ['_source' => ['ectsCode' => 'BBB222', 'moduleInstructorSet' => [], 'moduleLanguageSet' => []]],
                    ],
                ],
            ],
            JSON_THROW_ON_ERROR
        );

        $mockClient = new OnderwijsaanbodClient(new MockHttpClient([new MockResponse($opoJson)]));
        $importerWithMock = new OnderwijsaanbodImporter(
            $this->programRepository,
            $this->moduleRepository,
            $this->courseRepository,
            $this->entityManager,
            $mockClient,
        );

        $result = $importerWithMock->import($tree, enrich: true);
        $this->entityManager->clear();

        $courseA = $this->courseRepository->findOneBy(['code' => 'AAA111']);
        $courseB = $this->courseRepository->findOneBy(['code' => 'BBB222']);
        self::assertInstanceOf(Course::class, $courseA);
        self::assertInstanceOf(Course::class, $courseB);

        self::assertSame(
            ['BBB222'],
            array_map(static fn (Course $c): string => $c->getCode(), $courseA->getIdenticalCourses()->toArray()),
        );
        self::assertSame(
            ['AAA111'],
            array_map(static fn (Course $c): string => $c->getCode(), $courseB->getIdenticalCourses()->toArray()),
        );
        self::assertSame(
            ['Identical-course link AAA111 <-> BBB222 is not in the KU Leuven OPO index; left in place.'],
            $result->warnings,
        );
    }

    private function course(string $code): CourseData
    {
        return new CourseData($code, 'Course ' . $code, 'Vak ' . $code, 'Course ' . $code, 'nl', 6);
    }
}
