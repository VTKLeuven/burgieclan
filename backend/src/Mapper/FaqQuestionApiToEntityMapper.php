<?php

namespace App\Mapper;

use App\ApiResource\FaqQuestionApi;
use App\Entity\FaqQuestion;
use App\Entity\User;
use App\Repository\FaqQuestionRepository;
use Exception;
use Symfony\Bundle\SecurityBundle\Security;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;

#[AsMapper(from: FaqQuestionApi::class, to: FaqQuestion::class)]
class FaqQuestionApiToEntityMapper implements MapperInterface
{
    public function __construct(
        private readonly FaqQuestionRepository $repository,
        private readonly Security $security,
    ) {}

    /**
     * @throws Exception
     */
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof FaqQuestionApi);

        $entity = $from->id ? $this->repository->find($from->id) : new FaqQuestion();
        if (!$entity) {
            throw new Exception('FAQ question not found');
        }

        return $entity;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof FaqQuestionApi);
        assert($to instanceof FaqQuestion);

        $to->setQuestion($from->question);
        $to->setLocale($from->locale);

        // Taken from the session rather than the payload: /api is IS_AUTHENTICATED_FULLY, so there
        // is always a user, and letting the client name the author would let it forge one.
        $user = $this->security->getUser();
        if ($user instanceof User) {
            $to->setAuthor($user);
        }

        return $to;
    }
}
