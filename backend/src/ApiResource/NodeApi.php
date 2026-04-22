<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use Symfony\Component\Serializer\Attribute\Groups;

abstract class NodeApi extends BaseEntityApi
{
    #[ApiProperty(writable: false)]
    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    #[Groups(['course:get', 'document_comment:get'])]
    public ?UserApi $creator;
}
