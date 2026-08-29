<?php

namespace App\Controller\Api;

use App\Repository\ModuleRepository;
use App\Service\CurriculumPathResolver;
use App\Serializer\CurriculumPathNormalizer;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Where one module sits in the curriculum: the program it hangs under, plus the chain of modules
 * from that program's top level down to the module itself.
 *
 * A module page is a page like any other now, so it needs the same thing a course page needs -
 * a breadcrumb naming every step above it. Names travel with the IRIs so drawing that trail
 * costs no follow-up request per node.
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

        // A module no program reaches is drawn nowhere, so there is no trail to give.
        return new JsonResponse(
            [
            'path' => $path === null ? null : CurriculumPathNormalizer::normalize($path),
            ]
        );
    }
}
