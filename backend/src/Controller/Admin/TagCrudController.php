<?php

namespace App\Controller\Admin;

use App\Controller\Admin\Filter\EntityContainsFilter;
use App\Entity\Document;
use App\Entity\Tag;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class TagCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Tag::class;
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('name');

        if (in_array($pageName, [Crud::PAGE_INDEX, Crud::PAGE_DETAIL])) {
            // Index and detail pages – simple association display
            yield AssociationField::new('documents')
                ->setLabel('Documents');
        } else {
            // Edit/New forms – custom label showing document name, course name, and category name (Dutch)
            yield AssociationField::new('documents')
                ->setLabel('Documents')
                ->setFormTypeOption(
                    'choice_label',
                    function ($document) {
                        return sprintf(
                            '%s (%s, %s)',
                            $document->getName(),
                            $document->getCourse()->getName(),
                            $document->getCategory()->getName('nl')
                        );
                    }
                )
                ->setFormTypeOption('by_reference', false); // crucial for ManyToMany
        }
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add('name')
            ->add(EntityContainsFilter::new('documents', Document::class));
    }
}
