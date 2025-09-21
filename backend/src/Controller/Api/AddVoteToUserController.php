<?php

namespace App\Controller\Api;

use ApiPlatform\Metadata\IriConverterInterface;
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

class AddVoteToUserController extends AbstractController
{
    public function __construct(
        private readonly Security               $security,
        private readonly MicroMapperInterface   $microMapper,
        private readonly EntityManagerInterface $entityManager,
        private readonly SerializerInterface    $serializer,
        private readonly IriConverterInterface  $iriConverter,
    ) {
    }

    public function __invoke(Request $request)
    {
        $user = $this->security->getUser();
        assert($user instanceof User);

        $requestBody = json_decode($request->getContent(), true);
        $votesToAdd = $requestBody['votes'] ?? [];

        foreach ($votesToAdd as $voteApiIri) {
            // Convert the IRI to an actual object
            $voteApi = $this->iriConverter->getResourceFromIri($voteApiIri);
            assert($voteApi instanceof AbstractVoteApi);

            // Determine the type of vote and map to the correct subclass
            $voteEntityClass = null;

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

            // Map the DTO to the actual Vote entity
            $vote = $this->microMapper->map($voteApi, $voteEntityClass, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
            $this->entityManager->persist($vote);

            // Add the vote to the user
            $user->addVote($vote);
        }

        // Persist changes to the database
        $this->entityManager->flush();

        // Map the updated User entity back to the UserApi DTO
        $newUserApi = $this->microMapper->map($user, UserApi::class, [
            MicroMapperInterface::MAX_DEPTH => 1,
        ]);

        // Serialize the UserApi DTO to JSON with the appropriate groups
        $serializedUserApi = $this->serializer->serialize(
            $newUserApi,
            'json',
            [AbstractNormalizer::GROUPS => ['user:votes']]
        );

        // Return the updated UserApi DTO as a response
        return new Response($serializedUserApi, Response::HTTP_OK);
    }
}
