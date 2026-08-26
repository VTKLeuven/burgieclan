<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Constants\SerializationGroups;
use App\Entity\CommentCategory;
use App\Filter\MultiLangSearchFilter;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'CommentCategory',
    operations: [
        new Get(),
        new GetCollection(),
    ],
    normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::COMMENT_CATEGORY_GET]],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: CommentCategory::class),
)]
class CommentCategoryApi extends BaseEntityApi
{
    #[Assert\NotBlank]
    #[ApiFilter(
        MultiLangSearchFilter::class,
        properties: [
            'name' => ['name_nl', 'name_en'],
        ]
    )]
    #[Groups(
        [
            SerializationGroups::COMMENT_CATEGORY_GET,
            SerializationGroups::COURSE_GET,
            SerializationGroups::COURSE_COMMENT_GET
        ]
    )]
    public ?string $name = null;

    #[ApiFilter(
        MultiLangSearchFilter::class,
        properties: [
            'description' => ['description_nl', 'description_en'],
        ]
    )]
    #[Groups(
        [
            SerializationGroups::COMMENT_CATEGORY_GET,
            SerializationGroups::COURSE_GET,
            SerializationGroups::COURSE_COMMENT_GET
        ]
    )]
    public ?string $description = null;

    /**
     * 'discussion' or 'rated' - see CommentCategory::TYPE_*.
     *
     * Which sections carry stars is a per-category setting an admin controls, so the client
     * branches on this rather than on a list of category names.
     */
    #[Groups(
        [
            SerializationGroups::COMMENT_CATEGORY_GET,
            SerializationGroups::COURSE_GET,
            SerializationGroups::COURSE_COMMENT_GET
        ]
    )]
    public ?string $type = null;

    /**
     * What 1 and 5 mean on this section's scale, e.g. "licht" and "zwaar".
     *
     * Null on a discussion section. Rendered under the stars, because a bare 1-5 does not say
     * which direction is good and students would otherwise answer in both directions at once.
     */
    #[Groups([SerializationGroups::COMMENT_CATEGORY_GET, SerializationGroups::COURSE_GET])]
    public ?string $ratingLowLabel = null;

    #[Groups([SerializationGroups::COMMENT_CATEGORY_GET, SerializationGroups::COURSE_GET])]
    public ?string $ratingHighLabel = null;
}
