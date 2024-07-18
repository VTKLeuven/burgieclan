<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\Entity\Page;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use App\State\PageApiProvider;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Page',
    operations: [
        new Get(
            security: 'is_granted("VIEW", object)', // Handled by the src/Security/Voter/PageVoter
            provider: PageApiProvider::class,
        ),
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: Page::class),
)]
class PageApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    public ?string $urlKey = null;

    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    public ?string $name = null;

    #[Assert\NotBlank]
    public ?string $content = null;

    public bool $publicAvailable = false;
}
