<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use App\Constants\SerializationGroups;
use Symfony\Component\Serializer\Attribute\Groups;

abstract class NodeApi extends BaseEntityApi
{
    #[ApiProperty(writable: false)]
    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    #[Groups(
        [
            SerializationGroups::COURSE_GET,
            SerializationGroups::DOCUMENT_COMMENT_GET,
            SerializationGroups::COURSE_COMMENT_GET,
            SerializationGroups::ANNOUNCEMENT_GET
        ]
    )]
    public ?UserApi $creator;
}
