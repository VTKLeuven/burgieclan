<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;

abstract class NodeApi
{
    #[ApiProperty(writable: false)]
    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    public ?UserApi $creator;

    #[ApiProperty(writable: false)]
    public string $createdAt;

    #[ApiProperty(writable: false)]
    public string $updatedAt;
}
