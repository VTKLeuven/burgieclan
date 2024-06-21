<?php

namespace App\Controller\Admin;

use App\Entity\DocumentComment;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;

class DocumentCommentCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return DocumentComment::class;
    }

    public function createEntity(string $entityFqcn)
    {
        $user = $this->getUser();
        assert($user instanceof User);
        return new DocumentComment($user);
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnDetail();
        yield TextEditorField::new('content');
        yield AssociationField::new('creator')
            ->hideOnForm();
        yield BooleanField::new('anonymous')
            ->renderAsSwitch(false);
        yield AssociationField::new('document')
            ->autocomplete();
        yield DateTimeField::new('createDate')
            ->hideOnForm();
        yield DateTimeField::new('updateDate')
            ->hideOnForm();
    }
}
