<?php

namespace App\Controller\Api;

use App\Entity\CourseComment;
use App\Entity\Document;
use App\Entity\DocumentComment;
use App\Entity\User;
use App\Entity\VotableInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class DeleteVoteController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly Security $security,
    ) {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $user = $this->security->getUser();
        assert($user instanceof User);

        $id = $request->attributes->get('id');
        $route = $request->attributes->get('_route');

        // Determine the entity type based on the route
        $entityClass = match (true) {
            str_contains($route, 'document-comments') => DocumentComment::class,
            str_contains($route, 'course-comments') => CourseComment::class,
            str_contains($route, 'documents') => Document::class,
            default => throw new NotFoundHttpException('Invalid route for vote deletion'),
        };

        $entity = $this->entityManager->getRepository($entityClass)->find($id);

        if (!$entity instanceof VotableInterface) {
            throw new NotFoundHttpException('Entity not found or not votable');
        }

        // Find the user's vote on this entity
        $vote = $entity->getUserVote($user);

        if (!$vote) {
            throw new NotFoundHttpException('Vote not found');
        }

        $this->entityManager->remove($vote);
        $this->entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }
}
