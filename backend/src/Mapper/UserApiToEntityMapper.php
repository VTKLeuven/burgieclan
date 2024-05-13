<?php

namespace App\Mapper;

use App\ApiResource\UserApi;
use App\Entity\User;
use App\Repository\UserRepository;
use Exception;
use Symfony\Bundle\SecurityBundle\Security;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: UserApi::class, to: User::class)]
class UserApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly UserRepository $repository,
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

        // No need to set any fields from user. It either gets pulled from the database in load() or doesn't exist.

        return $to;
    }
}
