<?php

namespace App\Service\Onderwijsaanbod\Dto;

/**
 * A node in the module tree to be imported. Maps onto our self-nesting Module entity.
 * A module holds directly-attached courses and any number of child modules.
 */
final class ModuleData
{
    /**
     * @param string             $kulId      Import key: KU Leuven moduleGroupId (named mode)
     *                                        or synthetic "stage:<programId>:<n>" (stage mode).
     * @param string             $name       Module title in the requested language.
     * @param list<ModuleData>   $children   Nested sub-modules.
     * @param list<CourseData>   $courses    Courses directly under this module.
     * @param bool               $isElective KU Leuven moduleGroupType "01" (Optie) rather than
     *                                        "02" (Groep): an option the student chooses, not a
     *                                        compulsory structural group. Every transform that
     *                                        rebuilds a ModuleData must carry this over.
     */
    public function __construct(
        public readonly string $kulId,
        public readonly string $name,
        public array $children = [],
        public array $courses = [],
        public readonly bool $isElective = false,
    ) {}

    public function addChild(ModuleData $child): void
    {
        $this->children[] = $child;
    }

    public function addCourse(CourseData $course): void
    {
        $this->courses[] = $course;
    }
}
