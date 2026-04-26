<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\OpenApi\Model\Operation;
use ApiPlatform\OpenApi\Model\Parameter;
use App\Constants\SerializationGroups;
use App\Controller\Api\SearchController;
use Symfony\Component\Serializer\Attribute\Groups;

#[ApiResource(
    shortName: 'Search',
    operations: [
        new Get(
            uriTemplate: 'search',
            controller: SearchController::class,
            openapi: new Operation(
                parameters: [
                    new Parameter(
                        name: 'searchText',
                        in: 'query',
                        required: false,
                        description: 'Searchtext',
                        schema: [
                            'type' => 'string',
                            'default' => '',
                        ],
                    )
                ]
            ),
            normalizationContext: ['groups' => [SerializationGroups::BASE_READ, SerializationGroups::SEARCH]],
            read: false,
        )
    ],
)]
class SearchApi
{
    /**
     * @var CourseApi[]
     */
    #[Groups(SerializationGroups::SEARCH)]
    public array $courses = [];

    /**
     * @var ModuleApi[]
     */
    #[Groups(SerializationGroups::SEARCH)]
    public array $modules = [];

    /**
     * @var ProgramApi[]
     */
    #[Groups(SerializationGroups::SEARCH)]
    public array $programs = [];

    /**
     * @var DocumentApi[]
     */
    #[Groups(SerializationGroups::SEARCH)]
    public array $documents = [];
}
