<?php

namespace App\Controller\Api;

use App\Entity\CourseComment;
use App\Entity\CourseCommentVote;
use App\Entity\Document;
use App\Entity\DocumentComment;
use App\Entity\DocumentCommentVote;
use App\Entity\DocumentVote;
use App\Entity\User;
use App\Entity\VotableInterface;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Serializer\SerializerInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

class CreateVoteController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly Security $security,
        private readonly SerializerInterface $serializer,
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $user = $this->security->getUser();
        assert($user instanceof User);

        $id = $request->attributes->get('id');
        $route = $request->attributes->get('_route');

        $requestData = json_decode($request->getContent(), true);
        if (!isset($requestData['voteType'])) {
            throw new BadRequestHttpException('voteType is required');
        }

        $voteType = $requestData['voteType'];
        if (!in_array($voteType, [1, -1], true)) {
            throw new BadRequestHttpException('voteType must be either 1 (upvote) or -1 (downvote)');
        }

        // Determine the entity and vote types based on the route
        [$entityClass, $voteClass, $apiClass] = match (true) {
            str_contains($route, 'document-comments') => [
                DocumentComment::class,
                DocumentCommentVote::class,
                \App\ApiResource\DocumentCommentVoteApi::class
            ],
            str_contains($route, 'course-comments') => [
                CourseComment::class,
                CourseCommentVote::class,
                \App\ApiResource\CourseCommentVoteApi::class
            ],
            str_contains($route, 'documents') => [
                Document::class,
                DocumentVote::class,
                \App\ApiResource\DocumentVoteApi::class
            ],
            default => throw new NotFoundHttpException('Invalid route for vote creation'),
        };

        $entity = $this->entityManager->getRepository($entityClass)->find($id);

        if (!$entity instanceof VotableInterface) {
            throw new NotFoundHttpException('Entity not found or not votable');
        }

        // Check if user already has a vote on this entity
        $existingVote = $entity->getUserVote($user);

        if ($existingVote) {
            // If same vote type, do nothing (skip)
            if ($existingVote->getVoteType() === $voteType) {
                $voteApi = $this->microMapper->map($existingVote, $apiClass);
                return new JsonResponse(
                    $this->serializer->serialize($voteApi, 'json', ['groups' => ['vote:read']]),
                    Response::HTTP_OK,
                    [],
                    true
                );
            }

            // Update existing vote
            $existingVote->setVoteType($voteType);
            $this->entityManager->flush();

            $voteApi = $this->microMapper->map($existingVote, $apiClass);
            return new JsonResponse(
                $this->serializer->serialize($voteApi, 'json', ['groups' => ['vote:read']]),
                Response::HTTP_OK,
                [],
                true
            );
        }

        // Create new vote
        $vote = new $voteClass($user);
        $vote->setVoteType($voteType);

        // Set the appropriate relationship
        match ($entityClass) {
            DocumentComment::class => $vote->setDocumentComment($entity),
            CourseComment::class => $vote->setCourseComment($entity),
            Document::class => $vote->setDocument($entity),
        };

        try {
            $this->entityManager->persist($vote);
            $this->entityManager->flush();
        } catch (UniqueConstraintViolationException $e) {
            // Handle race condition where vote was created between our check and persist
            $existingVote = $entity->getUserVote($user);
            if ($existingVote && $existingVote->getVoteType() !== $voteType) {
                $existingVote->setVoteType($voteType);
                $this->entityManager->flush();
                $vote = $existingVote;
            } elseif ($existingVote) {
                $vote = $existingVote;
            } else {
                throw $e;
            }
        }

        $voteApi = $this->microMapper->map($vote, $apiClass);
        return new JsonResponse(
            $this->serializer->serialize($voteApi, 'json', ['groups' => ['vote:read']]),
            Response::HTTP_CREATED,
            [],
            true
        );
    }
}
