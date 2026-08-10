<?php

namespace App\Service\Onderwijsaanbod\Dto;

/**
 * A course (KU Leuven "opleidingsonderdeel" / OPO) as read from the onderwijsaanbod API,
 * normalised to the shape our Course entity needs. This is a plain transport object; it holds
 * no Doctrine state and performs no persistence.
 */
final class CourseData
{
    /**
     * @param string        $code        The 6-character ECTS code (KU Leuven "short"); our Course.code.
     * @param string        $name        Course title in the requested language.
     * @param 'nl'|'en'     $language    Original language of instruction.
     * @param int|null      $credits     ECTS credits.
     * @param list<string>  $semesters   Subset of Course::SEMESTERS values.
     * @param bool          $mandatory   Whether the course is mandatory within its group.
     * @param int|null      $stage       Study stage / year (1..n) this course sits in; used to derive
     *                                   the degree-wide semester number when semester-grouping.
     *                                   Transport-only: it shapes the tree but is not persisted.
     */
    public function __construct(
        public readonly string $code,
        public readonly string $name,
        public readonly string $language,
        public readonly ?int $credits,
        public readonly array $semesters = [],
        public readonly bool $mandatory = true,
        public readonly ?int $stage = null,
    ) {}
}
