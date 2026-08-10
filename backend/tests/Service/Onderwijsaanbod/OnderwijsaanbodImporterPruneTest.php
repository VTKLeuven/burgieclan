<?php

namespace App\Tests\Service\Onderwijsaanbod;

use App\Entity\Course;
use App\Entity\Module;
use App\Repository\ModuleRepository;
use App\Service\Onderwijsaanbod\Dto\CourseData;
use App\Service\Onderwijsaanbod\Dto\ModuleData;
use App\Service\Onderwijsaanbod\Dto\ProgramData;
use App\Service\Onderwijsaanbod\OnderwijsaanbodImporter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Zenstruck\Foundry\Test\ResetDatabase;

/**
 * The importer used to only ever add, so changing a structural option left the previous shape
 * attached beside the new one and every course rendered twice. These cover the reconciliation
 * that replaced that behaviour, and the three things it must not touch.
 */
class OnderwijsaanbodImporterPruneTest extends KernelTestCase
{
    use ResetDatabase;

    private OnderwijsaanbodImporter $importer;
    private EntityManagerInterface $entityManager;
    private ModuleRepository $moduleRepository;

    protected function setUp(): void
    {
        self::bootKernel();
        $container = static::getContainer();
        $this->importer = $container->get(OnderwijsaanbodImporter::class);
        $this->entityManager = $container->get(EntityManagerInterface::class);
        $this->moduleRepository = $container->get(ModuleRepository::class);
    }

    public function testStructuralChangeDetachesTheSupersededModules(): void
    {
        $this->importer->import($this->namedTree(), enrich: false);
        $result = $this->importer->import($this->semesterTree(), enrich: false);

        $this->assertSame(2, $result->modulesDetached);
        $this->assertSame(['Semester 1'], $this->childNamesOfRoot());
    }

    public function testDetachedModuleKeepsItsCoursesAndPosition(): void
    {
        $this->importer->import($this->namedTree(), enrich: false);
        $this->importer->import($this->semesterTree(), enrich: false);

        $this->entityManager->clear();
        $stale = $this->moduleRepository->findOneByKulId('P1:a');

        $this->assertInstanceOf(Module::class, $stale, 'detached, not deleted');
        $this->assertNull($stale->getProgram());
        $this->assertCount(1, $stale->getCourses());
        $this->assertSame(10, $stale->getPosition());
    }

    public function testSwitchingTheOptionBackReadoptsTheSameRow(): void
    {
        $this->importer->import($this->namedTree(), enrich: false);
        $this->entityManager->clear();
        $originalId = $this->moduleRepository->findOneByKulId('P1:a')?->getId();

        $this->importer->import($this->semesterTree(), enrich: false);
        $result = $this->importer->import($this->namedTree(), enrich: false);

        $this->assertSame(0, $result->modulesCreated, 'the orphaned rows should be re-adopted, not rebuilt');
        $this->assertSame(['Materials Families', 'Methods and Techniques'], $this->childNamesOfRoot());
        $this->assertSame($originalId, $this->moduleRepository->findOneByKulId('P1:a')?->getId());
    }

    public function testManuallyCreatedModulesAreNeverDetached(): void
    {
        $this->importer->import($this->namedTree(), enrich: false);
        $this->entityManager->clear();

        // No kulId: the admin made this by hand, so the importer does not own it.
        $manual = new Module();
        $manual->setName('Handpicked extras');
        $manual->setPosition(99);
        $this->moduleRepository->findOneByKulId('P1:root')?->addModule($manual);
        $this->entityManager->persist($manual);
        $this->entityManager->flush();

        $result = $this->importer->import($this->semesterTree(), enrich: false);

        $this->assertSame(2, $result->modulesDetached, 'only the two imported children');
        $this->assertSame(['Semester 1', 'Handpicked extras'], $this->childNamesOfRoot());
    }

    /**
     * A real module group vanishing means KU Leuven changed the curriculum...
     */
    public function testAVanishedModuleGroupIsReportedAsAKuLeuvenChange(): void
    {
        $this->importer->import($this->namedTree(), enrich: false);
        $result = $this->importer->import($this->semesterTree(), enrich: false);

        self::assertStringContainsString(
            'Module "Materials Families" is no longer in the KU Leuven programme, so it is detached',
            implode("\n", $result->warnings),
        );
    }

    /**
     * ...but a synthetic folder vanishing only means the admin changed a structural option. Saying
     * "KU Leuven dropped it" would send them hunting for a curriculum change that never happened.
     */
    public function testAVanishedSyntheticFolderIsReportedAsAnOptionChange(): void
    {
        $this->importer->import($this->semesterTree(), enrich: false);
        $result = $this->importer->import($this->namedTree(), enrich: false);

        self::assertStringContainsString(
            'Folder "Semester 1" was built by structure options this import no longer uses',
            implode("\n", $result->warnings),
        );
    }

