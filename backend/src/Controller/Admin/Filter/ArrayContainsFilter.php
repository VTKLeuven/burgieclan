<?php

namespace App\Controller\Admin\Filter;

use EasyCorp\Bundle\EasyAdminBundle\Contracts\Filter\FilterInterface;
use EasyCorp\Bundle\EasyAdminBundle\Dto\EntityDto;
use EasyCorp\Bundle\EasyAdminBundle\Dto\FieldDto;
use EasyCorp\Bundle\EasyAdminBundle\Dto\FilterDataDto;
use EasyCorp\Bundle\EasyAdminBundle\Filter\FilterTrait;
use EasyCorp\Bundle\EasyAdminBundle\Form\Filter\Type\ChoiceFilterType;
use Doctrine\ORM\QueryBuilder;

class ArrayContainsFilter implements FilterInterface
{
    use FilterTrait;

    public static function new(string $propertyName, array $choices, ?string $label = null): self
    {
        return (new self())
            ->setFilterFqcn(__CLASS__)
            ->setProperty($propertyName)
            ->setLabel($label)
            ->setFormType(ChoiceFilterType::class)
            ->setFormTypeOptions([
                'value_type_options' => [
                    'choices' => $choices,
                    'multiple' => true,
                ],
                'comparison_type_options' => [
                    'choices' => [
                        'Contains Any' => 'CONTAINS_ANY',
                        'Contains All' => 'CONTAINS_ALL',
                        'Is Same' => 'IN',
                        'Is Not Same' => 'NOT IN',
                    ],
                ],
                'translation_domain' => 'EasyAdminBundle',
            ]);
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
        $isMultiple = $filterDataDto->getFormTypeOption('multiple');

        // Normalize $value to array
        if (is_array($value)) {
            $values = $value;
        } elseif ($value) {
            $values = [$value];
        } else {
            $values = [];
        }

        if (($comparison === 'CONTAINS_ANY' || $comparison === 'CONTAINS_ALL') && empty($values)) {
            // No values selected: do not filter
            return;
        }

        // Use LIKE for scalar array fields stored as JSON (e.g., roles)
        if (($comparison === 'CONTAINS_ANY' || $comparison === 'CONTAINS_ALL') && $values) {
            $expr = $comparison === 'CONTAINS_ANY' ? $queryBuilder->expr()->orX() : $queryBuilder->expr()->andX();
            foreach ($values as $i => $v) {
                // Match the value as a whole word in the JSON array string
                // e.g. '%"ROLE_ADMIN"%'
                $param = $parameterName . '_like_' . $i;
                $expr->add(sprintf('%s.%s LIKE :%s', $alias, $property, $param));
                $queryBuilder->setParameter($param, '%"' . $v . '"%');
            }
            $queryBuilder->andWhere($expr);
        } else {
            // fallback to IN/NOT IN
            if (empty($values)) {
                return;
            } else {
                $orX = $queryBuilder->expr()->orX();
                $orX->add(sprintf('%s.%s %s (:%s)', $alias, $property, $comparison, $parameterName));
                if ('NOT IN' === $comparison) {
                    $orX->add(sprintf('%s.%s IS NULL', $alias, $property));
                }
                $queryBuilder->andWhere($orX)
                    ->setParameter($parameterName, $values);
            }
        }
    }
}
