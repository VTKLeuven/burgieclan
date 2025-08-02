<?php

namespace App\Tests\Service;

use App\Entity\Professor;
use App\Repository\ProfessorRepository;
use App\Service\ProfessorService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class ProfessorServiceTest extends TestCase
{
    private ProfessorService $professorService;
    private MockObject $httpClient;
    private MockObject $entityManager;
    private MockObject $professorRepository;
    private MockObject $logger;

    protected function setUp(): void
    {
        $this->httpClient = $this->createMock(HttpClientInterface::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->professorRepository = $this->createMock(ProfessorRepository::class);
        $this->logger = $this->createMock(LoggerInterface::class);

        $this->professorService = new ProfessorService(
            $this->httpClient,
            $this->entityManager,
            $this->professorRepository,
            $this->logger
        );
    }

    public function testFetchAndUpdateProfessorCreatesNewProfessor(): void
    {
        $uNumber = 'u1234567';

        $this->professorRepository
            ->expects($this->once())
            ->method('findByUNumber')
            ->with($uNumber)
            ->willReturn(null);

        $this->entityManager
            ->expects($this->once())
            ->method('persist')
            ->with($this->isInstanceOf(Professor::class));

        $this->entityManager
            ->expects($this->once())
            ->method('flush');

        $result = $this->professorService->fetchAndUpdateProfessor($uNumber);

        $this->assertInstanceOf(Professor::class, $result);
        $this->assertSame($uNumber, $result->getUNumber());
        $this->assertNotNull($result->getName());
        $this->assertNotNull($result->getLastUpdated());
    }

    public function testFetchAndUpdateProfessorUpdatesExistingProfessor(): void
    {
        $uNumber = 'u1234567';
        $existingProfessor = new Professor();
        $existingProfessor->setUNumber($uNumber);
        $existingProfessor->setName('Old Name');

        $this->professorRepository
            ->expects($this->once())
            ->method('findByUNumber')
            ->with($uNumber)
            ->willReturn($existingProfessor);

        $this->entityManager
            ->expects($this->never())
            ->method('persist');

        $this->entityManager
            ->expects($this->once())
            ->method('flush');

        $result = $this->professorService->fetchAndUpdateProfessor($uNumber);

        $this->assertSame($existingProfessor, $result);
        $this->assertNotSame('Old Name', $result->getName()); // Should be updated with mock data
        $this->assertNotNull($result->getLastUpdated());
    }

    public function testFetchAndUpdateProfessorWithInvalidUNumber(): void
    {
        $invalidUNumber = 'invalid';

        $this->logger
            ->expects($this->once())
            ->method('warning')
            ->with($this->stringContains('No data found for professor u-number'));

        $result = $this->professorService->fetchAndUpdateProfessor($invalidUNumber);

        $this->assertNull($result);
    }

    public function testUpdateAllProfessors(): void
    {
        $professor1 = new Professor();
        $professor1->setUNumber('u1234567');
        $professor2 = new Professor();
        $professor2->setUNumber('u1234568');

        $this->professorRepository
            ->expects($this->once())
            ->method('findAll')
            ->willReturn([$professor1, $professor2]);

        // Mock the repository calls for individual updates
        $this->professorRepository
            ->expects($this->exactly(2))
            ->method('findByUNumber')
            ->willReturnOnConsecutiveCalls($professor1, $professor2);

        $this->entityManager
            ->expects($this->exactly(2))
            ->method('flush');

        $results = $this->professorService->updateAllProfessors();

        $this->assertSame(2, $results['updated']);
        $this->assertSame(0, $results['failed']);
    }

    public function testUpdateOutdatedProfessors(): void
    {
        $professor = new Professor();
        $professor->setUNumber('u1234567');
        $professor->setLastUpdated(new \DateTime('-2 weeks')); // Older than 1 week

        $this->professorRepository
            ->expects($this->once())
            ->method('findOutdated')
            ->with($this->isInstanceOf(\DateTimeInterface::class))
            ->willReturn([$professor]);

        $this->professorRepository
            ->expects($this->once())
            ->method('findByUNumber')
            ->willReturn($professor);

        $this->entityManager
            ->expects($this->once())
            ->method('flush');

        $results = $this->professorService->updateOutdatedProfessors();

        $this->assertSame(1, $results['updated']);
        $this->assertSame(0, $results['failed']);
    }
}