<?php

namespace App\Controller\Admin;

use App\Entity\CourseComment;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class CourseCommentCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return CourseComment::class;
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnDetail();
        yield TextEditorField::new('content');
        yield TextField::new('user')
            ->hideOnForm();
        yield BooleanField::new('anonymous')
            ->renderAsSwitch(false);
        yield AssociationField::new('course')
            ->autocomplete();
        yield AssociationField::new('category')
            ->autocomplete();
        yield DateTimeField::new('createDate')
            ->hideOnForm();
        yield DateTimeField::new('updateDate')
            ->hideOnForm();
    }
}
