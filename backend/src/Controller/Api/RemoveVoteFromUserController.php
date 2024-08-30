<?php

namespace App\Controller\Api;

use ApiPlatform\Api\IriConverterInterface;
use App\ApiResource\AbstractVoteApi;
use App\ApiResource\CourseCommentVoteApi;
use App\ApiResource\DocumentCommentVoteApi;
use App\ApiResource\DocumentVoteApi;
use App\ApiResource\UserApi;
use App\Entity\CourseCommentVote;
use App\Entity\DocumentCommentVote;
use App\Entity\DocumentVote;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;
use Symfony\Component\Serializer\SerializerInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

class RemoveVoteFromUserController extends AbstractController
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
        $votesToRemove = $requestBody['votes'] ?? [];

        foreach ($votesToRemove as $voteApiIri) {
            // Convert the IRI "/api/courses/{id}" to an actual object
            $voteApi = $this->iriConverter->getResourceFromIri($voteApiIri);
            assert($voteApi instanceof AbstractVoteApi);

            // Determine the type of vote and map to the correct subclass
            switch (true) {
                case $voteApi instanceof CourseCommentVoteApi:
                    $voteEntityClass = CourseCommentVote::class;
                    break;
                case $voteApi instanceof DocumentCommentVoteApi:
                    $voteEntityClass = DocumentCommentVote::class;
                    break;
                case $voteApi instanceof DocumentVoteApi:
                    $voteEntityClass = DocumentVote::class;
                    break;
                default:
                    // Handle the case where no matching entity class is found
                    continue 2; // Skip this vote if no matching entity class is found
            }

            // Convert the DTO to an Entity
            $vote = $this->microMapper->map($voteApi, $voteEntityClass, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);

            // Remove the entity
            $user->removeVote($vote);
        }

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        $newUserApi = $this->microMapper->map($user, UserApi::class, [
            MicroMapperInterface::MAX_DEPTH => 1,
        ]);
        $serializedUserApi = $this->serializer->serialize(
            $newUserApi,
            'json',
            [AbstractNormalizer::GROUPS => ['user:votes']]
        );

        return new Response($serializedUserApi, Response::HTTP_OK);
    }
}
