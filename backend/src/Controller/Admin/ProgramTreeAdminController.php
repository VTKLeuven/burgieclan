<?php

namespace App\Controller\Admin;

use App\Entity\Course;
use App\Entity\Module;
use App\Entity\Program;
use App\Entity\User;
use App\Repository\CourseRepository;
use App\Repository\ModuleRepository;
use App\Repository\ProgramRepository;
use App\Service\Onderwijsaanbod\OnderwijsaanbodClient;
use App\Service\Onderwijsaanbod\OnderwijsaanbodImporter;
use App\Service\Onderwijsaanbod\ProgramTreeMapper;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Attribute\AdminRoute;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted(User::ROLE_ADMIN)]
class ProgramTreeAdminController extends AbstractController
{
    public function __construct(
        private readonly ProgramRepository $programRepository,
        private readonly ModuleRepository $moduleRepository,
        private readonly CourseRepository $courseRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly OnderwijsaanbodClient $client,
        private readonly ProgramTreeMapper $mapper,
        private readonly OnderwijsaanbodImporter $importer,
    ) {}

    #[AdminRoute('/program/{id}/tree', name: 'program_tree')]
    public function tree(int $id): Response
    {
        $program = $this->programRepository->find($id);
        if (!$program) {
            $this->addFlash('danger', 'Program not found.');

            return $this->redirectToRoute(
                'admin',
                ['crudAction' => 'index', 'crudControllerFqcn' => ProgramCrudController::class]
            );
        }

        $allCourses = $this->courseRepository->findBy([], ['name' => 'ASC']);

        return $this->render(
            'admin/program/tree_editor.html.twig',
            [
                'program' => $program,
                'allCourses' => $allCourses,
            ]
        );
    }

    #[AdminRoute('/program/{id}/tree/add-module', name: 'program_tree_add_module', options: ['methods' => ['POST']])]
    public function addModule(int $id, Request $request): Response
    {
        $program = $this->programRepository->find($id);
        if (!$program) {
            $this->addFlash('danger', 'Program not found.');

            return $this->redirectToRoute(
                'admin',
                ['crudAction' => 'index', 'crudControllerFqcn' => ProgramCrudController::class]
            );
        }

        $name = trim((string) $request->request->get('name', ''));
        $parentModuleId = $request->request->get('parent_module_id');

        if ($name === '') {
            $this->addFlash('warning', 'Module name cannot be empty.');

            return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
        }

        $module = new Module();
        $module->setName($name);

        if ($parentModuleId !== null && $parentModuleId !== '') {
            $parentModule = $this->moduleRepository->find((int) $parentModuleId);
            if ($parentModule) {
                $parentModule->addModule($module);
            }
        } else {
            $program->addModule($module);
        }

        $this->entityManager->persist($module);
        $this->entityManager->flush();

        $this->addFlash('success', sprintf('Module "%s" created successfully.', $name));

        return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
    }

    #[AdminRoute('/program/{id}/tree/attach-courses', name: 'program_tree_attach_courses', options: ['methods' => ['POST']])]
    public function attachCourses(int $id, Request $request): Response
    {
        $program = $this->programRepository->find($id);
        if (!$program) {
            $this->addFlash('danger', 'Program not found.');

            return $this->redirectToRoute(
                'admin',
                ['crudAction' => 'index', 'crudControllerFqcn' => ProgramCrudController::class]
            );
        }

        $targetModuleId = (int) $request->request->get('target_module_id');
        /** @var array<string> $courseIds */
        $courseIds = $request->request->all('course_ids');

        $module = $this->moduleRepository->find($targetModuleId);
        if (!$module) {
            $this->addFlash('danger', 'Target module not found.');

            return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
        }

        $attachedCount = 0;
        foreach ($courseIds as $cId) {
            $course = $this->courseRepository->find((int) $cId);
            if ($course && !$module->getCourses()->contains($course)) {
                $module->addCourse($course);
                $attachedCount++;
            }
        }

        $this->entityManager->flush();

        $this->addFlash('success', sprintf('Attached %d course(s) to module "%s".', $attachedCount, $module->getName()));

        return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
    }

