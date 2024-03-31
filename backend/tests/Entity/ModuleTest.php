<?php

namespace App\Tests\Entity;

use App\Entity\Course;
use App\Entity\Module;
use App\Entity\Program;
use PhpParser\Node\Expr\AssignOp\Mod;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class ModuleTest extends KernelTestCase
{
    public function testSetName(): void
    {
        $module = new Module();
        $module->setName("Module 1");

        $this->assertSame("Module 1", $module->getName());
    }

    public function testSetProgram(): void
    {
        $module = new Module();
        $program = new Program();
        $module->setProgram($program);

        $this->assertSame($program, $module->getProgram());
    }

    public function testAddRemoveCourse(): void
    {
        $module = new Module();
        $c1 = new Course();
        $c2 = new Course();
        $c3 = new Course();
        $module->addCourse($c1);
        $module->addCourse($c2);

        $this->assertCount(2, $module->getCourses());
        $this->assertContains($c1, $module->getCourses());
        $this->assertContains($c2, $module->getCourses());
        $this->assertNotContains($c3, $module->getCourses());

        $module->removeCourse($c1);
        $this->assertCount(1, $module->getCourses());
        $this->assertNotContains($c1, $module->getCourses());
        $this->assertContains($c2, $module->getCourses());
        $this->assertNotContains($c3, $module->getCourses());
    }
}
