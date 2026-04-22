<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use App\Constants\SerializationGroups;
use Symfony\Component\Serializer\Attribute\Groups;

/**
 * Base API DTO providing common fields for all entities.
 * These fields are included in all serialization groups
 * to ensure they are always returned in API responses.
 */
abstract class BaseEntityApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    #[Groups(SerializationGroups::ALL_READ_GROUPS)]
    public int $id;

    #[ApiProperty(writable: false)]
    #[Groups(SerializationGroups::ALL_READ_GROUPS)]
    public string $createdAt;

    #[ApiProperty(writable: false)]
    #[Groups(SerializationGroups::ALL_READ_GROUPS)]
    public string $updatedAt;
}