    #[AdminRoute('/program/{id}/tree/bulk-move', name: 'program_tree_bulk_move', options: ['methods' => ['POST']])]
    public function bulkMove(int $id, Request $request): Response
    {
        $program = $this->programRepository->find($id);
        if (!$program) {
            $this->addFlash('danger', 'Program not found.');

            return $this->redirectToRoute(
                'admin',
                ['crudAction' => 'index', 'crudControllerFqcn' => ProgramCrudController::class]
            );
        }

        $targetModuleId = (int) $request->request->get('destination_module_id');
        $destinationModule = $this->moduleRepository->find($targetModuleId);

        if (!$destinationModule) {
            $this->addFlash('danger', 'Destination module not found.');

            return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
        }

        /** @var array<string> $items */
        $items = $request->request->all('items');
        $movedCourses = 0;
        $movedModules = 0;

        foreach ($items as $item) {
            // Item format: "type:id:parentId" (e.g. "course:12:34" or "module:56:34" or "module:56:root")
            $parts = explode(':', $item);
            if (count($parts) < 3) {
                continue;
            }

            $type = $parts[0];
            $itemId = (int) $parts[1];
            $parentId = $parts[2];

            if ($type === 'course') {
                $course = $this->courseRepository->find($itemId);
                $oldParentModule = $this->moduleRepository->find((int) $parentId);

                if ($course) {
                    if ($oldParentModule) {
                        $oldParentModule->removeCourse($course);
                    }
                    $destinationModule->addCourse($course);
                    $movedCourses++;
                }
            } elseif ($type === 'module') {
                $subModule = $this->moduleRepository->find($itemId);
                if ($subModule && $subModule->getId() !== $destinationModule->getId()) {
                    if ($parentId === 'root') {
                        $program->removeModule($subModule);
                    } else {
                        $oldParentModule = $this->moduleRepository->find((int) $parentId);
                        if ($oldParentModule) {
                            $oldParentModule->removeModule($subModule);
                        }
                    }
                    $destinationModule->addModule($subModule);
                    $movedModules++;
                }
            }
        }

        $this->entityManager->flush();

        $this->addFlash(
            'success',
            sprintf(
                'Moved %d module(s) and %d course(s) to "%s".',
                $movedModules,
                $movedCourses,
                $destinationModule->getName()
            )
        );

        return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
    }

    #[AdminRoute('/program/{id}/tree/bulk-remove', name: 'program_tree_bulk_remove', options: ['methods' => ['POST']])]
    public function bulkRemove(int $id, Request $request): Response
    {
        $program = $this->programRepository->find($id);
        if (!$program) {
            $this->addFlash('danger', 'Program not found.');

            return $this->redirectToRoute(
                'admin',
                ['crudAction' => 'index', 'crudControllerFqcn' => ProgramCrudController::class]
            );
        }

        /** @var array<string> $items */
        $items = $request->request->all('items');
        $removedCount = 0;

        foreach ($items as $item) {
            $parts = explode(':', $item);
            if (count($parts) < 3) {
                continue;
            }

            $type = $parts[0];
            $itemId = (int) $parts[1];
            $parentId = $parts[2];

            if ($type === 'course') {
                $course = $this->courseRepository->find($itemId);
                $parentModule = $this->moduleRepository->find((int) $parentId);
                if ($course && $parentModule) {
                    $parentModule->removeCourse($course);
                    $removedCount++;
                }
            } elseif ($type === 'module') {
                $module = $this->moduleRepository->find($itemId);
                if ($module) {
                    if ($parentId === 'root') {
                        $program->removeModule($module);
                    } else {
                        $parentModule = $this->moduleRepository->find((int) $parentId);
                        if ($parentModule) {
                            $parentModule->removeModule($module);
                        }
                    }
                    $removedCount++;
                }
            }
        }

        $this->entityManager->flush();

        $this->addFlash('success', sprintf('Removed %d item(s) from program.', $removedCount));

        return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
    }

    #[AdminRoute('/program/{id}/tree/rename-module', name: 'program_tree_rename_module', options: ['methods' => ['POST']])]
    public function renameModule(int $id, Request $request): Response
    {
        $program = $this->programRepository->find($id);
        if (!$program) {
            $this->addFlash('danger', 'Program not found.');

            return $this->redirectToRoute(
                'admin',
                ['crudAction' => 'index', 'crudControllerFqcn' => ProgramCrudController::class]
            );
        }

        $moduleId = (int) $request->request->get('module_id');
        $newName = trim((string) $request->request->get('name', ''));

        $module = $this->moduleRepository->find($moduleId);
        if ($module && $newName !== '') {
            $module->setName($newName);
            $this->entityManager->flush();
            $this->addFlash('success', sprintf('Module renamed to "%s".', $newName));
        } else {
            $this->addFlash('danger', 'Failed to rename module.');
        }

        return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
    }

    #[AdminRoute('/program/{id}/tree/sync-onderwijsaanbod', name: 'program_tree_sync', options: ['methods' => ['POST']])]
    public function syncOnderwijsaanbod(int $id): Response
    {
        $program = $this->programRepository->find($id);
        if (!$program || !$program->getKulId()) {
            $this->addFlash('danger', 'Program not found or lacks a KU Leuven programId.');

            return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
        }

        $kulId = $program->getKulId();
        $source = $this->client->fetchProgramSource($kulId);
        if ($source === null) {
            $this->addFlash('danger', sprintf('Could not fetch data for KU Leuven ID %s', $kulId));

            return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
        }

        $programData = $this->mapper->map($source, $kulId, 'nl');
        if ($programData === null) {
            $this->addFlash('danger', 'Failed to map program data.');

            return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
        }

        $result = $this->importer->import($programData, enrich: true, dryRun: false);

        $this->addFlash(
            'success',
            sprintf(
                'Synced from KU Leuven! Modules created: %d, Modules updated: %d, ' .
                'Courses created: %d, Courses updated: %d',
                $result->modulesCreated,
                $result->modulesUpdated,
                $result->coursesCreated,
                $result->coursesUpdated
            )
        );

        return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
    }
}
