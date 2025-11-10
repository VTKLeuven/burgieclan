<?php

namespace App\Mapper;

use App\ApiResource\UserDocumentViewApi;
use App\Entity\Document;
use App\Entity\User;
use App\Entity\UserDocumentView;
use App\Repository\UserDocumentViewRepository;
use Exception;
use Symfony\Bundle\SecurityBundle\Security;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

class UserDocumentViewApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly UserDocumentViewRepository $repository,
        private readonly Security $security,
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    /**
     * @throws Exception
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof UserDocumentViewApi);

        if ($from->id) {
            $entity = $this->repository->find($from->id);
            if (!$entity) {
                throw new Exception('UserDocumentView not found');
            }
        } else {
            $document = $this->microMapper->map(
                $from->document,
                Document::class,
                [
                MicroMapperInterface::MAX_DEPTH => 0,
                ]
            );
            $user = $this->security->getUser();
            assert($user instanceof User);
            $entity = new UserDocumentView(
                $user,
                $document,
                $from->lastViewed
            );
        }

        return $entity;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof UserDocumentViewApi);
        assert($to instanceof UserDocumentView);

        // Only the "lastViewed" field is mutable.
        $to->setLastViewedAt($from->lastViewed);

        return $to;
    }
}
