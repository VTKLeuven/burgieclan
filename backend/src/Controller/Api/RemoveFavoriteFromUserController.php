<?php

namespace App\Controller\Api;

use ApiPlatform\Api\IriConverterInterface;
use App\ApiResource\CourseApi;
use App\ApiResource\DocumentApi;
use App\ApiResource\ModuleApi;
use App\ApiResource\ProgramApi;
use App\ApiResource\UserApi;
use App\Entity\Course;
use App\Entity\Document;
use App\Entity\Module;
use App\Entity\Program;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;
use Symfony\Component\Serializer\SerializerInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

class RemoveFavoriteFromUserController extends AbstractController
{
    public function __construct(
        private readonly Security               $security,
        private readonly MicroMapperInterface   $microMapper,
        private readonly EntityManagerInterface $entityManager,
        private readonly SerializerInterface    $serializer,
        private readonly IriConverterInterface  $iriConverter,
    ) {
    }

    public function __invoke(UserApi $userApi, Request $request)
    {
        $user = $this->security->getUser();
        assert($user instanceof User);

        $requestBody = json_decode($request->getContent(), true);

        $coursesToRemove = $requestBody['favoriteCourses'] ?? [];
        $modulesToRemove = $requestBody['favoriteModules'] ?? [];
        $programsToRemove = $requestBody['favoritePrograms'] ?? [];
        $documentsToRemove = $requestBody['favoriteDocuments'] ?? [];

        foreach ($coursesToRemove as $courseApiIri) {
            // Convert the IRI "/api/courses/{id}" to an actual object
            $courseApi = $this->iriConverter->getResourceFromIri($courseApiIri);
            assert($courseApi instanceof CourseApi);

            // Convert the DTO to an Entity
            $course = $this->microMapper->map($courseApi, Course::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);

            // Remove the entity
            $user->removeFavoriteCourse($course);
        }
        foreach ($modulesToRemove as $moduleApiIri) {
            $moduleApi = $this->iriConverter->getResourceFromIri($moduleApiIri);
            assert($moduleApi instanceof ModuleApi);
            $module = $this->microMapper->map($moduleApi, Module::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
            $user->removeFavoriteModule($module);
        }
        foreach ($programsToRemove as $programApiIri) {
            $programApi = $this->iriConverter->getResourceFromIri($programApiIri);
            assert($programApi instanceof ProgramApi);
            $program = $this->microMapper->map($programApi, Program::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
            $user->removeFavoriteProgram($program);
        }
        foreach ($documentsToRemove as $documentApiIri) {
            $documentApi = $this->iriConverter->getResourceFromIri($documentApiIri);
            assert($documentApi instanceof DocumentApi);
            $document = $this->microMapper->map($documentApi, Document::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
            $user->removeFavoriteDocument($document);
        }

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        $newUserApi = $this->microMapper->map($user, UserApi::class, [
            MicroMapperInterface::MAX_DEPTH => 1,
        ]);
        $serializedUserApi = $this->serializer->serialize(
            $newUserApi,
            'json',
            [AbstractNormalizer::GROUPS => ['user:favorites']]
        );

        return new Response($serializedUserApi, Response::HTTP_OK);
    }
}