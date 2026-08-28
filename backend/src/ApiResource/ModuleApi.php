<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Constants\SerializationGroups;
use App\Controller\Api\GetModulePathController;
use App\Entity\Module;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Module',
    operations: [
        new Get(),
        new GetCollection(),
        // Lets a link to a nested module tell the navigator which branches to open, without
        // making it download the whole curriculum first.
        new Get(
            uriTemplate: 'modules/{id}/path',
            controller: GetModulePathController::class,
            read: false,
            name: 'module_path',
        ),
    ],
    normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::MODULE_GET]],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: Module::class),
)]
class ModuleApi extends BaseEntityApi
{
    #[Assert\NotBlank]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    #[Groups(
        [
            SerializationGroups::MODULE_GET,
            SerializationGroups::PROGRAM_GET,
            SerializationGroups::SEARCH,
            SerializationGroups::USER
        ]
    )]
    public ?string $name = null;

    /**
     * Whether this module is an elective option rather than a compulsory group.
     */
    #[Groups([SerializationGroups::MODULE_GET])]
    public ?bool $isElective = null;

    /**
     * @var CourseApi[]
     */
    #[Groups([SerializationGroups::MODULE_GET])]
    public array $courses;

    /**
     * @var ModuleApi[]
     */
    #[Groups([SerializationGroups::MODULE_GET])]
    public array $modules;

    #[Groups(
        [
            SerializationGroups::MODULE_GET,
            SerializationGroups::PROGRAM_GET,
            SerializationGroups::SEARCH,
        ]
    )]
    public ProgramApi $program;
}
