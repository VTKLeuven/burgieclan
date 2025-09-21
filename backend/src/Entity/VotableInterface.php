<?php

namespace App\Entity;

use Doctrine\Common\Collections\Collection;

interface VotableInterface
{
    /**
     * Get all votes for this entity
     *
     * @return Collection
     */
    public function getVotes(): Collection;

    /**
     * Get the vote score (upvotes - downvotes)
     */
    public function getVoteScore(): int;

    /**
     * Get a specific user's vote on this entity
     * Returns the specific vote type (DocumentVote, CourseCommentVote, etc.)
     */
    public function getUserVote(User $user): mixed;

    /**
     * Get the number of upvotes
     */
    public function getUpvoteCount(): int;

    /**
     * Get the number of downvotes
     */
    public function getDownvoteCount(): int;

    /**
     * Check if a user has voted on this entity
     */
    public function hasUserVoted(User $user): bool;
}
