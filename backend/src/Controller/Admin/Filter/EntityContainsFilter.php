<?php

namespace App\Controller\Admin\Filter;

use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Query\Expr\Orx;
use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Contracts\Filter\FilterInterface;
use EasyCorp\Bundle\EasyAdminBundle\Dto\EntityDto;
use EasyCorp\Bundle\EasyAdminBundle\Dto\FieldDto;
use EasyCorp\Bundle\EasyAdminBundle\Dto\FilterDataDto;
use EasyCorp\Bundle\EasyAdminBundle\Filter\FilterTrait;
use EasyCorp\Bundle\EasyAdminBundle\Form\Filter\Type\EntityFilterType;

class EntityContainsFilter implements FilterInterface
{
    use FilterTrait;

    public static function new(string $propertyName, string $entityClass, ?string $label = null): self
    {
        return (new self())
            ->setFilterFqcn(__CLASS__)
            ->setProperty($propertyName)
            ->setLabel($label)
            ->setFormType(EntityFilterType::class)
            ->setFormTypeOptions([
                'value_type_options' => [
                    'class' => $entityClass,
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

    public function canSelectMultiple(bool $selectMultiple = true): self
    {
        $this->dto->setFormTypeOption('value_type_options.multiple', $selectMultiple);

        return $this;
    }

    public function apply(
        QueryBuilder  $queryBuilder,
        FilterDataDto $filterDataDto,
        ?FieldDto     $fieldDto,
        EntityDto     $entityDto
    ): void {
        $alias = $filterDataDto->getEntityAlias();
        $property = $filterDataDto->getProperty();
        $comparison = $filterDataDto->getComparison();
        $parameterName = $filterDataDto->getParameterName();
        $value = $filterDataDto->getValue();
        $isMultiple = $filterDataDto->getFormTypeOption('value_type_options.multiple');

        // Normalize $value to array if it's an ArrayCollection
        if ($value instanceof Collection) {
            $values = $value->toArray();
        } elseif (is_array($value)) {
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

        // Determine association type
        $associationType = null;
        if ($entityDto->isToManyAssociation($property)) {
            $associationType = 'toMany';
        } elseif ($entityDto->isAssociation($property)) {
            $associationType = 'toOne';
        }

        $rootAlias = $queryBuilder->getRootAliases()[0];

        if ($associationType === 'toMany') {
            // ManyToMany or OneToMany: MEMBER OF logic
            if ($comparison === 'CONTAINS_ANY' && $values) {
                $orX = $queryBuilder->expr()->orX();
                foreach ($values as $i => $v) {
                    $param = $parameterName . '_contains_' . $i;
                    $orX->add(":$param MEMBER OF $rootAlias.$property");
                    $queryBuilder->setParameter($param, $v);
                }
                $queryBuilder->andWhere($orX);
            } elseif ($comparison === 'CONTAINS_ALL' && $values) {
                foreach ($values as $i => $v) {
                    $param = $parameterName . '_containsall_' . $i;
                    $queryBuilder->andWhere(":$param MEMBER OF $rootAlias.$property");
                    $queryBuilder->setParameter($param, $v);
                }
            } else {
                // fallback to default entity filter logic for IN/NOT IN
                $assocAlias = 'ea_' . $parameterName;
                $queryBuilder->leftJoin(sprintf('%s.%s', $alias, $property), $assocAlias);
                if (empty($values)) {
                    // No values selected: do not filter
                    return;
                } else {
                    $orX = new Orx();
                    $orX->add(sprintf('%s %s (:%s)', $assocAlias, $comparison, $parameterName));
                    if ('NOT IN' === $comparison) {
                        $orX->add(sprintf('%s IS NULL', $assocAlias));
                    }
                    $queryBuilder->andWhere($orX)
                        ->setParameter($parameterName, $values);
                }
            }
        } elseif ($associationType === 'toOne') {
            // ManyToOne or OneToOne: use IN logic
            if (empty($values)) {
                // No values selected: do not filter
                return;
            }
            if ($comparison === 'CONTAINS_ANY' || $comparison === 'IN') {
                $queryBuilder->andWhere(sprintf('%s.%s IN (:%s)', $alias, $property, $parameterName))
                    ->setParameter($parameterName, $values);
            } elseif ($comparison === 'NOT IN') {
                $orX = new Orx();
                $orX->add(sprintf('%s.%s NOT IN (:%s)', $alias, $property, $parameterName));
                $orX->add(sprintf('%s.%s IS NULL', $alias, $property));
                $queryBuilder->andWhere($orX)
                    ->setParameter($parameterName, $values);
            } else {
                // fallback to equality
                $queryBuilder->andWhere(sprintf('%s.%s = :%s', $alias, $property, $parameterName))
                    ->setParameter($parameterName, $values[0]);
            }
        } else {
            // Not an association, fallback to default
            if (null === $value || ($isMultiple && empty($values))) {
                // No values selected: do not filter
                return;
            } else {
                $orX = new Orx();
                $orX->add(sprintf('%s.%s %s (:%s)', $alias, $property, $comparison, $parameterName));
                if ('!=' === $comparison) {
                    $orX->add(sprintf('%s.%s IS NULL', $alias, $property));
                }
                $queryBuilder->andWhere($orX)
                    ->setParameter($parameterName, $values);
            }
        }
    }
}
