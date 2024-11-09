<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Post;
use App\Controller\Api\DownloadZipController;

#[ApiResource(
    shortName: 'Download zip',
    operations: [
        new Post(
            uriTemplate: 'zip',
            controller: DownloadZipController::class,
            name: 'Download zip'
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
}
