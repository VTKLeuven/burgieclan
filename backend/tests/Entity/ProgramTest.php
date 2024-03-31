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
}
