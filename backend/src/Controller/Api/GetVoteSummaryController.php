<?php

namespace App\Controller\Api;

use App\ApiResource\VoteSummaryApi;
use App\Entity\CourseComment;
use App\Entity\Document;
use App\Entity\DocumentComment;
use App\Entity\VotableInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class GetVoteSummaryController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function __invoke(Request $request): VoteSummaryApi
    {
        $id = $request->attributes->get('id');
        $route = $request->attributes->get('_route');

        // Determine the entity type based on the route
        $entityClass = match (true) {
            str_contains($route, 'document-comments') => DocumentComment::class,
            str_contains($route, 'course-comments') => CourseComment::class,
            str_contains($route, 'documents') => Document::class,
            default => throw new NotFoundHttpException('Invalid route for vote summary'),
        };

        $entity = $this->entityManager->getRepository($entityClass)->find($id);

        if (!$entity instanceof VotableInterface) {
            throw new NotFoundHttpException('Entity not found or not votable');
        }

        $voteSummary = new VoteSummaryApi();
        $voteSummary->id = $id;
        $voteSummary->upvotes = $entity->getUpvoteCount();
        $voteSummary->downvotes = $entity->getDownvoteCount();
        $voteSummary->sum = $entity->getVoteScore();
        $voteSummary->currentUserVote = $entity->getUserVote($this->getUser())?->getVoteType() ?? 0;

        return $voteSummary;
    }
}
