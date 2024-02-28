<?php

namespace App\Tests\Entity;

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
}