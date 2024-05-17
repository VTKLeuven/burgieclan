<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Patch;
use App\Entity\User;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'User',
    operations: [
        new Get(),
        new Patch(),
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: User::class),
)]
class UserApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    #[Assert\NotBlank]
    #[ApiProperty(writable: false)]
    public ?string $fullName = null;

    #[Assert\NotBlank]
    #[Assert\Length(min: 2, max: 50)]
    #[ApiProperty(writable: false)]
    #[ApiProperty(security: 'is_granted("VIEW_USERNAME", object)')]
    public ?string $username = null;

    #[Assert\Email]
    #[ApiProperty(writable: false)]
    #[ApiProperty(security: 'is_granted("VIEW_EMAIL", object)')]
    public ?string $email = null;

    /**
     * @var CourseApi[]
     */
    public array $favoriteCourses = [];

    /**
     * @var ModuleApi[]
     */
    public array $favoriteModules = [];

    /**
     * @var ProgramApi[]
     */
    public array $favoritePrograms = [];

    /**
     * @var DocumentApi[]
     */
    public array $favoriteDocuments = [];
}
