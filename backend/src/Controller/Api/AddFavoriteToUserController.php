<?php

namespace App\Controller\Api;

use ApiPlatform\Metadata\IriConverterInterface;
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

class AddFavoriteToUserController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly MicroMapperInterface $microMapper,
        private readonly EntityManagerInterface $entityManager,
        private readonly SerializerInterface $serializer,
        private readonly IriConverterInterface $iriConverter,
    ) {
    }

    public function __invoke(UserApi $userApi, Request $request)
    {
        $user = $this->security->getUser();
        assert($user instanceof User);

        $requestBody = json_decode($request->getContent(), true);

        $coursesToAdd = $requestBody['favoriteCourses'] ?? [];
        $modulesToAdd = $requestBody['favoriteModules'] ?? [];
        $programsToAdd = $requestBody['favoritePrograms'] ?? [];
        $documentsToAdd = $requestBody['favoriteDocuments'] ?? [];

        foreach ($coursesToAdd as $courseApiIri) {
            // Convert the IRI "/api/courses/{id}" to an actual object
            $courseApi = $this->iriConverter->getResourceFromIri($courseApiIri);
            assert($courseApi instanceof CourseApi);

            // Convert the DTO to an Entity
            $course = $this->microMapper->map(
                $courseApi,
                Course::class,
                [
                MicroMapperInterface::MAX_DEPTH => 0,
                ]
            );

            // Add the entity
            $user->addFavoriteCourse($course);
        }
        foreach ($modulesToAdd as $moduleApiIri) {
            $moduleApi = $this->iriConverter->getResourceFromIri($moduleApiIri);
            assert($moduleApi instanceof ModuleApi);
            $module = $this->microMapper->map(
                $moduleApi,
                Module::class,
                [
                MicroMapperInterface::MAX_DEPTH => 0,
                ]
            );
            $user->addFavoriteModule($module);
        }
        foreach ($programsToAdd as $programApiIri) {
            $programApi = $this->iriConverter->getResourceFromIri($programApiIri);
            assert($programApi instanceof ProgramApi);
            $program = $this->microMapper->map(
                $programApi,
                Program::class,
                [
                MicroMapperInterface::MAX_DEPTH => 0,
                ]
            );
            $user->addFavoriteProgram($program);
        }
        foreach ($documentsToAdd as $documentApiIri) {
            $documentApi = $this->iriConverter->getResourceFromIri($documentApiIri);
            assert($documentApi instanceof DocumentApi);
            $document = $this->microMapper->map(
                $documentApi,
                Document::class,
                [
                MicroMapperInterface::MAX_DEPTH => 0,
                ]
            );
            $user->addFavoriteDocument($document);
        }

        $this->entityManager->flush();

        $newUserApi = $this->microMapper->map(
            $user,
            UserApi::class,
            [
            MicroMapperInterface::MAX_DEPTH => 1,
            ]
        );
        $serializedUserApi = $this->serializer->serialize(
            $newUserApi,
            'json',
            [AbstractNormalizer::GROUPS => ['user:favorites']]
        );

        return new Response($serializedUserApi, Response::HTTP_OK);
    }
}
