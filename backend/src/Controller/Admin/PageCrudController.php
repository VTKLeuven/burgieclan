<?php

namespace App\Controller\Admin;

use App\Entity\Page;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
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
        yield Textfield::new('urlKey')
            ->setHelp('The URL key is used to generate the URL of the page.');
        yield BooleanField::new('publicAvailable')
            ->renderAsSwitch(false);
        yield Textfield::new('name_nl')
            ->setRequired(true)
            ->setLabel('Name (NL)');
        yield TextEditorField::new('content_nl')
            ->setLabel('Content (NL)')
            ->setTemplatePath('admin/text_editor.html.twig');

        yield FormField::addFieldset('English Content')->setIcon('fa fa-language')
            ->collapsible()
            ->renderCollapsed();
        yield Textfield::new('name_en')
            ->setLabel('Name (EN)');
        yield TextEditorField::new('content_en')
            ->setLabel('Content (EN)')
            ->setTemplatePath('admin/text_editor.html.twig');
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add('urlKey')
            ->add('publicAvailable')
            ->add('name_nl')
            ->add('content_nl')
            ->add('name_en')
            ->add('content_en');
    }
}
