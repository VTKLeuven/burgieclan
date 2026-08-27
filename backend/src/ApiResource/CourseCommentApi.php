<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Constants\SerializationGroups;
use App\Entity\CourseComment;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

// Comments still arrive embedded in the course payload, so nothing consumes the collection
// endpoint yet. It had no filters at all, which meant there was no way to ask for one
// course's comments or to order them - the door had to be unlocked before comments can move
// off the course payload onto their own paginated endpoint.
#[ApiFilter(OrderFilter::class, properties: ['academicYear', 'createdAt', 'id'])]
#[ApiResource(
    shortName: 'CourseComment',
    operations: [
        new Get(),
        new GetCollection(),
        new Patch(
            // This redirects the security check to all voters to see if one accepts CourseCommentApi objects
            // This is handled by the src/Security/Voter/AbstractCommentVoter
            security: 'is_granted("EDIT", object)'
        ),
        new Post(),
        new Delete(
            // This redirects the security check to all voters to see if one accepts CourseCommentApi objects
            // This is handled by the src/Security/Voter/AbstractCommentVoter
            security: 'is_granted("DELETE", object)'
        ),
    ],
    normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::COURSE_COMMENT_GET]],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: CourseComment::class),
)]
class CourseCommentApi extends AbstractCommentApi
{
    #[Assert\NotNull]
    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    #[Groups([SerializationGroups::COURSE_COMMENT_GET, SerializationGroups::COURSE_GET])]
    public ?CourseApi $course = null;

    #[Assert\NotNull]
    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    #[Groups([SerializationGroups::COURSE_COMMENT_GET, SerializationGroups::COURSE_GET])]
    public ?CommentCategoryApi $category = null;

    /**
     * The academic year this comment is about, e.g. "2024 - 2025".
     *
     * Distinct from createdAt, which is when it was written: a comment migrated from the old
     * course wiki carries the year it describes, not the day it was imported. Null on
     * comments whose year could not be determined; those sort last.
     */
    #[Assert\Regex(pattern: '/^\d{4} - \d{4}$/', message: 'Use the format "2024 - 2025".')]
    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    #[Groups([SerializationGroups::COURSE_COMMENT_GET, SerializationGroups::COURSE_GET])]
    public ?string $academicYear = null;
}
