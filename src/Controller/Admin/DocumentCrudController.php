<?php

namespace App\Controller\Admin;

use App\Entity\Document;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class DocumentCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Document::class;
    }

    public function createEntity(string $entityFqcn)
    {
        return new Document($this->getUser());
    }

//    COMMENTED BECAUSE NICE TO HAVE FOR TESTING
//    public function configureActions(Actions $actions): Actions
//    {
//        return $actions
//        ->disable(Action::NEW);
//    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('name');
        yield DateTimeField::new('createDate')
        ->hideOnForm();
        yield DateTimeField::new('updateDate')
        ->hideOnForm();
        yield BooleanField::new('under_review')
        ->setLabel('Published')
        ->renderAsSwitch(false);
        yield AssociationField::new('category')
        ->autocomplete();
        yield AssociationField::new('course')
        ->autocomplete();
    }
}
