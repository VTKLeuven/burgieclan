<?php

namespace App\Controller\Admin;

use App\Entity\DocumentCategory;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;

class DocumentCategoryCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return DocumentCategory::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Document Category')
            ->setEntityLabelInPlural('Document Categories');
    }

    /*
    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id'),
            TextField::new('title'),
            TextEditorField::new('description'),
        ];
    }
    */
}
