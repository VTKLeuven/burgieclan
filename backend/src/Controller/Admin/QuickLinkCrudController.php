<?php

namespace App\Controller\Admin;

use App\Entity\QuickLink;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\UrlField;

class QuickLinkCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return QuickLink::class;
    }

    public function configureFields(string $pageName): iterable
    {
            yield TextField::new('name')
                ->setLabel('Name (displayed as)');
            yield UrlField::new('linkTo')
                ->setLabel('Link to (url)')
                ->setFormTypeOption('default_protocol', 'https')
            ;
    }
}
