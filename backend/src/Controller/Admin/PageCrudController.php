<?php

namespace App\Controller\Admin;

use App\Entity\Page;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted(User::ROLE_ADMIN)]
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
        yield Textfield::new('name_nl')
            ->setRequired(true)
            ->setLabel('Name');
        yield Textfield::new('urlKey')
            ->setHelp('The URL key is used to generate the URL of the page.');
        yield BooleanField::new('publicAvailable')
            ->renderAsSwitch(false);
        yield TextEditorField::new('content_nl')
            ->setLabel('Content')
            ->setTemplatePath('admin/text_editor.html.twig');

        yield FormField::addPanel('English Content')->setIcon('fa fa-language')
            ->collapsible()
            ->renderCollapsed();
        yield Textfield::new('name_en')
        ->setLabel('Name');
        yield TextEditorField::new('content_en')
            ->setLabel('Content')
            ->setTemplatePath('admin/text_editor.html.twig');
    }
}
