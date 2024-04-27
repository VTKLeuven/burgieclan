<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\Notification;
use App\State\EntityClassDtoStateProcessor;
use App\State\EntityClassDtoStateProvider;
use DateTime;

#[ApiResource(
    shortName: 'Notification',
    operations: [
        new Get(),
        new GetCollection(),
    ],
    provider: EntityClassDtoStateProvider::class,
    processor: EntityClassDtoStateProcessor::class,
    stateOptions: new Options(entityClass: Notification::class),
)]
class NotificationApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    public ?string $title = null;

    #[ApiFilter(SearchFilter::class, strategy: 'ipartial')]
    public ?string $content = null;

    // TODO add creator when UserApi exists
//    public ?UserApi $creator;

    #[ApiFilter(DateFilter::class)]
    public string $startTime;

    #[ApiFilter(DateFilter::class)]
    public string $endTime;

    #[ApiProperty(writable: false)]
    public string $createdAt;

    #[ApiProperty(writable: false)]
    public string $updatedAt;
}
