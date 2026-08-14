<?php

namespace App\Controller\Admin;

use App\Controller\Admin\Filter\CaseInsensitiveTextFilter;
use App\Controller\Admin\Filter\EntityContainsFilter;
use App\Entity\Module;
use App\Entity\Program;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted(User::ROLE_ADMIN)]
class ProgramCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Program::class;
    }

    public function configureActions(Actions $actions): Actions
    {
        $import = Action::new('importOnderwijsaanbod', 'Import from KU Leuven', 'fa fa-download')
            ->linkToRoute('admin_onderwijsaanbod_import')
            ->createAsGlobalAction();

        $viewTree = Action::new('viewTree', 'Structure', 'fa fa-sitemap')
            ->linkToRoute('admin_program_tree', fn (Program $program) => ['id' => $program->getId()]);

        return $actions
            ->add(Crud::PAGE_INDEX, $import)
            ->add(Crud::PAGE_INDEX, $viewTree)
            ->add(Crud::PAGE_DETAIL, $viewTree);
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnDetail();
        yield TextField::new('name');
        yield ChoiceField::new('language')
            ->setLabel('Language')
            ->setChoices(['Dutch' => 'nl', 'English' => 'en'])
            ->setHelp(
                'The language this programme is taught in, and the language its course titles are '
                . 'shown in — regardless of the language a visitor is browsing the site in. '
                . 'Changing it fixes course titles straight away; module names follow on the next '
                . 'Quick Sync. Set by the importer, so a full re-import overwrites it.'
            )
            ->renderAsBadges(['nl' => 'primary', 'en' => 'info']);
        yield TextField::new('kulId', 'KU Leuven id')->onlyOnDetail();
        yield AssociationField::new('modules');
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add(CaseInsensitiveTextFilter::new('name'))
            ->add(EntityContainsFilter::new('modules', Module::class));
    }
}
