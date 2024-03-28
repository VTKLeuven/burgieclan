<?php

namespace App\Controller\Admin;

use App\Entity\DocumentComment;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class DocumentCommentCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return DocumentComment::class;
    }

    public function createEntity(string $entityFqcn)
    {
        return new DocumentComment($this->getUser());
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnDetail();
        yield TextEditorField::new('content');
        yield AssociationField::new('user')
            ->hideOnForm();
        yield AssociationField::new('document')
            ->autocomplete();
        yield DateTimeField::new('createDate')
            ->hideOnForm();
        yield DateTimeField::new('updateDate')
            ->hideOnForm();
    }
}
