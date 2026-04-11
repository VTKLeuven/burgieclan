<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;

/**
 * Base API DTO providing common fields for all entities.
 * These fields are intentionally NOT restricted to specific serializer groups
 * to ensure they are always returned in API responses.
 */
abstract class BaseEntityApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    #[ApiProperty(writable: false)]
    public ?string $createdAt = null;

    #[ApiProperty(writable: false)]
    public ?string $updatedAt = null;
}
