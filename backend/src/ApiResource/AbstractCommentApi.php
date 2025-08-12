<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

abstract class AbstractCommentApi extends NodeApi
{
    #[Assert\NotBlank]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    #[Groups(['course:get', 'document_comment:get'])]
    public ?string $content = null;

    #[ApiFilter(BooleanFilter::class)]
    #[Groups(['course:get', 'document_comment:get'])]
    public bool $anonymous = false;
}
