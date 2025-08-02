<?php

namespace App\Command;

use App\Entity\Course;
use App\Entity\Professor;
use App\Repository\CourseRepository;
use App\Repository\ProfessorRepository;
use App\Service\ProfessorService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:migrate-professors',
    description: 'Migrate professor data from JSON format to Professor entities',
)]
class MigrateProfessorsCommand extends Command
{
    public function __construct(
        private CourseRepository $courseRepository,
        private ProfessorRepository $professorRepository,
        private ProfessorService $professorService,
        private EntityManagerInterface $entityManager
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Show what would be migrated without making changes')
            ->addOption('fetch-data', null, InputOption::VALUE_NONE, 'Fetch professor data from KUL during migration');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $dryRun = $input->getOption('dry-run');
        $fetchData = $input->getOption('fetch-data');

        $io->title('Migrating Professor Data');

        if ($dryRun) {
            $io->note('DRY RUN MODE - No changes will be made');
        }

        // Get all courses that have professor data in JSON format
        $courses = $this->courseRepository->findAll();
        $professorsCreated = 0;
        $relationshipsCreated = 0;
        $errors = 0;

        foreach ($courses as $course) {
            $professorData = $this->getProfessorJsonData($course);
            
            if (empty($professorData)) {
                continue;
            }

            $io->section("Processing course: {$course->getName()} ({$course->getCode()})");
            $io->text("Found professor data: " . implode(', ', $professorData));

            foreach ($professorData as $uNumber) {
                try {
                    if (!preg_match('/^u\d{7}$/', $uNumber)) {
                        $io->warning("Invalid u-number format: {$uNumber}");
                        $errors++;
                        continue;
                    }

                    // Check if professor already exists
                    $professor = $this->professorRepository->findByUNumber($uNumber);
                    
                    if (!$professor) {
                        if ($dryRun) {
                            $io->text("Would create professor: {$uNumber}");
                        } else {
                            if ($fetchData) {
                                // Fetch data from KUL
                                $professor = $this->professorService->fetchAndUpdateProfessor($uNumber);
                                if ($professor) {
                                    $io->success("Created professor with KUL data: {$professor->getName()} ({$uNumber})");
                                } else {
                                    // Create with basic data
                                    $professor = $this->createBasicProfessor($uNumber);
                                    $io->text("Created basic professor: {$uNumber}");
                                }
                            } else {
                                // Create with basic data
                                $professor = $this->createBasicProfessor($uNumber);
                                $io->text("Created basic professor: {$uNumber}");
                            }
                            $professorsCreated++;
                        }
                    } else {
                        $io->text("Professor already exists: {$professor->getName()} ({$uNumber})");
                    }

                    // Add relationship
                    if (!$dryRun && $professor) {
                        if (!$course->getProfessors()->contains($professor)) {
                            $course->addProfessor($professor);
                            $relationshipsCreated++;
                            $io->text("Added relationship: {$course->getCode()} -> {$uNumber}");
                        }
                    } else if ($dryRun) {
                        $io->text("Would add relationship: {$course->getCode()} -> {$uNumber}");
                    }

                } catch (\Exception $e) {
                    $io->error("Error processing {$uNumber}: " . $e->getMessage());
                    $errors++;
                }
            }
        }

        if (!$dryRun) {
            $this->entityManager->flush();
        }

        $io->success('Migration completed!');
        $io->table(['Metric', 'Count'], [
            ['Professors created', $professorsCreated],
            ['Relationships created', $relationshipsCreated],
            ['Errors', $errors],
        ]);

        if (!$dryRun && $errors === 0) {
            $io->note('You can now safely remove the JSON professors column from the course table');
        }

        return Command::SUCCESS;
    }

    private function getProfessorJsonData(Course $course): array
    {
        // This method would access the old JSON data
        // Since we're changing the entity, we need to use raw SQL or reflection
        $sql = 'SELECT professors FROM course WHERE id = :id';
        $connection = $this->entityManager->getConnection();
        $result = $connection->executeQuery($sql, ['id' => $course->getId()]);
        $data = $result->fetchOne();
        
        if (!$data) {
            return [];
        }

        $decoded = json_decode($data, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function createBasicProfessor(string $uNumber): Professor
    {
        $professor = new Professor();
        $professor->setUNumber($uNumber);
        $professor->setName("Prof. {$uNumber}"); // Placeholder name
        $professor->setLastUpdated(new \DateTime());
        
        $this->entityManager->persist($professor);
        
        return $professor;
    }
}