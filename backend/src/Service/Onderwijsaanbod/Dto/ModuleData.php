<?php

namespace App\Service\Onderwijsaanbod\Dto;

/**
 * A node in the module tree to be imported. Maps onto our self-nesting Module entity.
 * A module holds directly-attached courses and any number of child modules.
 */
final class ModuleData
{
    /**
     * @param string             $kulId    Import key: KU Leuven moduleGroupId (named mode)
     *                                      or synthetic "stage:<programId>:<n>" (stage mode).
     * @param string             $name     Module title in the requested language.
     * @param list<ModuleData>   $children Nested sub-modules.
     * @param list<CourseData>   $courses  Courses directly under this module.
     */
    public function __construct(
        public readonly string $kulId,
        public readonly string $name,
        public array $children = [],
        public array $courses = [],
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
