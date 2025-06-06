<?php

namespace App\Controller\Admin;

use App\Entity\Tag;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;

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
            // Regular display for index and detail pages
            yield AssociationField::new('documents')
                ->setLabel('Documents');
        } else {
            // For edit/new forms, customize the dropdown display
            yield AssociationField::new('documents')
                ->setLabel('Documents')
                ->setFormTypeOption('choice_label', function ($document) {
                    return sprintf(
                        '%s (%s, %s)',
                        $document->getName(),
                        $document->getCourse()->getName(),
                        $document->getCategory()->getName()
                    );
                });
        }
    }
}
