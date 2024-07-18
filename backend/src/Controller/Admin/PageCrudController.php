<?php

namespace App\Controller\Admin;

use App\Entity\Page;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class PageCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Page::class;
    }

    public function createEntity(string $entityFqcn): Page
    {
        return new Page("");
    }


    public function configureFields(string $pageName): iterable
    {
        yield Textfield::new('name');
        yield Textfield::new('urlKey');
        yield BooleanField::new('publicAvailable')
            ->renderAsSwitch(false);
        yield TextEditorField::new('content')
            ->setTemplatePath('admin/text_editor.html.twig');
    }
}
