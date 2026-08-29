<?php

namespace App\Controller\Api;

use App\Entity\Module;
use App\Repository\ModuleRepository;
use App\Service\CurriculumPathResolver;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Where one module sits in the curriculum: the program it hangs under, plus the chain of modules
 * from that program's top level down to the module itself.
 *
 * The navigator loads one level at a time, so a link straight to a nested module has no way of
 * knowing which branches to open.
 */
class GetModulePathController extends AbstractController
{
    public function __construct(
        private readonly ModuleRepository $moduleRepository,
        private readonly CurriculumPathResolver $pathResolver,
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

        $path = $this->pathResolver->resolveModule($module);

        if ($path === null) {
            return new JsonResponse(['program' => null, 'modules' => []]);
        }

        $moduleIris = array_map(
            static fn(Module $ancestor): string => '/api/modules/' . $ancestor->getId(),
            $path['modules']
        );

        return new JsonResponse(
            [
            'program' => '/api/programs/' . $path['program']->getId(),
            'modules' => array_values($moduleIris),
            ]
        );
    }
}
