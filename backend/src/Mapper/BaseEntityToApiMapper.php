<?php

namespace App\Mapper;

use App\ApiResource\BaseEntityApi;
use App\Entity\BaseEntity;
use LogicException;
use Symfonycasts\MicroMapper\MapperInterface;

/**
 * Base mapper providing common field mapping for entities extending BaseEntity
 * and API resources extending BaseEntityApi.
 *
 * This mapper handles automatic mapping of id, createdAt, and updatedAt fields.
 * Extend this class in entity-specific mappers to leverage this functionality.
 */
abstract class BaseEntityToApiMapper implements MapperInterface
{
    /**
     * Maps base entity fields (id, createdAt, updatedAt) to the API DTO.
     * Call this from your mapper's load() method to set up the base fields.
     *
     * @param BaseEntity $from The source entity
     * @param BaseEntityApi $to The target API DTO
     */
    protected function mapBaseFields(BaseEntity $from, BaseEntityApi $to): void
    {
        $to->id = $from->getId() ?? throw new LogicException('Entity must have an ID before mapping base fields.');
        $to->createdAt = $from->getCreatedAt()->format(DATE_ATOM);
        $to->updatedAt = $from->getUpdatedAt()->format(DATE_ATOM);
    }
}
