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
     * @param list<string>  $professors  Professor display names (filled during enrichment).
     * @param list<string>  $identicalCourseCodes  ECTS codes of identical courses (filled during enrichment).
     * @param string|null   $kulModuleId KU Leuven internal moduleId, kept for enrichment lookups.
     */
    public function __construct(
        public readonly string $code,
        public readonly string $name,
        public readonly string $language,
        public readonly ?int $credits,
        public readonly array $semesters = [],
        public readonly bool $mandatory = true,
        public array $professors = [],
        public array $identicalCourseCodes = [],
        public readonly ?string $kulModuleId = null,
    ) {}
}
