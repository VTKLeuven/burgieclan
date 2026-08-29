<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
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
        // Full-tree data remains opt-in for the curriculum search, which cannot filter unloaded
        // descendants. It is never requested during the initial page load. Keep this static route
        // before the /programs/{id} route so "tree" is not interpreted as an identifier.
        new GetCollection(
            uriTemplate: 'programs/tree',
            name: 'program_tree',
            normalizationContext: [
                'groups' => [SerializationGroups::PROGRAM_GET, SerializationGroups::MODULE_GET],
            ],
        ),
        // The normal collection is deliberately shallow: opening /courses only needs the names.
        new GetCollection(
            name: 'program_list',
            normalizationContext: ['groups' => [SerializationGroups::PROGRAM_LIST]],
        ),
        new Get(
            name: 'program_detail',
            normalizationContext: ['groups' => [SerializationGroups::PROGRAM_GET]],
        ),
    ],
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
            SerializationGroups::PROGRAM_LIST,
            SerializationGroups::MODULE_GET,
            SerializationGroups::SEARCH,
            SerializationGroups::USER
        ]
    )]
    public ?string $name = null;

    /**
     * The language this programme is taught and imported in ('nl' or 'en'), from its import
     * settings. Not a user preference: a Dutch programme lists Dutch course titles even for a
     * reader browsing the site in English, because that is what the titles actually are.
     * Read-only — it is set by the importer, not over the API.
     */
    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::PROGRAM_GET, SerializationGroups::MODULE_GET])]
    public string $language = 'nl';

    /**
     * @var ModuleApi[]
     */
    #[Groups([SerializationGroups::PROGRAM_GET])]
    public array $modules = [];
}
