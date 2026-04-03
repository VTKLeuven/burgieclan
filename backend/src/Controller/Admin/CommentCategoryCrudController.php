<?php

namespace App\Controller\Admin;

use App\Entity\CommentCategory;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted(User::ROLE_ADMIN)]
class CommentCategoryCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return CommentCategory::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Comment Category')
            ->setEntityLabelInPlural('Comment Categories');
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnDetail();
        yield Textfield::new('name_nl')
            ->setRequired(true)
            ->setLabel('Name (NL)');
        yield TextEditorField::new('description_nl')
            ->setLabel('Description (NL)')
            ->setTemplatePath('admin/text_editor.html.twig');

        yield FormField::addFieldset('English Content')->setIcon('fa fa-language')
            ->collapsible();
        yield Textfield::new('name_en')
            ->setLabel('Name (EN)');
        yield TextEditorField::new('description_en')
            ->setLabel('Description (EN)')
            ->setTemplatePath('admin/text_editor.html.twig');
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add('name_nl')
            ->add('description_nl')
            ->add('name_en')
            ->add('description_en');
    }
}
