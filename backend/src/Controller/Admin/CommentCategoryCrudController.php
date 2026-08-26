<?php

namespace App\Controller\Admin;

use App\Entity\CommentCategory;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
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
        yield ChoiceField::new('type', 'Section type')
            ->setChoices(CommentCategory::TYPES)
            ->setHelp(
                'A rated section shows a 1-5 star axis above its comments, scored over the '
                . 'last three academic years as well as all time. Switching this on needs '
                . 'both scale labels below.'
            );
        yield TextField::new('rating_low_label_nl', 'Scale: 1 means (NL)')
            ->setHelp('Only used by a rated section, e.g. "licht" for Studiebelasting.');
        yield TextField::new('rating_high_label_nl', 'Scale: 5 means (NL)')
            ->setHelp('e.g. "zwaar". Without both ends labelled a score cannot be read.');
        yield TextField::new('name_nl')
            ->setRequired(true)
            ->setLabel('Name (NL)');
        yield TextEditorField::new('description_nl')
            ->setLabel('Description (NL)')
            ->setTemplatePath('admin/text_editor.html.twig');

        yield FormField::addFieldset('English Content')->setIcon('fa fa-language')
            ->collapsible();
        yield TextField::new('name_en')
            ->setLabel('Name (EN)');
        yield TextField::new('rating_low_label_en', 'Scale: 1 means (EN)')
            ->setHelp('Falls back to the Dutch label when empty.');
        yield TextField::new('rating_high_label_en', 'Scale: 5 means (EN)')
            ->setHelp('Falls back to the Dutch label when empty.');
        yield TextEditorField::new('description_en')
            ->setLabel('Description (EN)')
            ->setTemplatePath('admin/text_editor.html.twig');
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add('type')
            ->add('name_nl')
            ->add('description_nl')
            ->add('name_en')
            ->add('description_en');
    }
}
