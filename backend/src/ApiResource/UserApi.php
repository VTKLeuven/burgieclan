<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Patch;
use App\Controller\Api\AddFavoriteToUserController;
use App\Controller\Api\RemoveFavoriteFromUserController;
use App\Entity\User;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'User',
    operations: [
        new Get(),
        new Patch(),
    ],
    normalizationContext: ['groups' => ['user']],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: User::class),
)]
#[ApiResource(
    shortName: 'User favorites',
    operations: [
        new Get(
            uriTemplate: 'users/{id}/favorites',
            normalizationContext: ['groups' => ['user:favorites']],
        ),
        new Patch(
            uriTemplate: 'users/{id}/favorites/add',
            controller: AddFavoriteToUserController::class,
            normalizationContext: ['groups' => ['user:favorites']],
        ),
        new Patch(
            uriTemplate: 'users/{id}/favorites/remove',
            controller: RemoveFavoriteFromUserController::class,
            normalizationContext: ['groups' => ['user:favorites']],
        ),
    ],
    security: 'is_granted("VIEW_FAVORITES", object)',
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: User::class),
)]
class UserApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    #[Groups('user')]
    public ?int $id = null;

    #[Assert\NotBlank]
    #[ApiProperty(writable: false)]
    #[Groups(['user', 'course:get'])]
    public ?string $fullName = null;

    #[Assert\NotBlank]
    #[Assert\Length(min: 2, max: 50)]
    #[ApiProperty(writable: false, security: 'is_granted("VIEW_USERNAME", object)')]
    #[Groups('user')]
    public ?string $username = null;

    #[Assert\Email]
    #[ApiProperty(writable: false, security: 'is_granted("VIEW_EMAIL", object)')]
    #[Groups('user')]
    public ?string $email = null;

    /**
     * @var CourseApi[]
     */
    #[Groups(['user', 'user:favorites'])]
    #[ApiProperty(security: 'is_granted("VIEW_FAVORITES", object)')]
    public array $favoriteCourses = [];

    /**
     * @var ModuleApi[]
     */
    #[Groups(['user', 'user:favorites'])]
    #[ApiProperty(security: 'is_granted("VIEW_FAVORITES", object)')]
    public array $favoriteModules = [];

    /**
     * @var ProgramApi[]
     */
    #[Groups(['user', 'user:favorites'])]
    #[ApiProperty(security: 'is_granted("VIEW_FAVORITES", object)')]
    public array $favoritePrograms = [];

    /**
     * @var DocumentApi[]
     */
    #[Groups(['user', 'user:favorites'])]
    #[ApiProperty(security: 'is_granted("VIEW_FAVORITES", object)')]
    public array $favoriteDocuments = [];
}
