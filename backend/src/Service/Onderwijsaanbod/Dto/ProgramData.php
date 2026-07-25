<?php

namespace App\Service\Onderwijsaanbod\Dto;

/**
 * The full programme structure to be imported: a program with its top-level module tree.
 */
final class ProgramData
{
    /**
     * @param string           $kulId       KU Leuven programId; our Program.kulId.
     * @param string           $name        Programme title in the requested language.
     * @param list<ModuleData> $modules     Top-level modules.
     */
    public function __construct(
        public readonly string $kulId,
        public readonly string $name,
        public array $modules = [],
    ) {}

    /**
     * All distinct course codes anywhere in the tree (for batched enrichment lookups).
     *
     * @return list<string>
     */
    public function allCourseCodes(): array
    {
        $codes = [];
        $collect = static function (ModuleData $m) use (&$collect, &$codes): void {
            foreach ($m->courses as $course) {
                $codes[$course->code] = true;
            }
            foreach ($m->children as $child) {
                $collect($child);
            }
        };
        foreach ($this->modules as $module) {
            $collect($module);
        }

        return array_keys($codes);
    }
}
