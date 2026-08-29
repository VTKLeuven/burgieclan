<?php

namespace App\Serializer;

use App\Entity\Module;
use App\Entity\Program;

/**
 * The wire shape of a curriculum path, shared by the course and module path endpoints so a
 * client has one thing to parse rather than two that drifted apart.
 *
 * IRI plus name: the IRI identifies the node the way every other response does, and the name is
 * what a breadcrumb or a folder tree actually draws - sending it here saves a request per node.
 */
final class CurriculumPathNormalizer
{
    /**
     * @param array{program: Program, modules: Module[]} $path
     * @return array{program: array{'@id': string, name: string}, modules: list<array{'@id': string, name: string}>}
     */
    public static function normalize(array $path): array
    {
        return [
            'program' => [
                '@id' => '/api/programs/' . $path['program']->getId(),
                'name' => $path['program']->getName(),
            ],
            'modules' => array_values(
                array_map(
                    static fn(Module $module): array => [
                    '@id' => '/api/modules/' . $module->getId(),
                    'name' => $module->getName(),
                    ],
                    $path['modules']
                )
            ),
        ];
    }
}
