<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Post;
use ApiPlatform\OpenApi\Model\Operation;
use ApiPlatform\OpenApi\Model\RequestBody;
use ApiPlatform\OpenApi\Model\Response;
use App\Controller\Api\DownloadZipController;
use ArrayObject;

#[ApiResource(
    shortName: 'DownloadZip',
    operations: [
        new Post(
            uriTemplate: 'zip',
            controller: DownloadZipController::class,
            openapi: new Operation(
                responses: [
                    '200' => new Response(
                        description: 'Download zip file',
                        content: new ArrayObject(
                            [
                                'application/zip' => [
                                    'schema' => [
                                        'type' => 'string',
                                        'format' => 'binary',
                                    ],
                                ],
                            ],
                        ),
                    ),
                    '204' => new Response(
                        description: 'No content to zip',
                    ),
                ],
                requestBody: new RequestBody(
                    content: new ArrayObject(
                        [
                            'application/ld+json' => [
                                'schema' => [
                                    'type' => 'object',
                                    'properties' => [
                                        'programs' => [
                                            'type' => 'array',
                                            'format' => 'iri-reference',
                                            'example' => ['/api/programs/1']
                                        ],
                                        'modules' => [
                                            'type' => 'array',
                                            'format' => 'iri-reference',
                                            'example' => ['/api/modules/1']
                                        ],
                                        'courses' => [
                                            'type' => 'array',
                                            'format' => 'iri-reference',
                                            'example' => ['/api/courses/1']
                                        ],
                                        'documents' => [
                                            'type' => 'array',
                                            'format' => 'iri-reference',
                                            'example' => ['/api/documents/1']
                                        ],
                                    ],
                                ],
                            ],
                        ]
                    )
                ),
            ),
            name: 'Download zip file',
        ),
    ]
)]
class ZipApi
{
    /**
     * @var ProgramApi[]
     */
    public array $programs = [];

    /**
     * @var ModuleApi[]
     */
    public array $modules = [];

    /**
     * @var CourseApi[]
     */
    public array $courses = [];

    /**
     * @var DocumentApi[]
     */
    public array $documents = [];
}