    public function testDryRunWordsTheDetachmentAsStillToCome(): void
    {
        $this->importer->import($this->namedTree(), enrich: false);
        $result = $this->importer->import($this->semesterTree(), enrich: false, dryRun: true);

        $warnings = implode("\n", $result->warnings);
        self::assertStringContainsString('about to be detached from', $warnings);
        self::assertStringNotContainsString('so it is detached from', $warnings);
    }

    /**
     * The whole point of storing both titles: a course shared by a Dutch and an English programme
     * must not lose one of them because a single-language import ran last.
     */
    public function testASingleLanguageImportDoesNotWipeTheOtherTranslation(): void
    {
        $bilingual = new ProgramData(
            'P1',
            'Test Programme',
            [
            new ModuleData(
                'P1:root',
                'Root',
                [],
                [
                new CourseData(
                    'AAA111',
                    'Distributed Systems',
                    'Gedistribueerde systemen',
                    'Distributed Systems',
                    'en',
                    6
                ),
                ]
            ),
            ]
        );
        // A second programme that only publishes a Dutch title for the very same course.
        $dutchOnly = new ProgramData(
            'P2',
            'Andere opleiding',
            [
            new ModuleData(
                'P2:root',
                'Wortel',
                [],
                [
                new CourseData('AAA111', 'Gedistribueerde systemen', 'Gedistribueerde systemen', null, 'en', 6),
                ]
            ),
            ]
        );

        $this->importer->import($bilingual, enrich: false);
        $this->importer->import($dutchOnly, enrich: false);

        $this->entityManager->clear();
        $course = $this->entityManager->getRepository(Course::class)->findOneBy(['code' => 'AAA111']);

        self::assertInstanceOf(Course::class, $course);
        self::assertSame('Distributed Systems', $course->getNameEn(), 'the English title must survive');
        self::assertSame('Gedistribueerde systemen', $course->getNameNl());
        self::assertSame('Distributed Systems', $course->getLocalizedName('en'));
    }

    public function testUnchangedReimportDetachesNothing(): void
    {
        $this->importer->import($this->namedTree(), enrich: false);
        $result = $this->importer->import($this->namedTree(), enrich: false);

        $this->assertSame(0, $result->modulesDetached);
        $this->assertSame(['Materials Families', 'Methods and Techniques'], $this->childNamesOfRoot());
    }

    public function testDryRunReportsTheDetachmentsWithoutApplyingThem(): void
    {
        $this->importer->import($this->namedTree(), enrich: false);
        $result = $this->importer->import($this->semesterTree(), enrich: false, dryRun: true);

        $this->assertSame(2, $result->modulesDetached);
        $this->assertSame(['Materials Families', 'Methods and Techniques'], $this->childNamesOfRoot());
    }

    /**
     * The shape KU Leuven gives us: a compulsory-courses folder split into named topic groups.
     */
    private function namedTree(): ProgramData
    {
        return new ProgramData(
            'P1',
            'Test Programme',
            [
            new ModuleData(
                'P1:root',
                'Common Compulsory Courses',
                [
                new ModuleData('P1:a', 'Materials Families', [], [$this->course('AAA111')]),
                new ModuleData('P1:b', 'Methods and Techniques', [], [$this->course('BBB222')]),
                ]
            ),
            ]
        );
    }

    /**
     * The same folder after the admin switches on semester grouping: the topic groups are gone and
     * their courses are redistributed into Semester folders.
     */
    private function semesterTree(): ProgramData
    {
        return new ProgramData(
            'P1',
            'Test Programme',
            [
            new ModuleData(
                'P1:root',
                'Common Compulsory Courses',
                [
                new ModuleData(
                    'sem:P1:P1:root:1',
                    'Semester 1',
                    [],
                    [
                    $this->course('AAA111'),
                    $this->course('BBB222'),
                    ]
                ),
                ]
            ),
            ]
        );
    }

    private function course(string $code): CourseData
    {
        return new CourseData($code, 'Course ' . $code, 'Vak ' . $code, 'Course ' . $code, 'en', 6);
    }

    /**
     * @return list<string> child module names, read back from the database in display order
     */
    private function childNamesOfRoot(): array
    {
        $this->entityManager->clear();
        $root = $this->moduleRepository->findOneByKulId('P1:root');
        $this->assertInstanceOf(Module::class, $root);

        return array_map(
            static fn (Module $m): string => $m->getName(),
            $root->getModules()->toArray(),
        );
    }
}
