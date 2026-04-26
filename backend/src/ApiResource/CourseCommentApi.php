<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
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
    #[Groups([SerializationGroups::COURSE_COMMENT_GET, SerializationGroups::COURSE_GET])]
    public ?CourseApi $course;

    #[Groups([SerializationGroups::COURSE_COMMENT_GET, SerializationGroups::COURSE_GET])]
    public ?CommentCategoryApi $category;
}
