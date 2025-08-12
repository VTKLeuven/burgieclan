<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use Symfony\Component\Serializer\Attribute\Groups;

abstract class NodeApi
{
    #[ApiProperty(writable: false)]
    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    #[Groups(['course:get', 'document_comment:get'])]
    public ?UserApi $creator;

    #[ApiProperty(writable: false)]
    #[Groups(['course:get', 'document_comment:get'])]
    public string $createdAt;

    #[ApiProperty(writable: false)]
    #[Groups(['course:get', 'document_comment:get'])]
    public string $updatedAt;
}
