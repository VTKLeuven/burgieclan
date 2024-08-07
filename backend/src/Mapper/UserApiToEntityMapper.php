<?php

namespace App\Mapper;

use App\ApiResource\UserApi;
use App\Entity\Course;
use App\Entity\Document;
use App\Entity\Module;
use App\Entity\Program;
use App\Entity\User;
use App\Repository\UserRepository;
use Exception;
use Symfony\Component\PropertyAccess\PropertyAccessorInterface;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: UserApi::class, to: User::class)]
class UserApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly UserRepository            $repository,
        private readonly MicroMapperInterface      $microMapper,
        private readonly PropertyAccessorInterface $propertyAccessor,
    ) {
    }

    /**
     * @throws Exception
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof UserApi);

        $entity = $from->id ? $this->repository->find($from->id) : null;
        if (!$entity) {
            throw new Exception('User not found');
        }

        return $entity;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof UserApi);
        assert($to instanceof User);

        // No need to set any fields from user except the favorites.
        // It either gets pulled from the database in load() or doesn't exist.

        $favoriteCourses = [];
        foreach ($from->favoriteCourses as $course) {
            $favoriteCourses[] = $this->microMapper->map($course, Course::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }
        $this->propertyAccessor->setValue($to, 'favoriteCourses', $favoriteCourses);

        $favoriteModules = [];
        foreach ($from->favoriteModules as $module) {
            $favoriteModules[] = $this->microMapper->map($module, Module::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }
        $this->propertyAccessor->setValue($to, 'favoriteModules', $favoriteModules);

        $favoritePrograms = [];
        foreach ($from->favoritePrograms as $program) {
            $favoritePrograms[] = $this->microMapper->map($program, Program::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }
        $this->propertyAccessor->setValue($to, 'favoritePrograms', $favoritePrograms);

        $favoriteDocuments = [];
        foreach ($from->favoriteDocuments as $document) {
            $favoriteDocuments[] = $this->microMapper->map($document, Document::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }
        $this->propertyAccessor->setValue($to, 'favoriteDocuments', $favoriteDocuments);

        return $to;
    }
}
