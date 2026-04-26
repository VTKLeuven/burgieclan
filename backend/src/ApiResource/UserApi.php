<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Patch;
use App\Constants\SerializationGroups;
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
        new Patch(
            security: 'is_granted("PATCH_USER", object)',
        ),
    ],
    normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::USER]],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: User::class),
)]
#[ApiResource(
    shortName: 'UserFavorites',
    operations: [
        new Get(
            uriTemplate: 'users/{id}/favorites',
            normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::USER_FAVORITES]],
        ),
        new Patch(
            uriTemplate: 'users/{id}/favorites/add',
            controller: AddFavoriteToUserController::class,
            normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::USER_FAVORITES]],
        ),
        new Patch(
            uriTemplate: 'users/{id}/favorites/remove',
            controller: RemoveFavoriteFromUserController::class,
            normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::USER_FAVORITES]],
        ),
    ],
    security: 'is_granted("VIEW_FAVORITES", object)',
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: User::class),
)]
class UserApi extends BaseEntityApi
{
    #[Assert\NotBlank]
    #[ApiProperty(writable: false)]
    #[Groups(
        [
            SerializationGroups::USER,
            SerializationGroups::COURSE_GET,
            SerializationGroups::DOCUMENT_GET,
            SerializationGroups::DOCUMENT_COMMENT_GET
        ]
    )]
    public ?string $fullName = null;

    #[Assert\NotBlank]
    #[Assert\Length(min: 2, max: 50)]
    #[ApiProperty(writable: false, security: 'is_granted("VIEW_USERNAME", object)')]
    #[Groups([SerializationGroups::USER])]
    public ?string $username = null;

    #[Assert\Email]
    #[ApiProperty(writable: false, security: 'is_granted("VIEW_EMAIL", object)')]
    #[Groups([SerializationGroups::USER])]
    public ?string $email = null;

    /**
     * @var CourseApi[]
     */
    #[Groups([SerializationGroups::USER, SerializationGroups::USER_FAVORITES])]
    #[ApiProperty(security: 'is_granted("VIEW_FAVORITES", object)')]
    public array $favoriteCourses = [];

    /**
     * @var ModuleApi[]
     */
    #[Groups([SerializationGroups::USER, SerializationGroups::USER_FAVORITES])]
    #[ApiProperty(security: 'is_granted("VIEW_FAVORITES", object)')]
    public array $favoriteModules = [];

    /**
     * @var ProgramApi[]
     */
    #[Groups([SerializationGroups::USER, SerializationGroups::USER_FAVORITES])]
    #[ApiProperty(security: 'is_granted("VIEW_FAVORITES", object)')]
    public array $favoritePrograms = [];

    /**
     * @var DocumentApi[]
     */
    #[Groups([SerializationGroups::USER, SerializationGroups::USER_FAVORITES])]
    #[ApiProperty(security: 'is_granted("VIEW_FAVORITES", object)')]
    public array $favoriteDocuments = [];

    #[Groups([SerializationGroups::USER])]
    #[ApiProperty(security: 'object === null or is_granted("VIEW_USER_DEFAULT_ANONYMOUS", object)')]
    // object === null is needed to circumvent a specific bug.
    // It is explained more in https://symfonycasts.com/screencast/api-platform-extending/patch-field-security#the-apiproperty-security-option-on-patch-operations
    public ?bool $defaultAnonymous = null;
}
