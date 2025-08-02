<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Professor;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Professor',
    operations: [
        new Get(normalizationContext: ['groups' => ['professor:get']]),
        new GetCollection(),
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: Professor::class),
)]
class ProfessorApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    #[Assert\NotBlank]
    #[Assert\Regex(pattern: '/^u\d{7}$/', message: 'U-number must be in format u1234567')]
    #[ApiFilter(SearchFilter::class, strategy: 'exact')]
    #[Groups(['professor:get', 'course:get', 'search'])]
    public ?string $uNumber = null;

    #[Assert\NotBlank]
    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    #[Groups(['professor:get', 'course:get', 'search'])]
    public ?string $name = null;

    #[Assert\Email]
    #[Groups(['professor:get'])]
    public ?string $email = null;

    #[Groups(['professor:get', 'course:get'])]
    public ?string $pictureUrl = null;

    #[Groups(['professor:get'])]
    public ?string $department = null;

    #[Groups(['professor:get'])]
    public ?string $title = null;

    #[Groups(['professor:get'])]
    public ?\DateTimeInterface $lastUpdated = null;

    /**
     * @var CourseApi[]
     */
    #[Groups(['professor:get'])]
    public array $courses = [];
}