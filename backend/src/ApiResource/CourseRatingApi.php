<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use App\Constants\SerializationGroups;
use App\Entity\CommentCategory;
use App\Entity\CourseRating;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

/**
 * A student's own score for one course on one rated section.
 *
 * There is no PATCH and no id to target: posting again replaces the score you already gave,
 * which the mapper resolves from the signed-in user rather than from anything the client sends.
 * That is what makes it impossible to overwrite somebody else's rating, and it means a client
 * never has to remember whether this person has rated before.
 */
#[ApiResource(
    shortName: 'CourseRating',
    operations: [
        new Get(),
        new Post(),
    ],
    normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::COURSE_RATING_GET]],
    denormalizationContext: ['groups' => [SerializationGroups::COURSE_RATING_WRITE]],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: CourseRating::class),
)]
class CourseRatingApi extends BaseEntityApi
{
    #[Assert\NotNull]
    #[Groups([SerializationGroups::COURSE_RATING_GET, SerializationGroups::COURSE_RATING_WRITE])]
    public ?CourseApi $course = null;

    #[Assert\NotNull]
    #[Groups([SerializationGroups::COURSE_RATING_GET, SerializationGroups::COURSE_RATING_WRITE])]
    public ?CommentCategoryApi $category = null;

    #[Assert\NotNull]
    #[Assert\Range(min: CourseRating::MIN, max: CourseRating::MAX)]
    #[Groups([SerializationGroups::COURSE_RATING_GET, SerializationGroups::COURSE_RATING_WRITE])]
    public ?int $value = null;

    /**
     * The academic year being scored. Defaults to the current one when omitted.
     *
     * Not createdAt: someone rating a course two years after taking it would otherwise drag
     * stale experience into the recent window.
     */
    #[Assert\Regex(pattern: '/^\d{4} - \d{4}$/', message: 'Use the format "2024 - 2025".')]
    #[Groups([SerializationGroups::COURSE_RATING_GET, SerializationGroups::COURSE_RATING_WRITE])]
    public ?string $academicYear = null;

    /**
     * Whether the section being rated actually carries a scale.
     *
     * Constraints live on the resource because API Platform validates the DTO and the generic
     * processor hands the mapped entity straight to Doctrine - an entity-level callback would
     * never run.
     */
    #[Assert\Callback]
    public function validateCategoryIsRated(ExecutionContextInterface $context): void
    {
        if (null === $this->category) {
            return;
        }

        if (CommentCategory::TYPE_RATED !== $this->category->type) {
            $context->buildViolation('This comment section does not carry a rating.')
                ->atPath('category')
                ->addViolation();
        }
    }
}
