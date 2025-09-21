<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Patch;
use App\Controller\Api\AddFavoriteToUserController;
use App\Controller\Api\RemoveFavoriteFromUserController;
use App\Controller\Api\AddVoteToUserController;
use App\Controller\Api\RemoveVoteFromUserController;
use App\Entity\User;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'User',
    operations: [
        new Get(),
        new Patch(
            security: 'is_granted("PATCH_USER", object)',
        ),
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
#[ApiResource(
    shortName: 'User Votes',
    operations: [
        new Get(
            uriTemplate: 'users/{id}/votes',
            normalizationContext: ['groups' => ['user:votes']],
        ),
        new Patch(
            uriTemplate: 'users/{id}/votes/add',
            controller: AddVoteToUserController::class,
            normalizationContext: ['groups' => ['user:votes']],
        ),
        new Patch(
            uriTemplate: 'users/{id}/votes/remove',
            controller: RemoveVoteFromUserController::class,
            normalizationContext: ['groups' => ['user:votes']],
        ),
    ],
    security: 'is_granted("VIEW_VOTES", object)',
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
    #[Groups(['user', 'course:get', 'document:get', 'document_comment:get'])]
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

    #[Groups(['user'])]
    #[ApiProperty(security: 'object === null or is_granted("VIEW_USER_DEFAULT_ANONYMOUS", object)')]
    // object === null is needed to circumvent a specific bug.
    // It is explained more in https://symfonycasts.com/screencast/api-platform-extending/patch-field-security#the-apiproperty-security-option-on-patch-operations
    public ?bool $defaultAnonymous = null;

    /**
     * @var DocumentVoteApi[]
     */
    #[Groups(['user', 'user:votes'])]
    #[ApiProperty(security: 'is_granted("VIEW_VOTES", object)')]
    public array $documentVotes = [];

    /**
     * @var DocumentCommentVoteApi[]
     */
    #[Groups(['user', 'user:votes'])]
    #[ApiProperty(security: 'is_granted("VIEW_VOTES", object)')]
    public array $documentCommentVotes = [];

    /**
     * @var CourseCommentVoteApi[]
     */
    #[Groups(['user', 'user:votes'])]
    #[ApiProperty(security: 'is_granted("VIEW_VOTES", object)')]
    public array $courseCommentVotes = [];
}
