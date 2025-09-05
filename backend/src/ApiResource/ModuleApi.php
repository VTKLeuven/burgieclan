<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Module;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Module',
    operations: [
        new Get(normalizationContext: ['groups' => ['module:get']]),
        new GetCollection(),
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: Module::class),
)]
class ModuleApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    #[Assert\NotBlank]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    #[Groups(['module:get', 'program:get', 'search', 'user'])]
    public ?string $name = null;

    /**
     * @var CourseApi[]
     */
    #[Groups(['module:get', 'program:get'])]
    public array $courses;

    /**
     * @var ModuleApi[]
     */
    #[Groups(['module:get', 'program:get'])]
    public array $modules;

    #[Groups(['module:get', 'program:get', 'search'])]
    public ProgramApi $program;
}
