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

/**
 * Admin controller for the program tree structure editor.
 *
 * Manages the module/course hierarchy of a program: adding, moving, renaming, and removing
 * modules and courses. Also handles one-click re-sync from KU Leuven using saved import settings.
 */
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
        $warnings = [];

        // Collect all module IDs being removed in this bulk request
        /** @var array<int, bool> $modulesBeingRemoved */
        $modulesBeingRemoved = [];
        foreach ($items as $item) {
            $parts = explode(':', $item);
            if (count($parts) >= 3 && $parts[0] === 'module') {
                $modulesBeingRemoved[(int) $parts[1]] = true;
            }
        }

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

                    $this->removeModuleRecursively($module, $modulesBeingRemoved, $warnings, $program);
                    $removedCount++;
                }
            }
        }

        $this->entityManager->flush();

        $this->addFlash('success', sprintf('Removed %d item(s) from program.', $removedCount));
        foreach (array_unique($warnings) as $warning) {
            $this->addFlash('warning', $warning);
        }

        return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
    }

    /**
     * Safely remove a module and its submodules recursively. If a submodule has another
     * parent module or belongs to another program not being deleted, it is unlinked instead.
     *
     * @param array<int, bool> $modulesBeingRemoved set of module IDs being removed in this bulk request
     * @param list<string>     $warnings            out-parameter to collect warning messages
     */
    private function removeModuleRecursively(
        Module $module,
        array $modulesBeingRemoved,
        array &$warnings,
        Program $currentProgram
    ): void {
        // Check for external parents BEFORE recursing into children to avoid
        // deleting grandchildren of a module that should only be unlinked.
        $allParents = $this->moduleRepository->findParentModules($module);
        $externalParents = array_filter(
            $allParents,
            static fn (Module $p): bool => !isset($modulesBeingRemoved[$p->getId()]) && $p->getId() !== $module->getId()
        );

        $hasExternalProgram = $module->getProgram() !== null && $module->getProgram()->getId() !== $currentProgram->getId();

        if (count($externalParents) > 0 || $hasExternalProgram) {
            $parentNames = array_map(static fn (Module $p): string => $p->getName(), $externalParents);
            $prog = $module->getProgram();
            if ($prog !== null && $prog->getId() !== $currentProgram->getId()) {
                $parentNames[] = 'Program: ' . $prog->getName();
            }

            $warnings[] = sprintf(
                'Module "%s" (ID %d) was unlinked instead of deleted from the database because it is also used in: %s.',
                $module->getName(),
                $module->getId(),
                implode(', ', $parentNames)
            );

            return;
        }

        // Safe to recurse — this module will be deleted, so process its children first
        foreach (array_values($module->getModules()->toArray()) as $childModule) {
            $this->removeModuleRecursively($childModule, $modulesBeingRemoved, $warnings, $currentProgram);
        }

        $module->getCourses()->clear();
        $module->getModules()->clear();
        $this->entityManager->remove($module);
    }

    #[AdminRoute('/program/{id}/tree/reorder-module', name: 'program_tree_reorder_module', options: ['methods' => ['POST']])]
    public function reorderModule(int $id, Request $request): Response
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
        $parentId = (string) $request->request->get('parent_id');
        $direction = (string) $request->request->get('direction');

        $module = $this->moduleRepository->find($moduleId);
        if (!$module) {
            $this->addFlash('danger', 'Module not found.');

            return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
        }

        // Siblings are the children of the same parent (or the program's top-level modules). They
        // already arrive ordered by (position, name) thanks to the association's OrderBy.
        if ($parentId === 'root') {
            $siblings = array_values($program->getModules()->toArray());
        } else {
            $parent = $this->moduleRepository->find((int) $parentId);
            if (!$parent) {
                $this->addFlash('danger', 'Parent module not found.');

                return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
            }
            $siblings = array_values($parent->getModules()->toArray());
        }

        $index = null;
        foreach ($siblings as $i => $sibling) {
            if ($sibling->getId() === $module->getId()) {
                $index = $i;
                break;
            }
        }

        $swapWith = $direction === 'up' ? ($index ?? 0) - 1 : ($index ?? 0) + 1;
        if ($index === null || $swapWith < 0 || $swapWith >= count($siblings)) {
            // Already at the edge (or not found): nothing to do.
            return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
        }

        // Normalise the whole sibling set to spaced-out positions matching their current order, then
        // swap the two neighbours. Normalising first guarantees deterministic ordering even when the
        // modules still share the default position of 0 (in which case they were name-ordered).
        foreach ($siblings as $i => $sibling) {
            $sibling->setPosition(($i + 1) * 10);
        }
        $current = $siblings[$index];
        $neighbour = $siblings[$swapWith];
        $currentPosition = $current->getPosition();
        $current->setPosition($neighbour->getPosition());
        $neighbour->setPosition($currentPosition);

        $this->entityManager->flush();

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
    public function syncOnderwijsaanbod(int $id, Request $request): Response
    {
        if (!$this->isCsrfTokenValid('program_sync', (string) $request->request->get('_token'))) {
            $this->addFlash('danger', 'Invalid CSRF token, sync aborted.');

            return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
        }

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

        $settings = $program->getResolvedImportSettings();

        $programData = $this->mapper->map(
            $source,
            $kulId,
            $settings['lang'],
            $settings['flatten'],
            $settings['semester'],
            $settings['merge'],
        );
        if ($programData === null) {
            $this->addFlash('danger', 'Failed to map program data.');

            return $this->redirectToRoute('admin_program_tree', ['id' => $id]);
        }

        $result = $this->importer->import($programData, enrich: $settings['enrich'], dryRun: false);

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
