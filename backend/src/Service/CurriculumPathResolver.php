<?php

namespace App\Service;

use App\Entity\Course;
use App\Entity\Module;
use App\Entity\Program;
use App\Repository\ModuleRepository;

/**
 * Places a node in the curriculum: the program it hangs under, plus the chain of modules from
 * that program's top level down to the node itself.
 *
 * The navigator loads one level at a time and a course carries no programme of its own, so a
 * page reached by a direct link has no way of telling the reader which branch they are in.
 * Walking up costs one query per level and the tree is a handful deep; walking down from every
 * program would mean pulling the whole curriculum to place one node.
 */
class CurriculumPathResolver
{
    public function __construct(
        private readonly ModuleRepository $moduleRepository,
    ) {}

    /**
     * Where one module sits, or null when no ancestor hangs under a program - such a module is
     * drawn nowhere in the navigator, so there is no branch to point at.
     *
     * @return array{program: Program, modules: Module[]}|null
     */
    public function resolveModule(Module $module): ?array
    {
        $chain = $this->ancestorChain($module);

        // A program's top level is drawn from the modules that point at it, so the path has to
        // start at the highest ancestor that has one. Anything above that is not rendered under
        // any program and would leave the link with nothing to open.
        foreach ($chain as $index => $ancestor) {
            $program = $ancestor->getProgram();
            if ($program !== null) {
                return [
                    'program' => $program,
                    'modules' => array_values(array_slice($chain, $index)),
                ];
            }
        }

        return null;
    }

    /**
     * Every placement of a course, deduplicated and ordered by program name.
     *
     * A course is shared: the same Doctrine row hangs under one module per programme that
     * teaches it, which is exactly what a reader asking "which branch am I in?" wants to see.
     *
     * @return array<int, array{program: Program, modules: Module[]}>
     */
    public function resolveCourse(Course $course): array
    {
        $paths = [];
        $seen = [];

        foreach ($course->getModules() as $module) {
            $path = $this->resolveModule($module);
            if ($path === null) {
                continue;
            }

            $key = self::pathKey($path);
            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $paths[] = $path;
        }

        usort(
            $paths,
            static function (array $a, array $b): int {
                return [$a['program']->getName(), self::pathKey($a)]
                <=> [$b['program']->getName(), self::pathKey($b)];
            }
        );

        return $paths;
    }

    /**
     * @param array{program: Program, modules: Module[]} $path
     */
    private static function pathKey(array $path): string
    {
        $moduleIds = array_map(static fn(Module $module): string => (string) $module->getId(), $path['modules']);

        return $path['program']->getId() . ':' . implode('/', $moduleIds);
    }

    /**
     * The module's ancestors, root-most first, with the module itself last.
     *
     * @return Module[]
     */
    private function ancestorChain(Module $module): array
    {
        $chain = [$module];
        $seen = [$module->getId() => true];
        $current = $module;

        // In practice a module hangs under a single parent, but the mapping is many-to-many: take
        // the first parent not already walked and let $seen break any cycle the data allows.
        while (true) {
            $parent = null;
            foreach ($this->moduleRepository->findParentModules($current) as $candidate) {
                if (!isset($seen[$candidate->getId()])) {
                    $parent = $candidate;
                    break;
                }
            }

            if ($parent === null) {
                return $chain;
            }

            $seen[$parent->getId()] = true;
            array_unshift($chain, $parent);
            $current = $parent;
        }
    }
}
