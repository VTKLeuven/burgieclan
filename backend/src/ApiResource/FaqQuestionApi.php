<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use ApiPlatform\OpenApi\Model\Operation;
use App\Constants\SerializationGroups;
use App\Entity\FaqQuestion;
use App\Entity\User;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Questions asked from the FAQ page. Write-only from the frontend's point of view: users submit
 * them, admins handle them in the EasyAdmin inbox (@see App\Controller\Admin\FaqQuestionCrudController).
 *
 * There is deliberately no GetCollection — nothing on the frontend lists questions, and exposing
 * one would leak what users ask to every logged-in account.
 */
#[ApiResource(
    shortName: 'FaqQuestion',
    operations: [
        // Not used by the frontend, but API Platform needs an item operation to build the IRI it
        // returns from the Post. Restricted to admins so it cannot be walked by regular users.
        new Get(
            security: 'is_granted("' . User::ROLE_ADMIN . '")',
        ),
        new Post(
            openapi: new Operation(
                summary: 'Submit a question for the FAQ.',
                description: 'Submits a question that lands in the admin inbox. The asker is taken '
                    . 'from the authenticated user, so no author has to be sent.',
            ),
        ),
    ],
    normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::FAQ_QUESTION_GET]],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: FaqQuestion::class),
)]
class FaqQuestionApi extends BaseEntityApi
{
    #[Assert\NotBlank]
    #[Assert\Length(
        min: 10,
        max: 2000,
        minMessage: 'Please describe your question in at least {{ limit }} characters.',
        maxMessage: 'A question cannot be longer than {{ limit }} characters.',
    )]
    #[Groups([SerializationGroups::FAQ_QUESTION_GET])]
    public ?string $question = null;

    /**
     * Language the question is asked in, so the admin knows which FaqItem field to fill when
     * promoting it.
     */
    #[Assert\Choice(callback: [FaqQuestion::class, 'getAvailableLocales'])]
    #[Groups([SerializationGroups::FAQ_QUESTION_GET])]
    public string $locale = FaqQuestion::DEFAULT_LOCALE;

    #[Assert\Choice(callback: [FaqQuestion::class, 'getAvailableTypes'])]
    #[Groups([SerializationGroups::FAQ_QUESTION_GET])]
    public string $type = FaqQuestion::TYPE_GENERAL;

    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::FAQ_QUESTION_GET])]
    public string $status = FaqQuestion::STATUS_NEW;
}
