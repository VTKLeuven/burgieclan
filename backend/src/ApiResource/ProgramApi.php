<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Constants\SerializationGroups;
use App\Entity\Program;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Program',
    operations: [
        new Get(),
        new GetCollection(),
    ],
    normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::PROGRAM_GET]],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: Program::class),
)]
#[ApiFilter(OrderFilter::class)]
class ProgramApi extends BaseEntityApi
{
    #[Assert\NotBlank]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    #[Groups(
        [
        SerializationGroups::PROGRAM_GET,
        SerializationGroups::SEARCH,
        SerializationGroups::USER
        ]
    )]
    public ?string $name = null;

    /**
     * @var ModuleApi[]
     */
    #[Groups([SerializationGroups::PROGRAM_GET])]
    public array $modules = [];
}
