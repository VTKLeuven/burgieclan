<?php

namespace App\Controller\Admin;

use App\Entity\DocumentCategory;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

#[IsGranted(User::ROLE_ADMIN)]
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

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->hideOnForm(),
            TextField::new('name', 'Category Name'),
            AssociationField::new('parent', 'Parent Category')
                ->setRequired(false)
                ->renderAsNativeWidget()
        ];
    }
}
