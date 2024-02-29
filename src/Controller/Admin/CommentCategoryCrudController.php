<?php

namespace App\Controller\Admin;

use App\Entity\CommentCategory;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class CommentCategoryCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return CommentCategory::class;
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->onlyOnDetail(),
            TextField::new('name'),
            TextEditorField::new('description'),
        ];
    }
}
