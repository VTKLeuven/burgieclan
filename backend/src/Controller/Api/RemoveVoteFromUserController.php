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
use Psr\Log\LoggerInterface;
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
        private readonly LoggerInterface        $logger,
    ) {
    }

    public function __invoke(Request $request)
    {
        $user = $this->security->getUser();
        assert($user instanceof User);

        $requestBody = json_decode($request->getContent(), true);
        $documentVotes = $requestBody['documentVotes'] ?? [];
        $documentCommentVotes = $requestBody['documentCommentVotes'] ?? [];
        $courseCommentVotes = $requestBody['courseCommentVotes'] ?? [];

        $votesToRemove = array_merge($documentVotes, $documentCommentVotes, $courseCommentVotes);

        foreach ($votesToRemove as $voteApiIri) {
            $voteApi = $this->iriConverter->getResourceFromIri($voteApiIri);
            assert($voteApi instanceof AbstractVoteApi);

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
                    continue 2;
            }

            $vote = $this->microMapper->map($voteApi, $voteEntityClass, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);

            $user->removeVote($vote);

            $this->entityManager->remove($vote);
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
