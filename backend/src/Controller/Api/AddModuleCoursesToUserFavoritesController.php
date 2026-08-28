<?php

namespace App\Controller\Api;

use ApiPlatform\Metadata\IriConverterInterface;
use App\ApiResource\ModuleApi;
use App\ApiResource\UserApi;
use App\Entity\Module;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;
use Symfony\Component\Serializer\SerializerInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

class AddModuleCoursesToUserFavoritesController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly MicroMapperInterface $microMapper,
        private readonly EntityManagerInterface $entityManager,
        private readonly SerializerInterface $serializer,
        private readonly IriConverterInterface $iriConverter,
    ) {}

    public function __invoke(UserApi $userApi, Request $request): Response
    {
        $user = $this->security->getUser();
        assert($user instanceof User);

        $requestBody = json_decode($request->getContent(), true);
        $moduleIri = is_array($requestBody) ? ($requestBody['module'] ?? null) : null;
        if (!is_string($moduleIri)) {
            throw new BadRequestHttpException('A module IRI is required.');
        }

        $moduleApi = $this->iriConverter->getResourceFromIri($moduleIri);
        if (!$moduleApi instanceof ModuleApi) {
            throw new BadRequestHttpException('The supplied IRI is not a module.');
        }

        $module = $this->microMapper->map(
            $moduleApi,
            Module::class,
            [MicroMapperInterface::MAX_DEPTH => 0]
        );

        $visitedModules = [];
        $this->addModuleCourses($user, $module, $visitedModules);
        $this->entityManager->flush();

        $newUserApi = $this->microMapper->map(
            $user,
            UserApi::class,
            [MicroMapperInterface::MAX_DEPTH => 1]
        );
        $serializedUserApi = $this->serializer->serialize(
            $newUserApi,
            'json',
            [AbstractNormalizer::GROUPS => ['user:favorites']]
        );

        return new Response($serializedUserApi, Response::HTTP_OK);
    }

    /**
     * @param array<int, true> $visitedModules
     */
    private function addModuleCourses(User $user, Module $module, array &$visitedModules): void
    {
        $moduleId = $module->getId();
        if ($moduleId === null || isset($visitedModules[$moduleId])) {
            return;
        }
        $visitedModules[$moduleId] = true;

        foreach ($module->getCourses() as $course) {
            $user->addFavoriteCourse($course);
        }

        foreach ($module->getModules() as $submodule) {
            $this->addModuleCourses($user, $submodule, $visitedModules);
        }
    }
}
