<?php

namespace App\Controller\Api;

use App\Entity\Module;
use App\Repository\ModuleRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Where one module sits in the curriculum: the program it hangs under, plus the chain of modules
 * from that program's top level down to the module itself.
 *
 * The navigator loads one level at a time, so a link straight to a nested module has no way of
 * knowing which branches to open. Walking up costs one query per level and the tree is a handful
 * deep; walking down from every program would mean pulling the whole curriculum to place one node.
 */
class GetModulePathController extends AbstractController
{
    public function __construct(
        private readonly ModuleRepository $moduleRepository,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        // The operation reads nothing, so the module is looked up here rather than through the
        // state provider: the DTO it would build is thrown away anyway.
        $id = $request->attributes->get('id');
        $module = is_scalar($id) ? $this->moduleRepository->find($id) : null;
        if ($module === null) {
            throw new NotFoundHttpException('Module not found.');
        }

        $chain = $this->ancestorChain($module);

        // A program's top level is drawn from the modules that point at it, so the path has to
        // start at the highest ancestor that has one. Anything above that is not rendered under
        // any program and would leave the link with nothing to open.
        $program = null;
        $path = [];
        foreach ($chain as $index => $ancestor) {
            $ancestorProgram = $ancestor->getProgram();
            if ($ancestorProgram !== null) {
                $program = $ancestorProgram;
                $path = array_slice($chain, $index);
                break;
            }
        }

        if ($program === null) {
            return new JsonResponse(['program' => null, 'modules' => []]);
        }

        $moduleIris = array_map(
            static fn(Module $ancestor): string => '/api/modules/' . $ancestor->getId(),
            $path
        );

        $payload = [
            'program' => '/api/programs/' . $program->getId(),
            'modules' => array_values($moduleIris),
        ];

        return new JsonResponse($payload);
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
