<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use App\Constants\SerializationGroups;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

abstract class AbstractCommentApi extends NodeApi
{
    #[Assert\NotBlank]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    #[Groups(
        [
        SerializationGroups::COURSE_GET,
        SerializationGroups::DOCUMENT_COMMENT_GET,
        SerializationGroups::COURSE_COMMENT_GET
        ]
    )]
    public ?string $content = null;

    #[ApiFilter(BooleanFilter::class)]
    #[Groups(
        [
        SerializationGroups::COURSE_GET,
        SerializationGroups::DOCUMENT_COMMENT_GET,
        SerializationGroups::COURSE_COMMENT_GET
        ]
    )]
    public bool $anonymous = false;
}
