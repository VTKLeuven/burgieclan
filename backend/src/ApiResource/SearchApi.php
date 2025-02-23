<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\Controller\Api\SearchController;
use Symfony\Component\Serializer\Attribute\Groups;

#[ApiResource(
    shortName: 'Search',
    operations: [
        new Get(
            uriTemplate: 'search',
            controller: SearchController::class,
            openapiContext: [
                'parameters' => [
                    [
                        'name'        => 'searchText',
                        'in'          => 'query',
                        'description' => 'Searchtext',
                        'required'    => false,
                        'schema'      => [
                            'type' => 'string',
                            'default'     => '',
                        ],                        
                    ],
                    [
                        'name'        => 'entities',
                        'in'          => 'query',
                        'description' => 'Entities to search',
                        'required'    => false,
                        'schema'      => [
                            'type'      => 'array',
                            'default'   => ['courses', 'modules', 'programs', 'documents'], 
                            // This only supports clients with docs that this is the default, 
                            // it does not change runtime behavior
                        ],
                    ],
                ],
            ],
            normalizationContext: ['groups' => ['search']],
            read: false,
        )
    ],
)]
class SearchApi
{
    /**
     * @var CourseApi[]
     */
    #[Groups('search')]
    public array $courses = [];

    /**
     * @var ModuleApi[]
     */
    #[Groups('search')]
    public array $modules = [];

    /**
     * @var ProgramApi[]
     */
    #[Groups('search')]
    public array $programs = [];

    /**
     * @var DocumentApi[]
     */
    #[Groups('search')]
    public array $documents = [];
}
