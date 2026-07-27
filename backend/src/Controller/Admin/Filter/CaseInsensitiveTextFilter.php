<?php

namespace App\Controller\Admin\Filter;

use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Contracts\Filter\FilterInterface;
use EasyCorp\Bundle\EasyAdminBundle\Dto\EntityDto;
use EasyCorp\Bundle\EasyAdminBundle\Dto\FieldDto;
use EasyCorp\Bundle\EasyAdminBundle\Dto\FilterDataDto;
use EasyCorp\Bundle\EasyAdminBundle\Filter\FilterTrait;
use EasyCorp\Bundle\EasyAdminBundle\Form\Filter\Type\TextFilterType;
use Symfony\Contracts\Translation\TranslatableInterface;

/**
 * Drop-in replacement for EasyAdmin's built-in TextFilter that matches case-insensitively.
 *
 * EasyAdmin's TextFilter emits `entity.field <comparison> :value`. On PostgreSQL the `LIKE`
 * operator is case-sensitive, so filtering e.g. courses by name ("wiskunde" vs "Wiskunde")
 * silently missed rows. Wrapping both sides in LOWER() makes the comparison case-insensitive
 * on every database while reusing the exact same filter form/UI (so "contains", "starts with",
 * … keep working and the value already carries its % wildcards).
 */
class CaseInsensitiveTextFilter implements FilterInterface
{
    use FilterTrait;

    public static function new(string $propertyName, string|TranslatableInterface|false|null $label = null): self
    {
        return (new self())
            ->setFilterFqcn(__CLASS__)
            ->setProperty($propertyName)
            ->setLabel($label)
            ->setFormType(TextFilterType::class)
            ->setFormTypeOption('translation_domain', 'EasyAdminBundle');
    }

    public function apply(
        QueryBuilder $queryBuilder,
        FilterDataDto $filterDataDto,
        ?FieldDto $fieldDto,
        EntityDto $entityDto
    ): void {
        $alias = $filterDataDto->getEntityAlias();
        $property = $filterDataDto->getProperty();
        $comparison = $filterDataDto->getComparison();
        $parameterName = $filterDataDto->getParameterName();
        $value = $filterDataDto->getValue();

        $queryBuilder
            ->andWhere(sprintf('LOWER(%s.%s) %s LOWER(:%s)', $alias, $property, $comparison, $parameterName))
            ->setParameter($parameterName, $value);
    }
}
