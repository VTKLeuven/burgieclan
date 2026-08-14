<?php

namespace App\Tests\Entity;

use App\Entity\Module;
use App\Entity\Program;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class ProgramTest extends KernelTestCase
{
    public function testSetName(): void
    {
        $program = new Program();
        $program->setName("Program 1");

        $this->assertSame("Program 1", $program->getName());
    }

    public function testAddRemoveModules(): void
    {
        $program = new Program();
        $m1 = new Module();
        $m1->setName("Module 1");
        $m2 = new Module();
        $m2->setName("Module 2");
        $program->addModule($m1);
        $program->addModule($m2);

        $m3 = new Module();
        $m3->setName("Module 3");

        $this->assertCount(2, $program->getModules());
        $this->assertContains($m1, $program->getModules());
        $this->assertContains($m2, $program->getModules());
        $this->assertNotContains($m3, $program->getModules());
        $this->assertSame($program, $m1->getProgram());
        $this->assertSame($program, $m2->getProgram());

        $program->removeModule($m1);
        $this->assertCount(1, $program->getModules());
        $this->assertNotContains($m1, $program->getModules());
        $this->assertContains($m2, $program->getModules());
        $this->assertNotContains($m3, $program->getModules());
    }

    /**
     * Programmes imported before semesterFlat existed have no such key in their stored JSON. The
     * resolver has to fill it in rather than let an undefined index reach the mapper.
     */
    public function testResolvedImportSettingsDefaultSemesterFlatForOlderPrograms(): void
    {
        $program = new Program();
        $program->setImportSettings(
            [
            'lang' => 'en',
            'flatten' => ['Compulsory courses'],
            'semester' => ['Common core'],
            'merge' => true,
            'enrich' => true,
            'electiveGrouping' => 'perTrack',
            ]
        );

        $settings = $program->getResolvedImportSettings();

        $this->assertSame([], $settings['semesterFlat']);
        $this->assertSame(['Common core'], $settings['semester'], 'the existing keys stay put');
    }

    public function testLanguageDefaultsToDutchForProgramsThatWereNeverImported(): void
    {
        $this->assertSame('nl', (new Program())->getLanguage());
    }

    /**
     * The language column is denormalized from the import settings, so importing has to move it.
     */
    public function testImportingSetsTheLanguage(): void
    {
        $program = new Program();
        $program->setImportSettings(['lang' => 'en']);

        $this->assertSame('en', $program->getLanguage());
    }

    /**
     * Correcting the language by hand in the admin has to move the import parameter with it,
     * otherwise the next Quick Sync re-fetches module names in the language we just corrected away
     * from and silently undoes half the fix.
     */
    public function testCorrectingTheLanguageMovesTheImportParameterToo(): void
    {
        $program = new Program();
        $program->setImportSettings(['lang' => 'nl', 'merge' => false]);

        $program->setLanguage('en');

        $this->assertSame('en', $program->getLanguage());
        $this->assertSame('en', $program->getResolvedImportSettings()['lang']);
        $this->assertFalse(
            $program->getResolvedImportSettings()['merge'],
            'the unrelated import settings must survive'
        );
    }

    public function testUnknownLanguageFallsBackToDutch(): void
    {
        $program = new Program();
        $program->setLanguage('fr');

        $this->assertSame('nl', $program->getLanguage());
    }

    public function testResolvedImportSettingsKeepsStoredSemesterFlat(): void
    {
        $program = new Program();
        $program->setImportSettings(['semesterFlat' => ['Options', 'Compulsory courses']]);

        $this->assertSame(
            ['Options', 'Compulsory courses'],
            $program->getResolvedImportSettings()['semesterFlat'],
        );
    }
}
