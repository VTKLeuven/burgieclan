<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use App\Constants\SerializationGroups;
use Symfony\Component\Serializer\Attribute\Groups;

/**
 * Base API DTO providing common fields for all entities.
 * These fields are included in the SerializationGroups::BASE_READ group
 * which is added to every resource's normalizationContext.
 */
abstract class BaseEntityApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    #[Groups([SerializationGroups::BASE_READ])]
    public ?int $id = null;

    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::BASE_READ])]
    public string $createdAt;

    #[ApiProperty(writable: false)]
    #[Groups([SerializationGroups::BASE_READ])]
    public string $updatedAt;
}
