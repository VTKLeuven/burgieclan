<?php

namespace App\Tests\Entity;

use App\Entity\Course;
use App\Entity\Professor;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class ProfessorTest extends KernelTestCase
{
    public function testSetUNumber(): void
    {
        $professor = new Professor();
        $professor->setUNumber('u1234567');

        $this->assertSame('u1234567', $professor->getUNumber());
    }

    public function testSetName(): void
    {
        $professor = new Professor();
        $professor->setName('Prof. Dr. John Doe');

        $this->assertSame('Prof. Dr. John Doe', $professor->getName());
    }

    public function testSetEmail(): void
    {
        $professor = new Professor();
        $professor->setEmail('john.doe@kuleuven.be');

        $this->assertSame('john.doe@kuleuven.be', $professor->getEmail());
    }

    public function testSetPictureUrl(): void
    {
        $professor = new Professor();
        $professor->setPictureUrl('https://example.com/picture.jpg');

        $this->assertSame('https://example.com/picture.jpg', $professor->getPictureUrl());
    }

    public function testSetDepartment(): void
    {
        $professor = new Professor();
        $professor->setDepartment('Department of Computer Science');

        $this->assertSame('Department of Computer Science', $professor->getDepartment());
    }

    public function testSetTitle(): void
    {
        $professor = new Professor();
        $professor->setTitle('Professor');

        $this->assertSame('Professor', $professor->getTitle());
    }

    public function testSetLastUpdated(): void
    {
        $professor = new Professor();
        $date = new \DateTime('2023-01-01 12:00:00');
        $professor->setLastUpdated($date);

        $this->assertSame($date, $professor->getLastUpdated());
    }

    public function testAddCourse(): void
    {
        $professor = new Professor();
        $course = new Course();

        $professor->addCourse($course);

        $this->assertTrue($professor->getCourses()->contains($course));
        $this->assertTrue($course->getProfessors()->contains($professor));
    }

    public function testRemoveCourse(): void
    {
        $professor = new Professor();
        $course = new Course();

        $professor->addCourse($course);
        $professor->removeCourse($course);

        $this->assertFalse($professor->getCourses()->contains($course));
        $this->assertFalse($course->getProfessors()->contains($professor));
    }

    public function testToString(): void
    {
        $professor = new Professor();
        $professor->setName('Prof. Dr. John Doe');

        $this->assertSame('Prof. Dr. John Doe', (string) $professor);
    }

    public function testToStringWithUNumberOnly(): void
    {
        $professor = new Professor();
        $professor->setUNumber('u1234567');

        $this->assertSame('u1234567', (string) $professor);
    }

    public function testToStringEmpty(): void
    {
        $professor = new Professor();

        $this->assertSame('', (string) $professor);
    }
}