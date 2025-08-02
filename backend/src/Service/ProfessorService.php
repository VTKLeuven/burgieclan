<?php

namespace App\Service;

use App\Entity\Professor;
use App\Repository\ProfessorRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Psr\Log\LoggerInterface;

/**
 * Service to fetch and update professor information from KUL website
 */
class ProfessorService
{
    private const KUL_BASE_URL = 'https://www.kuleuven.be/wieiswie/';
    
    public function __construct(
        private HttpClientInterface $httpClient,
        private EntityManagerInterface $entityManager,
        private ProfessorRepository $professorRepository,
        private LoggerInterface $logger
    ) {
    }

    /**
     * Fetch professor information from KUL and create/update entity
     */
    public function fetchAndUpdateProfessor(string $uNumber): ?Professor
    {
        try {
            $professorData = $this->fetchProfessorFromKul($uNumber);
            
            if (!$professorData) {
                $this->logger->warning('No data found for professor u-number: ' . $uNumber);
                return null;
            }

            $professor = $this->professorRepository->findByUNumber($uNumber);
            
            if (!$professor) {
                $professor = new Professor();
                $professor->setUNumber($uNumber);
                $this->entityManager->persist($professor);
            }

            $this->updateProfessorData($professor, $professorData);
            $professor->setLastUpdated(new \DateTime());
            
            $this->entityManager->flush();
            
            return $professor;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to fetch professor data for ' . $uNumber . ': ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Update all professors' information from KUL
     */
    public function updateAllProfessors(): array
    {
        $professors = $this->professorRepository->findAll();
        $results = ['updated' => 0, 'failed' => 0];
        
        foreach ($professors as $professor) {
            $updated = $this->fetchAndUpdateProfessor($professor->getUNumber());
            if ($updated) {
                $results['updated']++;
            } else {
                $results['failed']++;
            }
        }
        
        return $results;
    }

    /**
     * Update outdated professors (older than 1 week)
     */
    public function updateOutdatedProfessors(): array
    {
        $threshold = new \DateTime('-1 week');
        $professors = $this->professorRepository->findOutdated($threshold);
        $results = ['updated' => 0, 'failed' => 0];
        
        foreach ($professors as $professor) {
            $updated = $this->fetchAndUpdateProfessor($professor->getUNumber());
            if ($updated) {
                $results['updated']++;
            } else {
                $results['failed']++;
            }
        }
        
        return $results;
    }

    /**
     * Fetch professor data from KUL website
     * This is a mock implementation - would need actual KUL API integration
     */
    private function fetchProfessorFromKul(string $uNumber): ?array
    {
        try {
            // Mock implementation - in reality this would call KUL's API or scrape their website
            // For now, we'll generate some fake data based on the u-number pattern
            
            if (!preg_match('/^u\d{7}$/', $uNumber)) {
                return null;
            }
            
            // Mock data - in production this would fetch from actual KUL website
            $mockData = [
                'name' => 'Prof. Dr. ' . $this->generateMockName($uNumber),
                'email' => strtolower(str_replace(' ', '.', $this->generateMockName($uNumber))) . '@kuleuven.be',
                'pictureUrl' => 'https://www.kuleuven.be/wieiswie/images/' . $uNumber . '.jpg',
                'department' => $this->generateMockDepartment(),
                'title' => $this->generateMockTitle()
            ];
            
            $this->logger->info('Mock professor data generated for ' . $uNumber);
            return $mockData;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to fetch from KUL for ' . $uNumber . ': ' . $e->getMessage());
            return null;
        }
    }

    private function updateProfessorData(Professor $professor, array $data): void
    {
        if (isset($data['name'])) {
            $professor->setName($data['name']);
        }
        if (isset($data['email'])) {
            $professor->setEmail($data['email']);
        }
        if (isset($data['pictureUrl'])) {
            $professor->setPictureUrl($data['pictureUrl']);
        }
        if (isset($data['department'])) {
            $professor->setDepartment($data['department']);
        }
        if (isset($data['title'])) {
            $professor->setTitle($data['title']);
        }
    }

    private function generateMockName(string $uNumber): string
    {
        $firstNames = ['Jan', 'Marie', 'Pieter', 'Ann', 'Luc', 'Sarah', 'Thomas', 'Lisa'];
        $lastNames = ['Janssens', 'Peeters', 'Van den Berg', 'De Smet', 'Willems', 'Mertens'];
        
        $seed = hexdec(substr(md5($uNumber), 0, 8));
        $firstName = $firstNames[$seed % count($firstNames)];
        $lastName = $lastNames[($seed >> 8) % count($lastNames)];
        
        return $firstName . ' ' . $lastName;
    }

    private function generateMockDepartment(): string
    {
        $departments = [
            'Department of Computer Science',
            'Department of Mathematics',
            'Department of Physics',
            'Department of Chemistry',
            'Department of Biology',
            'Faculty of Engineering Science'
        ];
        
        return $departments[array_rand($departments)];
    }

    private function generateMockTitle(): string
    {
        $titles = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'];
        return $titles[array_rand($titles)];
    }
}